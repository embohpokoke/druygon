"""sandboxd runner — executes user code with a Python audit-hook guard.

Used as the fallback isolation layer when bubblewrap/user namespaces are
unavailable (Ubuntu's apparmor_restrict_unprivileged_userns=1).

Blocks: network (socket connect/bind/getaddrinfo), subprocess/os.system,
fork/exec, ctypes. File writes are still capped by RLIMIT_FSIZE and the
service runs with PrivateTmp=true.

Usage: python3 -I runner.py <user_code_file>
"""
import sys

BLOCKED_PREFIXES = (
    "socket.connect", "socket.bind", "socket.listen", "socket.getaddrinfo",
    "socket.sendmsg", "subprocess.Popen", "os.system", "os.posix_spawn",
    "os.fork", "os.forkpty", "os.exec", "os.kill", "os.killpg",
    "pty.fork", "os.chmod", "os.chown", "os.mount",
)
BLOCKED_IMPORTS = {"ctypes", "_ctypes", "mmap"}


def audit_hook(event, args):
    if event.startswith(BLOCKED_PREFIXES):
        raise PermissionError(f"sandbox: operation blocked: {event}")
    if event == "import":
        name = (args[0] or "").split(".")[0]
        if name in BLOCKED_IMPORTS:
            raise ImportError(f"sandbox: import blocked: {name}")


def main():
    sys.addaudithook(audit_hook)
    with open(sys.argv[1], "rb") as f:
        source = f.read()
    namespace = {"__name__": "__main__", "__file__": sys.argv[1]}
    exec(compile(source, sys.argv[1], "exec"), namespace)


if __name__ == "__main__":
    main()
