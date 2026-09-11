# Numera

Adaptive K-5 math practice. A short check-in finds each player's starting point, then every problem is chosen from how the last one went. Right answers make the next one harder, misses make it easier, and skips step it down further. Players pick how hard they want it and how many questions to do. Pip, their buddy, cheers every win, and a dry-erase whiteboard walks through every miss.

- **ARCHITECTURE.md** explains how the engine works: feedback loops, formulas, data model, tuning.
- **FEEDBACK.md** is the running product feedback log and direction.
- **PRIVACY.md** explains what's stored and where (short answer: nothing leaves your device).

## Run it

**Easiest:** double-click `dist/Numera.html`. The whole app is in that one file, and progress saves in your browser.

**From source:** double-click `index.html`. Same app, split into readable files.

**Installable on your network (optional):** in this folder run `python3 -m http.server 8080`, then open `http://localhost:8080`. Over http it works offline and can be added to a phone or iPad home screen.

No install, no accounts, nothing leaves the device — see [PRIVACY.md](PRIVACY.md). Fonts are bundled with the app (see `fonts/`), so Numera makes no third-party requests, online or off.

After editing source files, run `node build.mjs` to rebuild `dist/Numera.html`, and `node tests/run.mjs` to check the engine.

## What's in it

| For the player | For grown-ups |
|---|---|
| Check-in that finds their starting spot in about 9 questions | Engagement health: in the zone, coasting, drop-off risk, drifting away |
| Three modes: **Take it easy**, **Give me some hard ones**, **Let's do this!**, with success targets set by grade (K: 95/85/75% up to grade 5: 90/70/50%) | Difficulty chart for every problem in the last session, with the ability estimate |
| 5, 10, 15 or 20 questions | Accuracy per session against that session's target |
| **Make it harder 🔥** after a right answer (weighted by how fast and unaided it was) |  Each player's targets and how far their own signals have nudged them |
| Labels like "You got this!", "Stretch: tricky on purpose", "Turning it up! 🔥" and a 5-bar difficulty meter | Frustration and boredom signals, plus every adjustment the app made, in plain English |
| Random praise, confetti and sounds for wins; "So close!" and a whiteboard walkthrough for misses | The session story, a skill path table and a skill-growth chart by grade band |
| "Skip this one" (steps difficulty down) and hints | Settings: default mode, questions, sound, redo check-in, export data |
| Level and XP that only go up; rolling day streak; a positive story after each session | |
| 10 buddy looks × 8 colors; add, edit and remove players | |

A sample player ("Sam (sample)") comes with simulated history so the grown-ups view has something to show. Remove it from the player screen.

## Evidence from simulation

`node tests/run.mjs` checks 8,400 generated problems (answers, hints and whiteboard steps) and runs simulated learners with a hidden true ability:

- **Placement:** within about 4 points of true ability (a grade band is 12-15 points), in about 9 questions.
- **Modes:** every grade × mode cell lands within 3 points of its target. Perfect sessions stay under 1% whenever the target is 85% or lower.
- **Make it harder:** bored learners reach harder problems about twice as fast; over-confident learners' presses drop to about a third of their weight within 4 sessions.
- **Learners 20 points better than their estimate:** difficulty climbs by about 14 points within the first session.
- **Learners placed 15 points too high:** early exits drop from about 84% (a fixed-level app) to about 19%.
- **Levels:** always start at 1 and never go down.

These are simulations with a simple learner model, not results from children. They check the mechanics, not learning outcomes.

## Files

```
index.html            app shell
css/app.css           visual system (light daylight theme, dark twilight theme, dry-erase whiteboard)
js/util.js            helpers, seeded random numbers
js/skills.js          21 skills with problem generators, hints and whiteboard steps
js/engine.js          ability model, placement, modes, per-answer staircase, engagement signals, XP, story
js/whiteboard.js      animated worked-example player
js/fx.js              Pip (moods and buddy looks), confetti, sounds
js/sim.js             simulated learners (tests and the sample player)
js/store.js           saving (browser storage; swap for native storage in an app build)
js/app.js             screens and interaction
tests/run.mjs         tests: node tests/run.mjs
build.mjs             builds dist/Numera.html: node build.mjs
manifest.webmanifest, sw.js, icons/   installable web app pieces
fonts/                bundled M PLUS Rounded 1c and Patrick Hand (latin subset), no third-party requests
PRIVACY.md            what's stored and where
```

## Path to the App Store and Google Play

1. **Share now as a web app.** Put this folder on any static host (GitHub Pages, Netlify, Cloudflare Pages). Families open the link and use "Add to Home Screen".
2. **Wrap it with Capacitor** for native builds. The app is plain HTML/JS, so it drops in as the web directory: `npm init @capacitor/app`, copy these files into `www/`, then `npx cap add ios` and `npx cap add android`. You need a paid Apple Developer account and a Google Play developer account.
3. **Before a Kids-category submission:**
   - ~~Bundle the two fonts (M PLUS Rounded 1c and Patrick Hand, both open-licensed) so the app makes no third-party requests.~~ Done — see `fonts/`.
   - Swap `js/store.js` for Capacitor Preferences or SQLite.
   - Add a parental gate in front of Grown-ups and Remove.
   - ~~Write a privacy policy. Nothing is collected off-device today.~~ Done — see [PRIVACY.md](PRIVACY.md).
4. **Sync across devices later:** each player is one JSON object (see "Export data").
