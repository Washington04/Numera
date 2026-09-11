# Numera: notes for Claude

Numera is an adaptive K-5 math practice app for the web. It's plain HTML, CSS and JavaScript, with no framework, no npm dependencies and no build step beyond one script. It is hosted on GitHub Pages from `main` at `/ (root)`: https://washington04.github.io/Numera/

Read these first:
- `README.md` covers what the app does and how to run it.
- `ARCHITECTURE.md` explains how the adaptive engine works: feedback loops, formulas, data model, tuning.
- `FEEDBACK.md` is the product owner's feedback log plus the "Direction" themes. Treat it as the product spec.

## After every change
1. Run `node tests/run.mjs`. All checks must pass. It verifies every problem generator, the whiteboard step data, and the adaptive engine against simulated learners.
2. Run `node build.mjs` to rebuild `dist/Numera.html`, the single-file version. Commit it alongside the source.
3. Add each piece of feedback from Aaron as a numbered row in `FEEDBACK.md` with status and what changed. Update "Direction" if a new theme appears.
4. If engine behavior or constants change, update `ARCHITECTURE.md` and any simulation numbers quoted in `README.md`.
5. Keep scripts as classic `<script>` files on `window.MP` (no ES modules), so the app still runs when `index.html` is double-clicked from disk.

## Product rules (from FEEDBACK.md)
- Difficulty is assessed and adjusted after every problem. This is the core differentiator.
- Kids never see ability numbers. Their Level and XP only go up, and everyone starts at Level 1.
- Right answers get varied, excited, child-safe praise (emojis are fine). Misses get "So close!" style encouragement plus the dry-erase whiteboard walkthrough. Never flat or punishing.
- A second try is a similar problem from the same skill, never the identical problem.
- Mode success targets come from the enrolled-grade table in `engine.js` (`GRADE_TARGETS`), and each child can be nudged one grade row either way.
- "Skip this one" steps difficulty down. "Make it harder" appears only after a right answer, is weighted by how that answer went, and is discounted when the next answers are misses.
- Hints decompose fully by place value (400×5 + 10×5 + 4×5).
- Visual direction: "Pixar meets Apple meets anime". Pip is the original mascot; don't use real characters or brands.

## Where things live
- `js/skills.js`: skills, generators, hints, whiteboard steps (`wb`)
- `js/engine.js`: ability model, modes, staircase, signals, XP, narrative, health
- `js/app.js`: screens
- `js/whiteboard.js`: worked-example player
- `js/fx.js`: Pip, confetti, sounds
- `css/app.css`: design tokens and components
- `js/store.js`: saving. Storage key `numera.v1`, migrates the old `mathpath.v1`; keep that migration.
