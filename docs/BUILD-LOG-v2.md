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
- [x] Fondasi data + CSS/SFX.
- [x] Backend player.js (shiny, rank, claim).
- [x] Screens1 (Home/Map/Catch/Celebration).
- [x] Screens2 (Collection/Profile) + index-src.
- [x] Content seed legendary + content route.
- [x] Build + QA (Playwright + curl) di VPS.
- [x] Commit + push GitHub (`0bc885a`, master).
- [x] Update vault docs + AGENT-LOG + wiki.
- [x] Backup DB sebelum deploy (`/root/backups/druygon-v2/`).

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

### 22 Nov 2026 19:10 WIB — v2 live, sudah di-push

- Deploy: DB backup dulu → rsync source → seed legendary gates → `bash redesign/build.sh` → `systemctl restart druygon` → health 200.
- Bundle `997be28c`. Commit `0bc885a` di-push ke `master` (`38f8cff..0bc885a`).
- API test (slot 5, dibersihkan lagi): catch shiny persist, legendary flag, rank claim idempoten, 409 tier belum capai, 400 `shiny` bukan boolean.
- Playwright 390×844 dengan sesi parent: home, map science, catch normal, catch shiny (Math.random dipaksa), catch legendary Mewtwo, collection, profile — **0 console/page error**. Reduce-motion shot diambil.
- Bug yang ditemukan & diperbaiki saat QA: (1) Catch dipanggil saat konten belum siap → React #310 (hooks order) → dipisah wrapper `Catch` + `CatchScreen`; (2) chip filter Collection meluber → `flex-wrap`; (3) judul header "…" karena App tidak subscribe `onContentReady` → tick state.
- Screenshot bukti: `~/projects/druygon-vps/shots/` (home, map-science, catch-normal, catch-shiny, catch-legendary, collection, profile, home-reduced).
- Catatan: koneksi SSH dari MBP ke VPS sempat stall beberapa kali saat screenshot; pekerjaan inti sudah selesai sebelum itu.

#### Angka nyata Dru saat build

Level 7 · 286 poin (Youngster, 14 poin lagi ke Ace Trainer) · 24 caught · 1 legendary (Volcarona #637) · 0 shiny · 200 koin · 0 Poké Ball / 1 Great Ball. Rank Rookie + Youngster belum diklaim → bisa langsung klaim 2 Great Ball di Profile.

#### Lanjutan yang disarankan (belum dikerjakan)

1. Perbaiki `Progress by world` di Profile agar memakai turunan `caught_v2` (bukan `zone_progress`) — sekarang bisa tampak 0% walau zona sudah clear.
2. Spec v1 Fase 2: hentikan hadiah koin/XP per soal (sekarang +5/+5) dan ganti pujian informatif + stempel pekan (belum).
3. Legendary gate untuk Cody/region baru kalau ada; shiny dex per region (saat ini koleksi shiny lintas region).
4. Uji manual iPhone Safari oleh Erik (audio unlock, haptic-less animasi, layout) — gate WebKit dari Mac belum dijalankan build ini.
5. Setelah Dru main, cek `rank_awards` + `caught_shiny` mengisi; kalau reward rank dobel, lihat PK `(slot, rank_id)`.

### 22 Nov 2026 18:35 WIB — recon selesai, spec v2 ditulis

- Pelajari vault canonical, GAME-RULES, spec v1, redesign-plan lokal.
- Keputusan desain: shiny di-roll klien saat encounter + dipersist server; legendary gate per region (Mewtwo/Rayquaza/Ho-Oh) butuh semua zona clear + Ultra/Master Ball; rank 7 tingkat dihitung server.
- Staging dibuat; agent backend + fondasi mulai.

