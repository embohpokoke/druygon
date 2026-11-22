# BUILD LOG v2 — Portal Dru (shiny, legendary, trainer rank)

Append-only. Tulis entri baru di atas blok "Entri" terakhir. Tujuan: kalau laptop ditutup / sesi putus, sesi berikutnya bisa lanjut tanpa menebak.

**Mulai:** 22 Nov 2026 18:30 WIB
**Target:** build & push ke `github.com/embohpokoke/druygon` (master), live di study.druygon.my.id
**Spec:** `docs/SPEC-v2-portal-shiny-legendary.md`

## Cara lanjut (untuk sesi berikutnya)

1. Baca file ini + spec v2.
2. Cek staging lokal: `~/projects/druygon-vps/` (salinan source VPS yang diedit).
3. Cek status VPS: `ssh vps-host 'cd /opt/druygon && git status --short | head -30; systemctl is-active druygon'`.
4. Cek langkah yang belum selesai di bagian "Status" di bawah.
5. Kalau staging lebih baru: `rsync -az ~/projects/druygon-vps/ vps-host:/opt/druygon/` (HATI-HATI: hanya path yang ada di staging).
6. Build: `ssh vps-host 'cd /opt/druygon && bash redesign/build.sh'`, restart `systemctl restart druygon`, uji.
7. Commit scoped + push (lihat bagian Git).

Jangan pernah menulis PIN/kredensial ke file ini.

## Status (update tiap langkah)

- [x] Recon vault + runtime (vault `/root/erikmah-vault/projects/druygon`, kode `/opt/druygon`, DB, API).
- [x] Spec v2 + log dibuat di MBP (`docs/`).
- [x] Staging lokal `~/projects/druygon-vps/` (redesign/app, index.html, api routes, tools/content-engine).
- [ ] Fondasi data + CSS/SFX.
- [ ] Backend player.js (shiny, rank, claim).
- [ ] Screens1 (Home/Map/Catch/Celebration).
- [ ] Screens2 (Collection/Profile) + index-src.
- [ ] Content seed legendary + content route.
- [ ] Build + QA (Playwright + curl) di VPS.
- [ ] Commit + push GitHub.
- [ ] Update vault docs + AGENT-LOG.
- [ ] Backup DB sebelum deploy.

## Fakta runtime yang sudah diverifikasi (22 Nov 2026)

- VPS Hostinger `72.60.78.181`, tree hidup `/opt/druygon`, HEAD `38f8cff` (master), `druygon.service` active.
- Study `https://study.druygon.my.id/` 200. App React 18 dari `redesign/app/bundle.js` (esbuild, `bundle=false` concat via `redesign/build.sh`). Entry HTML root `/opt/druygon/index.html` (bukan `redesign/app/index.html`).
- `/api/player/*` wajib login Dru (401). `pinSet:true`. Test bisa pakai sesi parent (`/api/parent/auth/pin`, PIN bootstrap dari env `/root/.wallet/druygon-api.env`; jangan disalin ke log).
- Player DB `/opt/druygon/druygon_players.db`; `caught_v2` UNIQUE(slot,dex). Content DB `/opt/druygon/api/druygon_content.db`.
- Dru sekarang: level 7, 2185 XP, 200 koin, 24 caught, team 25/54/60, pokeball 0 (greatball 1).
- Zona: curriculum 6, science 5, matpel 7. Legendary hanya ada di science_2..5.
- Playwright + chromium tersedia di `/opt/druygon/node_modules` (bisa screenshot QA).
- Git remote VPS: `git@github.com-druygon:embohpokoke/druygon.git`, `git ls-remote` sukses.
- VPS worktree kotor (AGENTS.md, README, tutor, dll) — jangan `git add -A`; commit path eksplisit.

## Git (rencana)

File yang akan disentuh build ini (stage eksplisit):
```
redesign/app/app-screens1.jsx
redesign/app/app-screens2.jsx
redesign/app/components.jsx
redesign/app/data.jsx
redesign/app/index-src.jsx
redesign/app/app.css
redesign/app/bundle.js
index.html
api/src/routes/player.js
api/src/routes/content.js
tools/content-engine/seed-legendary-gates.mjs
docs/SPEC-v2-portal-shiny-legendary.md
docs/BUILD-LOG-v2.md
```
Push ke `origin master` setelah build & QA. Vault di-update terpisah (bukan di repo).

## Entri

### 22 Nov 2026 18:35 WIB — recon selesai, spec v2 ditulis

- Pelajari vault canonical, GAME-RULES, spec v1, redesign-plan lokal.
- Keputusan desain: shiny di-roll klien saat encounter + dipersist server; legendary gate per region (Mewtwo/Rayquaza/Ho-Oh) butuh semua zona clear + Ultra/Master Ball; rank 7 tingkat dihitung server.
- Staging dibuat; agent backend + fondasi mulai.

