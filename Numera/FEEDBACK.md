# Numera feedback log

Every piece of product feedback from Aaron, in his words where possible, with what was done about it. Reviewed at each build for overall direction (see "Direction" at the bottom).

Status: **Done** shipped · **Open** not started or needs discussion

## 2026-09-11 · Round 1 (after first build) → shipped in build 2

| # | Feedback | Status | What changed |
|---|---|---|---|
| 1 | UI should be modern and fun: "Pixar animation meets Apple meets anime." | Done | New visual system: soft lit gradients, frosted glass cards, candy 3D buttons, original mascot (Pip) with anime-style sparkle eyes and moods, confetti and sparkle bursts. |
| 2 | A right answer should never say "Got it." Randomized, child-safe excitement: "Great job!", "Right again!", "Well done!" Celebration emojis welcome. | Done | 15+ rotating praise lines with emojis, streak callouts ("3 in a row!"), bigger celebration for stretch and challenge wins, chime sound. Placement check-in celebrates too. |
| 3 | A wrong answer should say so but stay encouraging, e.g. "So close, let's come back to this one." (Open to discussion.) | Done | "So close!" style headers. When a similar problem is queued for later, it says "Let's come back to this one." Tough problems say "That was a tough one." Discussion point: the return visit uses a *similar* problem, not the identical one, so the child practices the method instead of recalling the answer they were just shown. |
| 4 | Loves Khan Academy's whiteboard-style explanations. Show the correct answer below on a whiteboard, dry-erase style. | Done | Animated dry-erase whiteboard for every skill: colored markers, number-line hops, make-a-ten frames, column math with carries and borrows, area models, fraction bars, division chunking, hopping decimal point. |
| 5 | Never start at "level 100", which implies a PhD mathematician. Level should be encouraging, not a judgment. | Done | Everyone starts at Level 1. XP comes from effort and correct answers and never goes down. The ability estimate stays internal; grown-ups see "working at mid grade 3" instead of a number out of 100. |
| 6 | Likes the step-by-step explanation style ("9 × 2 = 18, then 2 + 18 = 20"). | Done | That style is now the whiteboard's backbone, line by line. |
| 7 | Should rarely get every question right. When doing well, raise difficulty automatically. | Done | Per-answer staircase: every correct answer makes the next harder, every miss makes it easier, with faster climbs on hot streaks. Simulated perfect-session rate: 0% in the two harder modes. |
| 8 | Let me set the number of questions per session. | Done | Picker on the start screen: 5, 10, 15, 20. |
| 9 | Let me set the session level: "Take it easy" (at least 90%), "Give me some hard ones" (70%), "Let's do this!" (50%, adjust after each problem). | Done | Three modes with those targets. Simulated accuracy: 89%, 70%, 54%. |
| 10 | Assessing progress and adjusting difficulty after each problem is the core, differentiating feature. | Done | Made visible: the child sees "Turning it up!" when difficulty rises; grown-ups get a problem-by-problem difficulty chart for each session. |
| 11 | Loves the label "Stretch: tricky on purpose." Label confidence builders something like "You got this!" | Done | Confidence builders, warm-ups and finishers are labeled "You got this!" |
| 12 | Collect feedback in a file and review it periodically for direction. | Done | This file. |
| 13 | Likes the header "Let's see how it works" (shown after "I'm not sure"). | Done | Kept for skips, and used as the whiteboard's heading after a miss. |
| 14 | Don't allow Check on a fraction until both top and bottom are filled in. | Done | Check stays disabled until both fields have a number. |
| 15 | Rename "I'm not sure" to "Skip this one", and feed skips back to the problem generator as a signal to roll back difficulty. | Done | Renamed. A skip now steps difficulty down more than a miss does, adds to the frustration signal, and shows in the grown-ups log. |
| 16 | Give a positive narrative summary of each lesson. | Done | Every session ends with a short story in second person (skills practiced, best streak, times it got harder, tricky ones solved, what Pip brings back next). Saved with the session and shown to grown-ups. |
| 17 | Hints didn't decompose enough: 414 × 5 should be 400×5 + 10×5 + 4×5. | Done | Multi-digit hints now split by full place value, for two-digit multipliers too (e.g. 30×20 + 30×5 + 4×20 + 4×5). The whiteboard area model uses the same split. |
| 18 | Make the session summary more encouraging. | Done | Opens with a celebration, counts problems *tried* instead of right, frames leveling up as growing, praises second-try wins, and closes with Pip being proud. Never mentions a low score. |
| 19 | Loves the post-lesson "How did that feel?" feedback. Asked how it feeds the problem generator. | Done | Explained: "Too easy / Just right / Too hard" moves a per-player challenge dial that shifts every future problem's difficulty target, alongside the per-answer staircase and the ability estimate. See README "How it adapts". |
| 20 | Likes the week/streak strip, but make it a rolling streak: no streak going means today is the first day; a streak in progress puts today in the middle. | Done | Rolling 7-day strip with today labeled, past days starred, future days dashed, and a line like "🔥 3-day streak! Play today to make it 4." |
| 21 | Loves the architecture explanation; asked whether the technical architecture is written down. | Done | Added ARCHITECTURE.md: data flow, the three feedback loops with the actual formulas and constants, data model, file map, and how to tune it. |
| 22 | "Who's playing" page: add a button to remove a learner. | Done | Each player card has Remove, with an in-card "Keep / Remove" confirmation (no pop-up). Also added Edit. |
| 23 | Let players pick an animal, character or theme for their picture. | Done | 10 buddy looks built on Pip, so every mood and celebration still works: Sprout, Kitty, Bunny, Bear, Panda, Fox, Robot, Unicorn, Dino, Royal, in 8 colors. Pickable when adding or editing a player. |

## 2026-09-11 · Round 2 (after build 2)

| # | Feedback | Status | What changed |
|---|---|---|---|
| 24 | Second tries: agrees it should be a similar problem in the same category, not the exact same one. | Done | No change needed; confirmed as the design. |
| 25 | Agrees 50% may be too hard for young kids. Set confidence vs. challenge targets per grade; asked for a recommendation. | Done | Grade × mode table (K: 95/85/75 up to grade 5: 90/70/50), keyed to enrolled grade, with each child able to drift one grade row either way from their own signals. Simulated within 3 points of target in every cell. Grown-ups see the child's row and nudge. |
| 26 | Should there be explicit "too easy" and "too hard" buttons? | Done | "Skip this one" stays the too-hard signal. Added "Make it harder 🔥" on the celebration card after a right answer only. Fast and unaided = big step plus a challenge next; slow or hinted = small step; followed by misses = counts for less next time (trust score shown to grown-ups, 🔥 marks on the difficulty chart). |
| 27 | Strongly agrees with weighting "Make it harder" by how the answer went, and discounting it when followed by misses. | Done | Built as described (item 26). |
| 28 | Rename the profile screen title from "Who's playing today?" to "Choose your profile". | Done | Title changed. |
| 29 | Rename the app to Numera. | Done | Renamed everywhere: title, wordmark, installable app name, single-file build (dist/Numera.html), docs. Saved progress carries over from the old name automatically. |

## Direction

Themes so far, strongest first:

1. **Adaptivity is the product.** Per-problem adjustment is the differentiator and should be visible to kids (it's exciting) and to parents (it's proof).
2. **Emotional safety plus real challenge.** Never flat, never punishing: celebrate wins loudly, frame misses as "so close," and still keep kids off the 100% plateau.
3. **Teach, don't just grade.** Worked examples (Khan-style whiteboard) matter as much as scoring.
4. **Learner control with honest weighting.** Let the child or parent choose intensity and length, and ask for harder, but weigh every self-report against what the answers show. Age sets how much struggle is appropriate.
5. **Delight.** Playful, polished, character-driven visuals.

Watch items: whether the grade table feels right in real sessions (it's one table in engine.js); how often kids press "Make it harder" and whether the trust score settles sensibly; whether session modes should unlock or suggest themselves based on engagement data.
