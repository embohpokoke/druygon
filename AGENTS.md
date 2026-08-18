# Druygon Agent Guide

Scope: the entire `embohpokoke/druygon` repository.

## Start here

Read these in order before editing:

1. `README.md`
2. `docs/ARCHITECTURE.md`
3. `modules/README.md`
4. The module-specific source and docs you will change

Before adding or changing a Cody lesson, also read `modules/drucode/CURRICULUM.md`. Learn First is a required lesson contract for beginner learners ages 10–13 across Visual Blocks, Python, and Web.

On Erik's Mac, the original extended build specification is `/Users/erikmah/projects/druygon-cody/Spec-Aplikasi-Belajar-Coding-Dru.md`. Repository `CURRICULUM.md`, `PRODUCT.md`, and deployed code remain the self-contained code-adjacent contract when that local file is unavailable.

Cody completion is also part of the lesson contract: success must persist, celebrate, mark the map node complete, unlock exactly the next mission, and expose one clear Continue action. Preserve the contiguous per-slot progress rule; never unlock from a sparse stored list.

The matching product/operations knowledge base is `~/obsidian/erikmah/projects/druygon/` on Erik's MacBook Pro. Its canonical current-state note is `02. DRUYGON-SUITE-CANONICAL.md`.

## Product model

Druygon is one suite with exactly three modules:

- Study: Pokémon-gamified learning at `study.druygon.my.id`
- Draco: AI chat learning at `draco.druygon.my.id`
- Cody: coding learning at `cody.druygon.my.id`

`druygon.my.id` is the shared hub. Preserve cross-module navigation.

## Source ownership

- Study UI: `redesign/app/`
- Shared Express backend and player/content APIs: `api/`
- Draco UI/API/runtime: `api/public/tutor.html`, `api/src/routes/tutor.js`, and tutor files under `api/`
- Cody: `modules/drucode/`
- Shared hub: `hub/`

Do not move stable Study or Draco code merely to make folder names symmetrical. `modules/README.md` is the ownership map.

## Safety boundaries

- Never execute learner code on the public VPS. No `eval`, `Function`, or `child_process` for user code.
- General-purpose code execution goes through `/api/sandbox` → `sandboxd` on the home Linux box (elitebook, Tailscale, token-authenticated; `tools/sandboxd/`). Mission-specific browser checkers may parse a tiny fixed command grammar, but must never use `eval`, `Function`, subprocesses, or arbitrary JavaScript/Python execution.
- Preserve `/api/*`, `/parent`, `/tutor`, `/manifest.json`, `/sw.js`, and visible blank-screen recovery.
- Treat `/opt/druygon` as a mixed/dirty worktree. Inspect status first and stage explicit paths only. Never use `git add -A`.
- Do not commit secrets, databases, `.env` files, certificate material, or live nginx configuration.
- `redesign/app/bundle.js` is generated. Edit JSX/CSS sources, run `bash redesign/build.sh`, and commit the rebuilt bundle plus cache-busted HTML.

## Checks

Study/Draco:

```bash
cd /opt/druygon
bash redesign/build.sh
git diff --check
DRUYGON_URL=https://study.druygon.my.id DRUYGON_BROWSERS=chromium bash scripts/release-check.sh
```

Cody:

```bash
cd /opt/druygon/modules/drucode
npm ci
npm run check
npm run build
```

For Cody journey changes, run `python3 modules/drucode/scripts/qa-journey.py` on the Mac. It gates all six missions in Chromium and WebKit at 1440px and 390px, including EN/ID switching, Save pointing to Run, celebration, direct Continue, map node states, and reload persistence.

Run a real WebKit/Safari check from the Mac for frontend releases. VPS Chromium alone is not the complete browser gate.

## Documentation close-out

When architecture, routes, module ownership, deployment, or open risks change, update both:

- GitHub: `README.md`, `docs/ARCHITECTURE.md`, `modules/README.md`, and this guide as applicable.
- Obsidian: `projects/druygon/02. DRUYGON-SUITE-CANONICAL.md`, `README.md`, `redesign-2026/CURRENT-RUNBOOK.md`, `redesign-2026/AGENT-LOG.md`, and `wiki/projects/druygon.md`.

Code truth lives in GitHub. Product decisions and operational history live in Obsidian. Runtime truth must be verified on the VPS.
