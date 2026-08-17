# Product

## Register

product

## Users

Dru is the primary learner. Cody is designed for beginner coders ages 10–13 using a laptop or tablet. A parent manages access, time limits, progress, and AI safety.

## Product Purpose

DruCode teaches coding through a clear game-like path from visual blocks to Python and basic web development. It should make independent practice feel achievable, preserve progress, and keep arbitrary code away from the public VPS.

## Brand Personality

Playful, encouraging, and trustworthy. Robo feels like a patient learning companion, while the interface stays calm enough for focused work.

## Anti-references

Avoid generic card walls, noisy rainbow palettes, low-fidelity grey wireframes, intimidating developer-tool density, and AI tutor behavior that gives away full answers.

## Learning Model

Each mission follows one visible sequence: Learn, Type, Run.

1. Explain one concept in child-friendly language.
2. Show a worked example that differs from the challenge value.
3. Start with an unsolved editor so Dru must apply the idea.
4. Check the mission with a fixed declarative parser and give specific corrective feedback.
5. Reveal hints gradually, with the exact answer only in the final hint.
6. On success, name the learned skill, celebrate visibly, save completion, unlock exactly one next mission, and provide one clear Continue action.

This sequence is required for every lesson in all three Cody tracks: Visual Blocks, Python, and Web. The complete authoring contract is in `CURRICULUM.md`.

For ages 10–13, each lesson must introduce only one main concept, define new vocabulary where it appears, use short concrete sentences, and avoid assuming prior syntax knowledge. The worked example must model the thinking without copying the challenge answer. A learner should be able to understand what to try before opening a hint.

Mission-specific checkers may recognize a tiny fixed grammar such as `move(integer)` in the browser. They must parse text without `eval`, `Function`, subprocesses, or arbitrary JavaScript/Python execution. General-purpose learner code remains disabled until the isolated sandbox exists.

Visual Blocks World 1 currently contains six complete missions: command, order, repeated steps, loop, condition, and a combined boss mission. Completed missions remain available for review. Progress survives reloads per Druygon player slot.

## Design Principles

1. Show one clear next mission.
2. Translate technical failure into child-friendly recovery.
3. Make progress and safety visible without adding pressure.
4. Preserve familiar Druygon identity across every learning module.
5. Keep English and Indonesian equally complete and easy to switch.

## Accessibility & Inclusion

Meet WCAG AA contrast, retain keyboard access for primary actions, support reduced motion, use readable child-facing type, and keep layouts usable from 390px mobile through tablet and desktop.
