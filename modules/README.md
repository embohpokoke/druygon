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
- Arbitrary learner code must never run on the public VPS. Fixed mission checkers may parse a tiny declarative grammar in the browser; general Python/JavaScript execution stays offline until an isolated sandbox service is available.
- Cross-module navigation should use the production hostnames above instead of duplicating module UIs.
- Cody lesson content must follow `modules/drucode/CURRICULUM.md`. The Learn First sequence applies to every Visual Blocks, Python, and Web lesson and is written for beginner learners ages 10–13.
