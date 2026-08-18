# Druygon Modules

Druygon is one learning suite with three linked modules. The production hostnames are routed by nginx, while the source remains in this repository.

| Module | Product role | Production hostname | Source ownership |
|---|---|---|---|
| Study | Pokémon-gamified learning | `study.druygon.my.id` | `redesign/app/`, shared content and player routes under `api/` |
| Draco | AI chat learning | `draco.druygon.my.id` | `api/public/tutor.html`, `api/src/routes/tutor.js`, tutor prompts/runtime under `api/` |
| Cody | Coding learning | `cody.druygon.my.id` | `modules/drucode/` |

## Shared boundaries

- `druygon.my.id` serves `hub/` and links all three modules.
- Study and Cody use the shared Druygon player API.
- Draco remains available through the legacy `/tutor` route as well as its dedicated hostname.
- Arbitrary learner code must never run on the public VPS. Fixed mission checkers may parse a tiny declarative grammar in the browser; general Python execution is proxied by `/api/sandbox` to `sandboxd` on the home Linux box over Tailscale (see `tools/sandboxd/README.md`).
- Cross-module navigation should use the production hostnames above instead of duplicating module UIs.
- Cody lesson content must follow `modules/drucode/CURRICULUM.md`. The Learn First sequence applies to every Visual Blocks, Python, and Web lesson and is written for beginner learners ages 10–13.
- Cody Visual Blocks World 1 is a six-mission sequential journey. Completion is stored per player slot (server-side via `/api/cody/progress/:slot`, merged with the localStorage fallback), celebrated inline, and unlocks exactly one next mission; completed missions remain reviewable.
- Study's MATPEL Sekolah region follows Dru's grade-5 school subjects; weekly updates follow `docs/WEEKLY-MATPEL.md`.
