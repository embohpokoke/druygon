# sandboxd — sandboxed code execution for Druygon

The VPS **never executes learner code**. `POST /api/sandbox/run` on the VPS
(`api/src/routes/sandbox.js`) forwards snippets over Tailscale to `sandboxd`
on the home Linux box (elitebook, `100.83.7.10:8570`).

## Isolation layers

1. **bubblewrap** (preferred): no network, read-only system dirs, tmpfs /tmp.
   Requires unprivileged user namespaces. Ubuntu 24.04+ blocks these via
   `kernel.apparmor_restrict_unprivileged_userns=1` — to enable full bwrap
   isolation, on the sandbox box (one-time, sudo):
   `echo 'kernel.apparmor_restrict_unprivileged_userns=0' | sudo tee /etc/sysctl.d/60-userns.conf && sudo sysctl --system`
   then `systemctl --user restart sandboxd`. Health will report
   `"isolation": "bwrap"`.
2. **rlimits + audit hooks** (current fallback): CPU/mem/file-size/process
   rlimits plus `runner.py` Python audit hooks blocking network, subprocess,
   fork/exec and ctypes. Service itself runs with `PrivateTmp=true`.

## Install (on the sandbox box)

```sh
mkdir -p ~/sandboxd ~/.config/systemd/user
cp sandboxd.py runner.py ~/sandboxd/          # this directory
cp sandboxd.service ~/.config/systemd/user/
openssl rand -hex 24 > ~/sandboxd/token && chmod 600 ~/sandboxd/token
systemctl --user daemon-reload
systemctl --user enable --now sandboxd        # needs lingering enabled
```

VPS side: put the same token in `/root/.wallet/druygon-api.env` as
`SANDBOX_TOKEN` (and optionally `SANDBOX_URL`), restart `druygon.service`.

## API

```
GET  /health                     -> {"ok": true, "isolation": "...", "languages": [...]}
POST /run  Authorization: Bearer <token>
     {"language": "python3", "code": "print(1+1)", "timeout": 5}
     -> {"ok", "exit_code", "timed_out", "stdout", "stderr", "elapsed_s", "isolation"}
```

Limits: 32KB code, 10s max wall clock, 256MB memory, 64KB output cap.
Languages: `python3` (extend `LANGUAGES` in `sandboxd.py`).

## Verify

```sh
curl -s https://draco.druygon.my.id/api/sandbox/health
curl -s -X POST https://cody.druygon.my.id/api/sandbox/run \
  -H 'Content-Type: application/json' -d '{"code":"print(6*7)"}'
```
