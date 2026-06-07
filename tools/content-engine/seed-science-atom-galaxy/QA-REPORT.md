# Science Atom and Galaxy QA Report

Generated and reviewed on 2026-06-07 for ages 10-12.

## Pipeline

- Provider: Ollama
- Generate model: `qwen3.5:cloud`
- QA model: `qwen3.5:cloud`
- Separate generate and QA passes
- Requested: 8 questions per zone
- Kept: 16 questions total

## QA Results

- `atom_dan_unsur`: 8 checked, 2 fixed by model QA, 0 removed.
- `galaksi_dan_angkasa`: 8 checked, 0 fixed by model QA, 0 removed.
- Deterministic validation: every item has 2-4 options, valid answer index, allowed difficulty,
  non-empty question and hint, and no duplicate question text.

## Manual Review

- Replaced a non-science distractor with `Gelombang suara`.
- Corrected the Bima Sakti hint so it no longer implies the name refers to a dragon or giant snake.
- Confirmed the zones remain age-appropriate introductions; they avoid advanced chemistry math and
  avoid presenting speculative astronomy as fact.

## Zones

- Science zone 4: `Laboratorium Atom`, topic `atom_dan_unsur`, minimum level 16.
- Science zone 5: `Observatorium Galaksi`, topic `galaksi_dan_angkasa`, minimum level 21.
