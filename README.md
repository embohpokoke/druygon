# 🐉 Druygon — Learning & Gamification Portal for Kids

Web app belajar untuk anak (umur 10–12) yang dikemas sebagai **petualangan Pokémon**: tiap mata
pelajaran = satu "region" dengan peta zona, jawab soal untuk melemahkan Pokémon liar, lempar pokéball,
tangkap, dan kumpulkan. Maskot **Draco** (AI tutor) membantu sebagai hint saat anak kesulitan.

**Live hub:** https://druygon.my.id

## Tiga modul Druygon

| Modul | Fokus | URL produksi | Lokasi source utama |
|---|---|---|---|
| **Study** | Belajar bergamifikasi dengan misi, Pokémon, XP, dan reward | https://study.druygon.my.id | `redesign/app/` + API content/player di `api/` |
| **Draco** | AI chat tutor untuk memahami pelajaran | https://draco.druygon.my.id | `api/public/tutor.html` + `api/src/routes/tutor.js` |
| **Cody** | Belajar coding bertahap dalam English/Bahasa Indonesia | https://cody.druygon.my.id | `modules/drucode/` |

`druygon.my.id` adalah hub yang menghubungkan ketiga modul. Rincian kepemilikan route dan source ada
di [`modules/README.md`](modules/README.md).

## Dokumentasi untuk agent

1. [`AGENTS.md`](AGENTS.md) — aturan kerja, batas aman, dan perintah verifikasi.
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arsitektur live tiga modul dan source of truth.
3. [`modules/README.md`](modules/README.md) — kepemilikan source/route tiap modul.
4. [`modules/drucode/CURRICULUM.md`](modules/drucode/CURRICULUM.md) — kontrak Learn First untuk semua lesson Cody, ditulis untuk beginner usia 10–13 tahun.
5. [`modules/drucode/PRODUCT.md`](modules/drucode/PRODUCT.md) dan [`DESIGN.md`](modules/drucode/DESIGN.md) — kontrak produk/visual Cody.

Cody Visual Blocks World 1 memiliki enam misi lengkap. Setiap sukses menampilkan perayaan, menyimpan progress per player slot, menandai node selesai, dan membuka tepat satu misi berikutnya.

Extended source specification di Mac Erik: `/Users/erikmah/projects/druygon-cody/Spec-Aplikasi-Belajar-Coding-Dru.md`.

Dokumentasi produk, operasi, keputusan, dan handoff lengkap ada di vault Obsidian MacBook:
`~/obsidian/erikmah/projects/druygon/`. Kode di GitHub adalah source of truth implementasi; state live
harus selalu diverifikasi di VPS sebelum perubahan.

## Region di modul Study
| Region | Warna | Status |
|---|---|---|
| Math Plains (matematika) | kuning `#FFCB05` | ✅ aktif |
| Science Wilds (sains) | teal `#00D9B8` | ✅ aktif |
| MATPEL Sekolah (mapel kelas 5) | oranye `#F97316` | ✅ aktif |

MATPEL Sekolah mengikuti materi sekolah Dru (SD Tara Salvia kelas 5, Kurikulum Merdeka): Bahasa Indonesia, IPAS, PPKn, Pendidikan Agama Islam, Bahasa Inggris, dan Seni Budaya non-musik. Semua mapel terbuka sejak awal; journey basic→advanced berlaku di dalam tiap mapel (zone id berformat `matpel_<mapel>_<n>`), bukan lintas mapel. Materi baru ditambah mengikuti program mingguan sekolah — lihat `tools/content-engine/out-matpel/` untuk pola seed-nya.

## Arsitektur (ringkas)
| Layer | Teknologi |
|---|---|
| Frontend (redesign) | React 18 (di `redesign/`), mobile-first; produksi via esbuild bundle |
| Backend | Node.js + Express, systemd `druygon.service` :3847, di belakang nginx |
| **AI Tutor "Draco"** (dipertahankan) | DeepSeek `deepseek-v4-flash` (primary) → Ollama `qwen3.5:cloud` → Claude Haiku fallback + RAG ChromaDB, route `/tutor` + `/parent` |
| Content store | SQLite `api/druygon_content.db` (subject/zone/item/zone_pokemon/content_version) |
| Player store | SQLite `druygon_players.db` (players, caught, progress, `cody_progress`) |
| Backup | `scripts/backup-db.sh` — harian via cron, retensi 14 hari di `/root/backups/druygon` |
| Sprite Pokémon | PokéAPI official artwork (by national dex) |

## Content API
- `GET /api/content/regions` — regions + zones + zone_pokemon (subjek `locked` disembunyikan)
- `GET /api/content/questions?topic=<topic>` — `[{q,expr,opts,a,hint,difficulty}]`
- `GET /api/cody/progress/:slot` — completion Cody per player slot
- `POST /api/cody/progress/:slot/complete` — idempotent; sukses pertama memberi XP+koin ke profil bersama

## Menambah / refresh konten
Pakai **content engine** di [`tools/content-engine/`](tools/content-engine/) — generate (Haiku) + QA
(Sonnet) per zona, lalu seed ke `druygon_content.db`. Lihat `tools/content-engine/README.md`.
Konten dibangun **offline + ter-QA**, tidak pernah di-generate live untuk anak.

## Struktur repo (inti)
```
hub/                       # landing hub tiga modul
redesign/app/              # Study: React Pokémon learning UI
api/                       # shared Express backend + Draco tutor
  public/tutor.html        # Draco chat UI
  src/routes/tutor.js      # Draco API route
modules/drucode/           # Cody: React + TypeScript + Vite
tools/content-engine/      # generator + seeder konten Study/Draco
```

## Deploy
Backend: `systemctl restart druygon.service`. Frontend static dilayani nginx dari web root.
Detail workflow aktif ada di vault `redesign-2026/CURRENT-RUNBOOK.md` dan `github-git-workflow.md`.
