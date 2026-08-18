# Cody Curriculum Contract

This contract applies to every coding lesson in all three Cody tracks: Visual Blocks, Python, and Web.

## Learner

Design for a beginner learner ages 10–13. Do not assume the learner already knows programming vocabulary, punctuation, syntax, or how a code editor behaves.

## Required lesson flow

Every lesson follows the same visible order:

1. **Story:** give the learner a concrete reason to use the concept.
2. **Learn First:** teach one main concept in plain language.
3. **Worked example:** show the syntax and its result with a value or situation different from the challenge.
4. **Type or build:** provide an unsolved starter and one clear goal.
5. **Run and respond:** validate the learner's attempt and explain what to change.
6. **Reflect and reward:** name the skill the learner used before awarding progress.

The challenge must not be presented as solvable until its Learn First content exists. Do not use the challenge answer as the worked example.

## Required lesson data

Each lesson record must provide:

```ts
type Lesson = {
  id: string;
  track: 'visual-blocks' | 'python' | 'web';
  world: number;
  order: number;
  title: string;
  story: string;
  learnFirst: {
    concept: string;
    explanation: string;
    syntaxPattern: string;
    parts: Array<{ token: string; meaning: string }>;
    workedExample: { code: string; result: string };
  };
  task: string;
  starterCode: string;
  validation: unknown;
  hints: [string, string, string];
  skill: string;
  xpReward: number;
};
```

The UI's `LearnFirst` component requires this teaching content before the task and editor. When lessons move to API-backed content, validate this shape at the content boundary and keep incomplete lessons locked.

## Completion and progression

Every successful mission must produce an obvious transition, not only an output line:

1. Show an inline completion celebration and name the skill learned.
2. Persist the completed mission before presenting the next action.
3. Unlock exactly the next sequential mission. Later missions remain locked.
4. Provide one primary Continue action that opens the newly unlocked mission.
5. On the map, mark the completed node with a check and mark the next node as available.
6. Keep completed missions open for review and show a world-complete state after the final mission.

The current Visual Blocks journey stores a contiguous list of completed mission IDs in `drucode-progress-${slot}-visual-blocks-v1`. Never trust a sparse or out-of-order stored list to skip lessons. Drafts remain separate per player slot and lesson.

## Ages 10–13 writing rules

- Teach one main concept per lesson; review older concepts only when needed.
- Use short, concrete sentences and familiar examples.
- Define a new word the first time it appears. Prefer “repeat” before introducing “loop,” then connect the two terms.
- Explain punctuation that carries meaning, including parentheses, quotes, colons, braces, and semicolons.
- Keep code identifiers in English, while teaching copy is complete in both English and Indonesian.
- Show cause and effect: the code, what the computer does, and why.
- Never rely on “just type this.” The learner must first see what each part means.
- Avoid babyish language, pressure, punishment, streak loss, and comparison with other learners.
- Give specific, encouraging error feedback without revealing the full answer immediately.

## Track progression

### Visual Blocks

Start with commands and sequence, then repeat/loop, conditions, variables, and events. Teach the idea visually before depending on text syntax.

### Python

Bridge each new text concept to a familiar Visual Blocks idea. Introduce output, variables, input, conditions, loops, functions, and small projects one at a time.

### Web

Separate structure, style, and behavior before combining them. Teach HTML elements, CSS rules, and JavaScript interactions with an immediate safe preview.

## Hints and validation

Hints are staged:

1. Restate the concept or pattern.
2. Point to the part that needs attention.
3. Reveal the exact answer only as the final hint.

Mission-specific checkers may parse a tiny fixed grammar. They must not use `eval`, `Function`, subprocesses, or arbitrary learner-code execution. General Python and JavaScript execution stays unavailable until the isolated sandbox contract is implemented.

For journey changes, run `python3 modules/drucode/scripts/qa-journey.py`. It tests all six Visual Blocks missions in sequence, EN/ID switching, direct Continue transitions, map unlock states, completion reload persistence, Chromium, WebKit, desktop, and 390px mobile.
