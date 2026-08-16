# Druygon Suite Architecture

Last verified: 2026-08-16.

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
- Study content/player state: SQLite
- Draco memory: PostgreSQL
- Draco retrieval: ChromaDB + Ollama embeddings
- Draco model: Ollama `qwen3.5:cloud`, with Claude Haiku fallback

## Shared contracts

- Player slots are 1 through 4. Cody reads the active player through `/api/player/:slot`.
- Study remains server-authoritative for rewards and player state.
- Legacy `/tutor` and `/parent` routes remain supported even though Draco has a dedicated hostname.
- Each module links to the hub and the other learning modes.
- English is Cody's default UI language. EN/ID preference is stored client-side without rewriting the learner's draft.

## Code execution boundary

Cody currently ships the learning-map/workspace frontend, draft persistence, staged hints, and an offline runner state. Arbitrary learner code is not executed by the browser or public VPS.

Before enabling Run, implement an isolated sandbox outside the VPS with no network, read-only filesystem, strict CPU/memory/time/output/process limits, private connectivity, and service-to-service authentication. The frontend must degrade safely when that sandbox is unavailable.

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

1. `api/druygon_content.db` is not tracked in Git and needs an external backup procedure.
2. Cody code execution remains intentionally offline until the sandbox boundary exists.
3. Decide whether Cody's persistent backend should adapt to the shared Express/SQLite runtime or use the specification's isolated Hono/tRPC/Drizzle/MySQL service. Do not silently mix both designs.
4. Safari/WebKit remains a required release gate for frontend changes.
