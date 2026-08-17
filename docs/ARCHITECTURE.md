# Druygon Suite Architecture

Last verified: 2026-08-17.

## System map

| Surface | Purpose | Production | Source |
|---|---|---|---|
| Hub | Entry point and cross-module navigation | `druygon.my.id` | `hub/` |
| Study | Pokémon-gamified learning | `study.druygon.my.id` | `redesign/app/` + shared APIs in `api/` |
| Draco | AI chat learning | `draco.druygon.my.id` | `api/public/tutor.html` + tutor API/runtime in `api/` |
| Cody | Coding learning | `cody.druygon.my.id` | `modules/drucode/` |

All public hostnames currently resolve to the same Hostinger VPS. Nginx terminates TLS and routes static files or API traffic. The certificate and nginx source are managed on the VPS, not in this repository.

## Runtime

- VPS repository: `/opt/druygon`
- Shared backend: Node.js 22 + Express, `druygon.service`, `127.0.0.1:3847`
- Public proxy: nginx
- Study frontend: React 18, JSX sources compiled with esbuild to an ES2019 bundle
- Cody frontend: React 19 + TypeScript + Vite + Tailwind 4, built to `modules/drucode/dist/`
- Study content/player state: SQLite (`api/druygon_content.db`, `druygon_players.db`)
- Draco memory: PostgreSQL
- Draco retrieval: ChromaDB + Ollama embeddings
- Draco model: DeepSeek `deepseek-v4-flash` (primary) → Ollama `qwen3.5:cloud` → Claude Haiku fallback (`TUTOR_PROVIDER` selects the chain)
- Backup: `scripts/backup-db.sh` daily cron, 14-day retention under `/root/backups/druygon`

## Shared contracts

- Player slots are 1 through 5 (slot 5 is reserved for QA). Cody reads the active player through `/api/player/:slot`.
- Study remains server-authoritative for rewards and player state.
- Cody lesson completion is server-side in `cody_progress` via `/api/cody/progress/:slot` (idempotent, awards shared-profile XP on first completion). The frontend merges it with the localStorage copy and still works fully offline.
- Study's MATPEL Sekolah region groups zones per school subject (`matpel_<mapel>_<n>`): every subject is open from the start and the basic→advanced journey applies within a subject, never across subjects.
- Legacy `/tutor` and `/parent` routes remain supported even though Draco has a dedicated hostname.
- Each module links to the hub and the other learning modes.
- English is Cody's default UI language. EN/ID preference is stored client-side without rewriting the learner's draft.
- Every Cody lesson in Visual Blocks, Python, and Web must satisfy `modules/drucode/CURRICULUM.md`: a beginner-friendly Learn First section for ages 10–13 must precede the challenge.
- Visual Blocks World 1 derives completed/current/locked map states from the contiguous progress key `drucode-progress-${slot}-visual-blocks-v1` merged with server progress. First success persists completion, shows an inline celebration, and unlocks exactly the next mission. `?fresh=1` starts a clean session for QA.

## Code execution boundary

Cody ships the learning-map/workspace frontend, per-lesson draft persistence, staged hints, sequential progress, and six fixed Visual Blocks mission validators. They recognize only the small command vocabulary taught in the journey (`move`, `turnRight`, `repeat`, `ifStar`, and `collect`) and compare normalized text with a mission target. They do not evaluate JavaScript or Python. Arbitrary learner code is not executed by the browser or public VPS.

Before enabling general-purpose Python or JavaScript execution, implement an isolated sandbox outside the VPS with no network, read-only filesystem, strict CPU/memory/time/output/process limits, private connectivity, and service-to-service authentication. The frontend must degrade safely when that sandbox is unavailable.

## Source of truth

| Question | Canonical source |
|---|---|
| What code is deployed? | This GitHub repository and the exact deployed commit/branch |
| What is live right now? | Read-only checks on the VPS and public HTTPS endpoints |
| Why was an architecture/product decision made? | Obsidian `projects/druygon/02. DRUYGON-SUITE-CANONICAL.md` and linked notes |
| What did an agent change? | Git history, PR description, and Obsidian `redesign-2026/AGENT-LOG.md` |
| How should an agent work? | Repository `AGENTS.md` and Obsidian `redesign-2026/CURRENT-RUNBOOK.md` |

When these disagree, verify production, then update both GitHub and Obsidian in the same change.

## Current risks and pending decisions

1. Cody's fixed mission checker is active, but arbitrary code execution remains intentionally offline until the sandbox boundary exists.
2. Safari/WebKit remains a required release gate for frontend changes.
3. Draco's RAG collections predate the MATPEL Sekolah region; seed `druygon_matpel` knowledge when weekly content grows.

Resolved 2026-08-17: content/player DBs have daily backups with a tested restore (`scripts/backup-db.sh`), and Cody persistence uses the shared Express/SQLite runtime (decided against a separate Hono/tRPC/MySQL service).
