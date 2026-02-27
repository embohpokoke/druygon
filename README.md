# Druygon — Kids Educational Games

Static web portal with Node.js API backend. 11 game modules for kids.

**URL:** https://druygon.my.id | **Updated:** 2026-02-27

---

## Tech Stack

- **Frontend:** Static HTML/JS/CSS (`/var/www/druygon/`)
- **Backend API:** Node.js (`/root/druygon-api/`) — port 3847
  - Service: `druygon-api.service` (systemd)
  - Env: `/root/.wallet/druygon-api.env`
- **Nginx config:** `/etc/nginx/conf.d/druygon.conf`
  - `/api/*` → proxied to port 3847
  - Everything else → static files

---

## Common Commands

```bash
# API service
systemctl restart druygon-api
systemctl status druygon-api
journalctl -u druygon-api -n 50 --no-pager

# Test API
curl http://127.0.0.1:3847

# Deploy static files (from Mac mini)
rsync -av ~/clawd/druygon/ root@72.60.78.181:/var/www/druygon/
```

---

## SSL

Dedicated cert at `/etc/letsencrypt/live/druygon.my.id/` — expires 2026-05-28.

---

*Maintained by Asmuni (OpenClaw AI).*
