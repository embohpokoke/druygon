# 🐉 Druygon — Learning & Gamification Portal for Kids

Web app belajar untuk anak (umur 10–12) yang dikemas sebagai **petualangan Pokémon**: tiap mata
pelajaran = satu "region" dengan peta zona, jawab soal untuk melemahkan Pokémon liar, lempar pokéball,
tangkap, dan kumpulkan. Maskot **Draco** (AI tutor) membantu sebagai hint saat anak kesulitan.

**Live:** https://druygon.my.id · **Preview redesign:** https://druygon.my.id/redesign/

> **Status (Jun 2026): redesign besar sedang berjalan.** Seluruh app lama diganti dengan UI baru
> berbasis React **kecuali AI tutor Draco** yang dipertahankan. Konten soal kini **dinamis** (dari DB,
> bukan hardcoded). Dokumentasi lengkap arah & rencana ada di Obsidian vault
> (`erik-project/projects/druygon/00. DRUYGON-REDESIGN-2026.md`).

## Tiga region
| Region | Warna | Status |
|---|---|---|
| Kurikulum sekolah | kuning `#FFCB05` | 🔒 di-lock dulu (zona ada di DB, belum di-expose) |
| Sains | teal `#00D9B8` | ✅ aktif |
| Computer Science (pemula) | ungu `#8B5CF6` | ✅ aktif |

## Arsitektur (ringkas)
| Layer | Teknologi |
|---|---|
| Frontend (redesign) | React 18 (di `redesign/`), mobile-first; produksi via esbuild bundle |
| Backend | Node.js + Express, systemd `druygon.service` :3847, di belakang nginx |
| **AI Tutor "Draco"** (dipertahankan) | Anthropic Haiku + RAG ChromaDB (`druygon_db`), route `/tutor` + `/parent` |
| Content store | SQLite `api/druygon_content.db` (subject/zone/item/zone_pokemon/content_version) |
| Player store | SQLite `druygon_players.db` |
| Sprite Pokémon | PokéAPI official artwork (by national dex) |

## Content API
- `GET /api/content/regions` — regions + zones + zone_pokemon (subjek `locked` disembunyikan)
- `GET /api/content/questions?topic=<topic>` — `[{q,expr,opts,a,hint,difficulty}]`

## Menambah / refresh konten
Pakai **content engine** di [`tools/content-engine/`](tools/content-engine/) — generate (Haiku) + QA
(Sonnet) per zona, lalu seed ke `druygon_content.db`. Lihat `tools/content-engine/README.md`.
Konten dibangun **offline + ter-QA**, tidak pernah di-generate live untuk anak.

## Struktur repo (inti)
```
redesign/            # UI baru (React) — eventually jadi root
api/                 # backend Express (termasuk tutor Draco — JANGAN diubah saat redesign)
  src/routes/content.js   # content API
tools/content-engine/     # generator + seeder konten
```

## Deploy
Backend: `systemctl restart druygon.service`. Frontend static dilayani nginx dari web root.
(Detail deploy/git workflow ada di vault `ops/deploy-workflow.md`.)
