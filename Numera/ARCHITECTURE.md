# Numera architecture

How the app decides what problem to show next, and how every signal feeds back into that decision. For product feedback and direction, see FEEDBACK.md. For running and shipping, see README.md.

## Design principle

**Assess after every problem, adjust before the next one.** Nothing is a fixed level. The child sees an encouraging Level that only goes up. The engine keeps a separate, private estimate of skill and moves the difficulty target after every answer.

## The pieces

```
 ┌──────────────┐  item   ┌──────────────┐  answer + time + hint/skip  ┌──────────────┐
 │  Generator   │ ──────▶ │    Screen    │ ─────────────────────────▶ │    Engine    │
 │ (skills.js)  │         │   (app.js)   │                             │ (engine.js)  │
 └──────▲───────┘         └──────────────┘                             └──────┬───────┘
        │   target difficulty b + role                                        │
        └─────────────────────────────────────────────────────────────────────┘
               b = ability − 6·logit(role's target success) + dial + staircase
```

| File | Role |
|---|---|
| `js/skills.js` | 21 skills from counting to order of operations. Each owns a band `[lo, hi]` on one 0-100 internal scale and a generator `gen(d)`, where `d ∈ [0,1]` is the position inside the band. Returns the problem, answer, hint, and whiteboard steps. |
| `js/engine.js` | Ability model, placement, session modes, per-answer staircase, engagement signals, challenge dial, XP/levels, session story, engagement health. Pure logic, no DOM, fully testable. |
| `js/whiteboard.js` | Plays a worked example from step data: marker text, number-line hops, ten frames, column math with carries and trades, area models, fraction bars, place-value charts, hopping decimal point. |
| `js/fx.js` | Pip the mascot (moods and buddy looks), confetti, synthesized sounds. |
| `js/app.js` | Screens and interaction. Measures response time (minus time the app was hidden). Records early exits when the app closes mid-session. |
| `js/store.js` | Saves everything as one JSON object in browser storage. Swap for native storage in an app-store build. |
| `js/sim.js` | Simulated learners with a hidden true ability, used for tests and the sample player. |
| `tests/run.mjs` | Checks 8,400 generated problems and runs simulated learners against every mechanism below. |

## How the next problem is chosen

1. **Pick a role** for the question (`pickRole`). Order of precedence:
   - Warm-up slots at the start (one extra after 4+ days away).
   - The last question is a **finisher** (likely win).
   - Frustration ≥ 0.55 → **"You got this!"** confidence builder.
   - A pending big "Make it harder" press → **challenge**.
   - A queued **second try** on a recently missed skill.
   - Boredom ≥ 0.55 → **challenge**.
   - Otherwise the mode's rhythm (`MODES[mode].plan`), e.g. core, stretch, core, review…
2. **Compute target difficulty** (`targetB`), using the session's grade-adjusted role rates (see Modes below):
   `b = θ − 6 · ln(p / (1 − p)) + dial + stair`
   - `θ` is the ability estimate; `p` is the role's target success rate in the current mode.
   - `dial` is the challenge dial; `stair` is the in-session staircase.
   - Steadying roles (warm-up, confidence, finisher) cap the upward shift so they stay easy.
3. **Pick a skill** whose band covers `b`, favoring variety and less-practiced skills (`chooseSkill`). Review questions pull from mastered skills least recently seen.
4. **Generate** at `d = (b − lo) / (hi − lo)`. The problem carries `b`, its role, and the predicted success chance (shown to the child as the 5-bar difficulty meter).

### Modes and grade-based targets

Each mode has a rhythm of roles. Its success target comes from the child's **enrolled grade** (age), because how much struggle a child can take depends on age, not skill level:

| Grade | Take it easy | Give me some hard ones | Let's do this! |
|---|---|---|---|
| K | 95% | 85% | 75% |
| 1 | 93% | 82% | 70% |
| 2 | 92% | 80% | 65% |
| 3 | 90% | 75% | 60% |
| 4 | 90% | 72% | 55% |
| 5 | 90% | 70% | 50% |

`modeSpec` shifts every role's success rate in logit space by the same amount, so each mode keeps its shape (warm-ups easier than core, core easier than stretch) while the average lands on the grade's target.

**Per-child nudge** (`profile.nudge`, −1 to +1): a child's own signals move their row up to one grade either way, in thirds, interpolating between rows. Moves gentler after an early exit, "Too hard", or accuracy 15+ points under target. Moves harder after "Too easy", accuracy 10+ over target with boredom, or 2+ big "Make it harder" presses in a session.

| Rhythm | Roles |
|---|---|
| Take it easy | mostly core and review, occasional stretch |
| Give me some hard ones | core alternating with stretch |
| Let's do this! | mostly stretch |

Simulated results (150 learners × 6 sessions per cell): every grade × mode cell lands within 3 points of its target (e.g. K: 92/82/74 against 94/85/75; grade 5: 90/70/54 against 90/70/50). Perfect sessions stay under 1% whenever the target is 85% or lower.

## Feedback loop 1: after every answer

In `recordSessionAnswer`:

| Signal | Update |
|---|---|
| **Ability** `θ` | Elo/Rasch: `θ += 2K · (score − P(correct))`, with `K = 4` for the first 3 sessions, then 2.5. Score is 1 for correct, 0.85 if very slow, 0.6 with a hint, 0 for a miss or skip. |
| **Staircase** `stair` | `stair += 4 · (outcome − target)`. Right answers step up, misses step down; the equilibrium is the mode's target. Streak bonus in the harder modes: `+3 · (1 − target)` after 2+ in a row. **Skip: an extra −3.** Clamped to [−12, +16]. |
| **Frustration** `F` | Decays ×0.7 per answer, then adds: miss +0.32 (+0.16 on stretch/challenge), skip +0.3, rapid guess +0.15, hint +0.08, very slow +0.1. Scaled ×0.6 in "Let's do this!" and ×1.2 in "Take it easy". Two misses in a row force F ≥ 0.6 (three in "Let's do this!", where misses are expected). |
| **Boredom** `B` | Decays ×0.72, then adds: fast correct +0.3, quick correct on an easy role +0.12. Four right in a row, fast, force B ≥ 0.55. |
| **Pace** | Personal speed factor learned from correct answers, so "slow" and "fast" are relative to this child, not to an adult. |
| **Second try** | A missed core problem queues its skill to return 2 questions later, slightly easier. |
| **Make it harder** | Offered only on the celebration card after a right answer (`requestHarder`). Step depends on that answer: fast (under 0.8× expected) and no hint = +6 plus a challenge problem next; normal pace, no hint = +3.5; slow or hinted = +1.5. Scaled by `harderTrust` (starts at 100%). The next two answers check it: two misses cut trust ×0.6, one miss ×0.85, none adds 10 points back (floor 30%). Simulated: a bored learner's problems run 12 points above the starting estimate with presses vs 6 without; an over-confident learner's trust falls to about 34% within 4 sessions. |
| **XP** | +10 correct, +15 stretch, +20 challenge, +12 second try, +8 with a hint, +3 for any attempt or skip. |

## Feedback loop 2: after each session

In `finishSession`:

- **Carry-over:** 35% of the ending staircase is added to `θ`, so the next session starts where this one ended.
- **Challenge dial** (a per-player preference, separate from ability, clamped ±10):
  - Left early: −1.5, or −3 if frustration peaked or accuracy fell 20+ points under target.
  - "Too hard": −2. "Too easy": +2.
  - Accuracy 15+ points over target with boredom: +1.5.
  - "Just right": drifts 15% back toward neutral.
- **Session record** saved with every answer (difficulty, predicted chance, time, flags, F/B), the engine's decision log, the positive story, mode and target.

## Feedback loop 3: across sessions

- **Welcome back:** 4+ days away adds a warm-up.
- **Engagement health** (grown-ups view), over the last 5 sessions:
  - *Drop-off risk:* 40%+ early exits, accuracy 18+ points under target, or 2+ "too hard".
  - *Coasting:* accuracy 14+ points over target with boredom, or 2+ "too easy".
  - *Drifting away:* no session in 5+ days.
  - Otherwise *in the zone*.

## Placement check-in

A computer-adaptive test. Each question aims at a 50% chance (the most informative point). Step size starts at 15 points and shrinks 20% per answer (floor 3). Stops at 12 questions, or after 8 once the estimate is stable. Two misses in a row gets an easier question. Simulated accuracy: within about 4 points of true ability, in about 9 questions. Skills well below the result are marked as known, for review.

## What the child sees vs. what the engine knows

| Child sees | Engine knows |
|---|---|
| Level and XP (only goes up) | Ability estimate `θ` (0-100, can go down) |
| "Turning it up! 🔥" and a 5-bar meter | Exact target difficulty and predicted chance |
| "You got this!", "Stretch: tricky on purpose" | Role and why it was chosen |
| A positive session story | Full answer log, F/B signals, dial and staircase |

## Data model (per player)

```
{ id, name, grade, color, look, xp, theta, placed, offset (dial), nudge, harderTrust, speed, mode, qCount,
  skills: { [skillId]: { n, correct, acc, last, assumed } },
  sessions: [ { mode, target, grade, nudge, harderAsks, completed, feel, acc, peakF, peakB, xp, story, changes,
                answers: [ { skill, role, b, p, correct, skipped, hinted, time, expected,
                             F, B, theta, thetaBefore, stair, flags, askedHarder } ], log: [...] } ],
  history: [ { t, theta, kind } ] }
```

## Tuning knobs

All in `js/engine.js`: `GRADE_TARGETS` (the grade × mode table), `MODES` (role success rates and rhythm), `STEP` (staircase size), the streak bonus, the skip penalty, the F/B weights in `recordSessionAnswer`, the dial rules in `finishSession`, and `XP`. After any change, run `node tests/run.mjs`. It fails if any grade × mode cell drifts more than 6 points from its target, perfect sessions stop being rare, or "Make it harder" stops speeding up bored learners or stops discounting over-confident ones.
