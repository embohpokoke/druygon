# Druygon Content Engine

Add or refresh subject content (questions + tutor knowledge) **without** the Claude Code Workflow —
runnable by the opencode VPS agent or by hand. Supports Anthropic API or the VPS Ollama endpoint.

> Architecture: `08-content-engine.md` in the Obsidian vault / handoff. Two layers — gameplay content
> (this DB, deterministic + QA'd) and tutor knowledge (ChromaDB). Questions are **built offline + QA'd**,
> never generated live for a child.

## Pipeline
```
subjects.json  ──generate.mjs──▶  out/{regions,questions,knowledge.*}  ──seed.mjs──▶  api/druygon_content.db
                (Haiku gen → Sonnet QA)                                                 + ChromaDB (manual step)
```

## How to add a new subject
1. Copy `subjects.example.json` → `subjects.json`. Add your subject block:
   - `id` = region id (e.g. `math`), `name`, `accent` (hex), `status` (`active`, or `locked` to keep it
     out of the API).
   - For each `zone`: `zone` (order), `name`, `topic` (unique key), `minLevel`, `diff`, `ageBand`,
     `theme` (what to teach), and `mons[]` = Pokémon catchable there (pick dex from
     `redesign-plan/03b-roster.csv`). **Gameplay/Pokémon mapping is deterministic — you choose it here.**
2. Generate (questions + knowledge), QA'd:
   ```bash
   cd /opt/druygon/tools/content-engine
   node generate.mjs subjects.json --n 8
   ```
   Output lands in `./out/` (`regions.json`, `questions.json`, `knowledge.<region>.jsonl`).
   Review `out/questions.json` before seeding (it's kids' content — eyeball it).

   To generate and QA through Ollama using a cloud model:
   ```bash
   CONTENT_LLM_PROVIDER=ollama \
   GEN_MODEL=qwen3.5:cloud QA_MODEL=qwen3.5:cloud \
   node generate.mjs subjects.json --n 8
   ```
3. Seed the gameplay DB:
   ```bash
   node seed.mjs out/
   ```
   Upserts subject/zone/item/zone_pokemon into `api/druygon_content.db` and stamps a `content_version`.
   Idempotent per subject (re-running replaces that subject's zones/items).
4. Seed tutor knowledge into ChromaDB: load each `out/knowledge.<region>.jsonl` into collection
   `druygon_<region>` using the project's existing curriculum-seeder pattern (`api/scripts/`).
5. Verify:
   ```bash
   curl -s https://druygon.my.id/api/content/regions | head
   curl -s "https://druygon.my.id/api/content/questions?topic=<your_topic>" | head
   ```
   Restart backend only if it caches: `sudo systemctl restart druygon.service`.

## Requirements
- Node 18+ (global `fetch`) and the `sqlite3` CLI on PATH. **No native node modules** — `generate.mjs`
  uses `fetch`, `seed.mjs` shells out to `sqlite3` (so any Node version works, unlike the app's
  `better-sqlite3` which is pinned to the service's Node).
- Anthropic provider requires `ANTHROPIC_API_KEY`. Ollama provider requires a reachable Ollama endpoint
  and the requested model; override its default URL with `OLLAMA_BASE_URL`.

## Models (cheap by default)
- Generate: `claude-haiku-4-5` · QA: `claude-sonnet-4-6`. Override with env `GEN_MODEL` / `QA_MODEL`.
- Set `CONTENT_LLM_PROVIDER=ollama` to use Ollama. Its default generate and QA model is
  `qwen3.5:cloud`; keep the separate generate and QA passes even when both use the same model.

## Rebuild batch-1 content (science + compsci) from the committed snapshot
```bash
node seed.mjs seed-batch1/    # rebuilds the science+compsci zones/items in druygon_content.db
```

## Notes
- `out/` and `*.db` are git-ignored. Commit your `subjects.json` (the recipe) so content is reproducible.
- To **unlock the school curriculum** later: add a `curriculum` subject block with `status: "active"`
  (its zones already exist in the DB as `locked`) and run generate+seed.
- The tutor (Draco) is independent — content seeding never touches it.
