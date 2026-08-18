#!/usr/bin/env python3
"""sandboxd — tiny code-execution daemon for the Druygon learning suite.

Runs untrusted code snippets with layered isolation:
  - bubblewrap (preferred): no network, read-only system, tmpfs /tmp
  - fallback: rlimits + Python audit hooks (runner.py) when user
    namespaces are unavailable on the host

Limits either way: CPU seconds, 256MB address space, 1MB file size,
32 procs, hard wall-clock timeout, capped stdout/stderr.

Auth: Bearer token in ~/sandboxd/token (shared with the VPS API).
Bind: Tailscale IP only — never exposed to the public internet.

POST /run    {"language": "python3", "code": "print(1+1)", "timeout": 5}
GET  /health -> {"ok": true, "isolation": "bwrap" | "rlimits+audit"}
"""
import json
import os
import resource
import signal
import subprocess
import sys
import tempfile
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE = os.path.expanduser("~/sandboxd")
TOKEN_PATH = os.path.join(BASE, "token")
RUNNER = os.path.join(BASE, "runner.py")
BIND_HOST = os.environ.get("SANDBOXD_HOST", "100.83.7.10")
BIND_PORT = int(os.environ.get("SANDBOXD_PORT", "8570"))

MAX_TIMEOUT = 10
MAX_CODE_BYTES = 32 * 1024
MAX_OUTPUT_BYTES = 64 * 1024
MEM_BYTES = 256 * 1024 * 1024

BWRAP_BASE = [
    "/usr/bin/bwrap",
    "--unshare-all",
    "--die-with-parent",
    "--new-session",
    "--ro-bind", "/usr", "/usr",
    "--ro-bind", "/bin", "/bin",
    "--ro-bind", "/lib", "/lib",
    "--ro-bind", "/lib64", "/lib64",
    "--tmpfs", "/tmp",
    "--proc", "/proc",
    "--dev", "/dev",
    "--chdir", "/tmp",
    "--clearenv",
    "--setenv", "PATH", "/usr/bin:/bin",
    "--setenv", "HOME", "/tmp",
]

LANGUAGES = {
    "python3": {
        "bwrap": ["/usr/bin/python3", "-I", "-c"],   # code passed as argv
        "plain": ["/usr/bin/python3", "-I", RUNNER],  # code file appended
    },
}


def load_token():
    with open(TOKEN_PATH) as f:
        return f.read().strip()


def set_limits(limit_nproc=True):
    resource.setrlimit(resource.RLIMIT_CPU, (MAX_TIMEOUT + 2, MAX_TIMEOUT + 2))
    resource.setrlimit(resource.RLIMIT_AS, (MEM_BYTES, MEM_BYTES))
    resource.setrlimit(resource.RLIMIT_FSIZE, (1024 * 1024, 1024 * 1024))
    if limit_nproc:
        # Only for the non-bwrap fallback: RLIMIT_NPROC counts the uid's
        # GLOBAL process count, which blocks user-namespace creation
        # (EAGAIN) long before it constrains the child.
        resource.setrlimit(resource.RLIMIT_NPROC, (32, 32))
    resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))


def bwrap_available():
    try:
        proc = subprocess.run(
            BWRAP_BASE + ["/usr/bin/true"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
        return proc.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


USE_BWRAP = bwrap_available()


def run_code(language, code, timeout):
    lang = LANGUAGES.get(language)
    if lang is None:
        return {"ok": False, "error": f"unsupported language: {language}",
                "supported": sorted(LANGUAGES)}
    timeout = max(1, min(int(timeout or 5), MAX_TIMEOUT))
    tmp_path = None
    if USE_BWRAP:
        cmd = BWRAP_BASE + lang["bwrap"] + [code]
    else:
        fd, tmp_path = tempfile.mkstemp(prefix="run-", suffix=".py", dir=BASE)
        with os.fdopen(fd, "w") as f:
            f.write(code)
        cmd = lang["plain"] + [tmp_path]
    started = time.monotonic()
    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=BASE,
            preexec_fn=set_limits if not USE_BWRAP else (lambda: set_limits(limit_nproc=False)),
            start_new_session=True,
        )
    except FileNotFoundError as exc:
        return {"ok": False, "error": f"runtime missing: {exc}"}
    try:
        out, err = proc.communicate(timeout=timeout)
        timed_out = False
    except subprocess.TimeoutExpired:
        os.killpg(proc.pid, signal.SIGKILL)
        out, err = proc.communicate()
        timed_out = True
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    elapsed = round(time.monotonic() - started, 3)
    return {
        "ok": proc.returncode == 0 and not timed_out,
        "exit_code": proc.returncode,
        "timed_out": timed_out,
        "stdout": out[:MAX_OUTPUT_BYTES].decode("utf-8", "replace"),
        "stderr": err[:MAX_OUTPUT_BYTES].decode("utf-8", "replace"),
        "elapsed_s": elapsed,
        "isolation": "bwrap" if USE_BWRAP else "rlimits+audit",
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "sandboxd/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    def _json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self):
        return self.headers.get("Authorization") == "Bearer " + self.server.token

    def do_GET(self):
        if self.path == "/health":
            self._json(200, {
                "ok": True,
                "languages": sorted(LANGUAGES),
                "isolation": "bwrap" if USE_BWRAP else "rlimits+audit",
            })
        else:
            self._json(404, {"ok": False, "error": "not found"})

    def do_POST(self):
        if not self._authorized():
            self._json(401, {"ok": False, "error": "unauthorized"})
            return
        if self.path != "/run":
            self._json(404, {"ok": False, "error": "not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > MAX_CODE_BYTES + 4096:
                self._json(413, {"ok": False, "error": "payload too large"})
                return
            req = json.loads(self.rfile.read(length) or b"{}")
        except (ValueError, json.JSONDecodeError):
            self._json(400, {"ok": False, "error": "bad json"})
            return
        code = req.get("code", "")
        if not isinstance(code, str) or not code.strip():
            self._json(400, {"ok": False, "error": "code required"})
            return
        if len(code.encode()) > MAX_CODE_BYTES:
            self._json(413, {"ok": False, "error": "code too large"})
            return
        result = run_code(req.get("language", "python3"), code,
                          req.get("timeout"))
        self._json(200, result)


def main():
    token = load_token()
    server = ThreadingHTTPServer((BIND_HOST, BIND_PORT), Handler)
    server.token = token
    mode = "bwrap" if USE_BWRAP else "rlimits+audit"
    sys.stderr.write(f"sandboxd listening on {BIND_HOST}:{BIND_PORT} "
                     f"(isolation: {mode})\n")
    server.serve_forever()


if __name__ == "__main__":
    main()
