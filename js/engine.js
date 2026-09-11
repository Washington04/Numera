/* Numera adaptive engine.

   Ability model: one number (theta, 0-100) per learner, updated Elo/Rasch
   style after every answer. P(correct) = logistic((theta - b) / S).

   Placement: a computer-adaptive test. Each item is aimed at P = 0.5 (the
   most informative point); the step size shrinks as evidence builds.

   Sessions: short sets that mix item "roles" aimed at different success
   probabilities (warm-up 90%, core ~75%, stretch 55%, challenge 42%).

   Engagement controller: two running signals, frustration (F) and boredom
   (B), built from accuracy, streaks, response time relative to the learner's
   own pace, hints, skips and rapid guessing. High F eases off; high B lifts.

   Across sessions: a per-learner "challenge dial" (offset) and session length
   adapt to quits, self-reports and boredom, so the next session starts in a
   better place instead of repeating a static level. */
(function (root) {
  const MP = (root.MP = root.MP || {});
  const U = MP.U, SK = MP.Skills;

  const S = 6; // ability points per logit
    const ROLE_SHORT = { warmup: 'Warm', review: 'Rev', ease: 'Easy', finisher: 'Fin', retry: 'Retry', core: 'Core', stretch: 'Str', challenge: 'Chal', placement: 'Place' };
  const ROLE_LABEL = { warmup: 'Warm-up', review: 'Review', ease: 'Confidence', finisher: 'Finisher', retry: 'Second try', core: 'Core', stretch: 'Stretch', challenge: 'Challenge', placement: 'Placement' };

  const P = (theta, b) => U.logistic((theta - b) / S);
  const bFor = (theta, p) => theta - S * U.logit(p);

  function newProfile(name, grade, color) {
    const theta = SK.startTheta(grade);
    return {
      id: U.uid(), name, grade, color: color || 9, created: Date.now(),
      theta, placed: false, offset: 0, speed: 1, mode: 'balanced', qCount: 10, nudge: 0, harderTrust: 1,
      skills: {}, sessions: [], history: [{ t: Date.now(), theta, kind: 'start' }], demo: false, xp: 0,
    };
  }

  /* ---------------- Level + XP (what the child sees) ----------------
     Everyone starts at Level 1. XP comes from effort as well as correct
     answers, and never goes down, so the level only ever celebrates. */
  const XP = { correct: 10, hinted: 8, retry: 12, stretch: 15, challenge: 20, effort: 3, session: 25, placement: 20 };
  const levelNeed = (L) => 80 + 20 * L; // XP to go from level L to L+1
  function levelInfo(xp) {
    let level = 1, rem = Math.max(0, xp || 0), need = levelNeed(1);
    while (rem >= need) { rem -= need; level++; need = levelNeed(level); }
    return { level, into: rem, need, pct: rem / need };
  }
  function awardXP(profile, amt) {
    const before = levelInfo(profile.xp).level;
    profile.xp = (profile.xp || 0) + amt;
    const after = levelInfo(profile.xp).level;
    return { xp: amt, levelUp: after > before ? after : 0 };
  }
  function xpFor(item, r) {
    if (r.skipped || !r.correct) return XP.effort;
    if (r.hinted) return XP.hinted;
    return XP[item.role] || XP.correct;
  }

  function skillStat(profile, id) {
    return (profile.skills[id] = profile.skills[id] || { n: 0, correct: 0, acc: 0.5, last: 0, assumed: false });
  }

  function expectedTime(item, profile) { return item.expected * U.clamp(profile.speed || 1, 0.5, 3); }

  // Score for the ability update: correctness, shaded by speed and help.
  function scoreOf(r, item, profile) {
    if (r.skipped || !r.correct) return 0;
    let s = 1;
    if (r.hinted) s = 0.6;
    else if (r.time > 2.5 * expectedTime(item, profile)) s = 0.85;
    return s;
  }

  // Choose a skill for difficulty b, preferring variety.
  function chooseSkill(b, recent, profile, exclude) {
    let cands = SK.skillsAt(b).filter((s) => !(exclude || []).includes(s.id));
    if (!cands.length) cands = SK.skillsAt(b);
    const weights = cands.map((s) => {
      let w = 1;
      const i = recent.lastIndexOf(s.id);
      if (i >= 0) w *= recent.length - i <= 1 ? 0.15 : recent.length - i <= 3 ? 0.5 : 1;
      const st = profile.skills[s.id];
      if (!st || st.n < 3) w *= 1.3; // gently favour less-practised skills
      return w;
    });
    const tot = weights.reduce((a, x) => a + x, 0);
    let r = U.rand() * tot;
    for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) return cands[i]; }
    return cands[cands.length - 1];
  }

  /* ---------------- Placement ---------------- */

  function startPlacement(profile) {
    return { kind: 'placement', theta: profile.theta, n: 0, max: 12, info: 0, answers: [], recent: [], start: Date.now(), consecWrong: 0 };
  }

  function nextPlacementItem(st, profile) {
    // Aim at P=0.5 with a little jitter so we don't repeat the same exact band.
    let b = st.theta + (U.rand() - 0.5) * 3;
    // After two misses in a row, give an easier one so the check-in stays kind.
    if (st.consecWrong >= 2) b = st.theta - 8;
    const skill = chooseSkill(b, st.recent, profile);
    const item = SK.makeItem(skill, b);
    item.role = 'placement';
    return item;
  }

  function recordPlacement(st, profile, item, r) {
    const p = P(st.theta, item.b);
    const score = r.skipped ? 0 : r.correct ? (r.hinted ? 0.7 : 1) : 0;
    const K = Math.max(3, 15 * Math.pow(0.8, st.n));
    st.theta = U.clamp(st.theta + K * 2 * (score - p), 0, 100);
    st.info += p * (1 - p);
    st.n++;
    st.recent.push(item.skillId);
    st.consecWrong = score > 0 ? 0 : st.consecWrong + 1;
    st.answers.push({ skill: item.skillId, b: U.fix(item.b, 1), correct: !!r.correct, skipped: !!r.skipped, time: U.fix(r.time, 1), theta: U.fix(st.theta, 1) });
    return awardXP(profile, xpFor(item, r));
  }

  function placementSE(st) { return st.info > 0 ? S / Math.sqrt(st.info) : 99; }
  function placementDone(st) { return st.n >= st.max || (st.n >= 8 && placementSE(st) < 6 && Math.abs(st.answers[st.n - 1].theta - st.answers[st.n - 3].theta) < 3); }

  function finishPlacement(st, profile) {
    profile.theta = U.fix(st.theta, 2);
    profile.placed = true;
    profile.placedAt = Date.now();
    profile.placement = { answers: st.answers, theta: profile.theta, se: U.fix(placementSE(st), 1) };
    // Skills well below the placement are assumed known (used for review).
    SK.list.forEach((s) => { if (s.hi < profile.theta - 4) { const k = skillStat(profile, s.id); k.assumed = true; } });
    st.answers.forEach((a) => { const k = skillStat(profile, a.skill); k.n++; if (a.correct) k.correct++; k.acc = k.correct / k.n; k.last = Date.now(); });
    profile.history.push({ t: Date.now(), theta: profile.theta, kind: 'placement' });
    const aw = awardXP(profile, XP.placement);
    return { theta: profile.theta, grade: SK.gradeFor(profile.theta), levelUp: aw.levelUp };
  }

  /* ---------------- Sessions ----------------
     Three modes the learner (or a grown-up) picks. Each sets a target
     success rate and a rhythm of question roles. After EVERY answer a
     staircase nudges difficulty toward the target: a right answer makes
     the next one harder, a miss makes it easier. Streaks can't coast. */

  const MODES = {
    easy: {
      label: 'Take it easy', blurb: 'Lots of wins. Warm-up reps.', target: 0.9, warmups: 2,
      p: { warmup: 0.97, core: 0.95, review: 0.96, stretch: 0.87, retry: 0.94, ease: 0.97, challenge: 0.75, finisher: 0.97 },
      plan: ['core', 'core', 'review', 'core', 'stretch', 'core', 'core', 'review'],
    },
    balanced: {
      label: 'Give me some hard ones', blurb: 'A mix of easy and tricky.', target: 0.7, warmups: 1,
      p: { warmup: 0.9, core: 0.74, review: 0.9, stretch: 0.5, retry: 0.8, ease: 0.93, challenge: 0.42, finisher: 0.86 },
      plan: ['core', 'stretch', 'core', 'review', 'stretch', 'core', 'stretch', 'core'],
    },
    stretch: {
      label: "Let's do this!", blurb: 'Big challenges. Tough on purpose.', target: 0.5, warmups: 1,
      p: { warmup: 0.85, core: 0.55, review: 0.85, stretch: 0.42, retry: 0.7, ease: 0.88, challenge: 0.35, finisher: 0.7 },
      plan: ['stretch', 'core', 'stretch', 'stretch', 'core', 'stretch', 'review', 'stretch'],
    },
  };
  const STEP = 4; // staircase step (ability points) per answer

  /* Success targets by enrolled grade (how much struggle a child can
     take depends on age, not skill level). Columns: easy, balanced, stretch. */
  const GRADE_ORDER = ['K', '1', '2', '3', '4', '5'];
  const GRADE_TARGETS = {
    K: [0.95, 0.85, 0.75], 1: [0.93, 0.82, 0.70], 2: [0.92, 0.80, 0.65],
    3: [0.90, 0.75, 0.60], 4: [0.90, 0.72, 0.55], 5: [0.90, 0.70, 0.50],
  };
  const MODE_COL = { easy: 0, balanced: 1, stretch: 2 };
  // Each child can drift up to one grade row either way from their own
  // signals (profile.nudge in [-1, 1]; positive = harder row).
  function targetsFor(profile) {
    const gi = Math.max(0, GRADE_ORDER.indexOf(String(profile.grade)));
    const x = U.clamp(gi + (profile.nudge || 0), 0, GRADE_ORDER.length - 1);
    const lo = Math.floor(x), hi = Math.ceil(x), f = x - lo;
    const rl = GRADE_TARGETS[GRADE_ORDER[lo]], rh = GRADE_TARGETS[GRADE_ORDER[hi]];
    const out = {};
    Object.keys(MODE_COL).forEach((m) => { out[m] = U.fix(U.lerp(rl[MODE_COL[m]], rh[MODE_COL[m]], f), 3); });
    return out;
  }
  // Shift a mode's whole rhythm (every role's success rate) to the target.
  function modeSpec(profile, mode) {
    const M = MODES[mode];
    const target = targetsFor(profile)[mode];
    const shift = U.logit(target) - U.logit(M.target);
    const p = {};
    Object.keys(M.p).forEach((k) => { p[k] = U.clamp(U.logistic(U.logit(M.p[k]) + shift), 0.3, 0.985); });
    return { target, p };
  }
  function nudgeLabel(profile) {
    const n = profile.nudge || 0;
    if (Math.abs(n) < 0.17) return 'no nudge';
    const steps = Math.round(Math.abs(n) * 3) / 3;
    return `nudged ${steps >= 0.99 ? 'a full grade' : steps >= 0.66 ? 'two steps' : 'one step'} ${n > 0 ? 'harder' : 'gentler'}`;
  }

  function daysSinceLast(profile, now) {
    const last = profile.sessions[profile.sessions.length - 1];
    return last ? (now - last.end) / 864e5 : 0;
  }

  function startSession(profile, now, opts) {
    now = now || Date.now();
    opts = opts || {};
    const mode = MODES[opts.mode || profile.mode] ? (opts.mode || profile.mode) : 'balanced';
    const len = U.clamp(Number(opts.len || profile.qCount || 10), 3, 30);
    const gap = daysSinceLast(profile, now);
    const spec = modeSpec(profile, mode);
    const st = {
      kind: 'session', id: U.uid(), start: now, len, idx: 0, mode, target: spec.target, p: spec.p, harderChecks: [], forceChallenge: false,
      F: 0, B: 0, peakF: 0, peakB: 0, stair: 0, consecWrong: 0, consecRight: 0,
      answers: [], log: [], recent: [], retryQueue: [], welcomeBack: gap >= 4, xp: 0, lastB: null,
    };
    if (st.welcomeBack) st.log.push({ i: 0, type: 'ease', text: `Back after ${Math.round(gap)} days, so the session opens with an extra warm-up.` });
    const recentQuits = profile.sessions.slice(-3).filter((s) => !s.completed).length;
    if (recentQuits >= 2) st.log.push({ i: 0, type: 'info', text: `${recentQuits} of the last 3 sessions ended early. Consider fewer questions or "Take it easy".` });
    return st;
  }

  function masteredSkills(profile) {
    return SK.list.filter((s) => {
      const k = profile.skills[s.id];
      return s.hi < profile.theta - 2 && (!k || k.assumed || k.acc >= 0.7);
    });
  }

  function pickRole(st, profile) {
    const M = MODES[st.mode], i = st.idx;
    const warmups = Math.min(M.warmups + (st.welcomeBack ? 1 : 0), Math.max(0, st.len - 2));
    if (i < warmups) return 'warmup';
    if (i === st.len - 1 && st.len >= 4) return 'finisher'; // end on a likely win
    if (st.F >= 0.55) return 'ease';
    if (st.forceChallenge) { st.forceChallenge = false; st.lastForced = true; return 'challenge'; }
    if (st.retryQueue.find((r) => r.at <= i)) return 'retry';
    if (st.B >= 0.55) return 'challenge';
    const role = M.plan[(i - warmups) % M.plan.length];
    if (role === 'review' && !masteredSkills(profile).length) return 'core';
    return role;
  }

  // Difficulty for a role right now: ability estimate, the learned
  // challenge dial, and the per-answer staircase.
  function targetB(st, profile, role) {
    const table = st.p || MODES[st.mode].p;
    const pTarget = table[role] || table.core;
    const steady = ['ease', 'warmup', 'finisher'].includes(role);
    const shift = profile.offset + st.stair;
    return bFor(profile.theta, pTarget) + (steady ? Math.min(shift, 4) : shift);
  }

  function nextSessionItem(st, profile) {
    const role = pickRole(st, profile);
    let b = targetB(st, profile, role);
    let skill, reason;

    if (role === 'retry') {
      const r = st.retryQueue.shift();
      skill = SK.byId[r.skill];
      b = Math.min(r.b - 2, b);
      reason = `Came back to ${skill.name.toLowerCase()} after a miss.`;
    } else if (role === 'review') {
      const pool = masteredSkills(profile);
      skill = pool.slice().sort((a, c) => (profile.skills[a.id]?.last || 0) - (profile.skills[c.id]?.last || 0))[Math.min(pool.length - 1, U.int(0, 1))];
      b = U.lerp(skill.lo, skill.hi, 0.6 + U.rand() * 0.4);
    } else {
      skill = chooseSkill(b, st.recent, profile);
    }
    if (role === 'ease') reason = st.consecWrong >= 2 ? 'Two misses in a row, so the next one is a confidence builder.' : 'Frustration signals rising, so the next one is a confidence builder.';
    if (role === 'challenge') reason = st.lastForced ? 'Asked for harder after a quick, unaided answer, so a challenge problem is up.' : 'Answers are fast and accurate, so a challenge problem is up.';
    st.lastForced = false;

    const item = SK.makeItem(skill, b);
    item.role = role;
    item.pBefore = P(profile.theta, item.b);
    // Tell the child when it's getting harder (never announce "easier").
    item.harder = st.lastB != null && item.b - st.lastB >= 3 && !['warmup', 'review', 'finisher', 'ease'].includes(role);
    st.lastB = item.b;
    if (reason) st.log.push({ i: st.idx, type: role === 'challenge' ? 'boost' : 'ease', text: reason });
    return item;
  }

  function recordSessionAnswer(st, profile, item, r) {
    const exp = expectedTime(item, profile);
    const t = Math.min(r.time, exp * 4); // idle time shouldn't swamp the model
    const ratio = r.time / exp;
    const p = P(profile.theta, item.b);
    const score = scoreOf(r, item, profile);
    const K = profile.sessions.length < 3 ? 4 : 2.5;
    const thetaBefore = profile.theta;
    profile.theta = U.clamp(profile.theta + K * 2 * (score - p), 0, 100);

    // Staircase: after every answer, move toward the mode's target.
    const outcome = r.correct && !r.skipped ? 1 : 0;
    const stairBefore = st.stair;
    st.stair = U.clamp(st.stair + STEP * (outcome - st.target), -12, 16);
    // A skip is a clear "too hard" signal: step down further.
    if (r.skipped) {
      st.stair = U.clamp(st.stair - 3, -12, 16);
      st.log.push({ i: st.idx, type: 'ease', text: 'Skipped, so the next problem steps down.' });
    }
    // Hot streaks turn it up faster (gently in "Take it easy").
    if (outcome && st.consecRight >= 2 && st.target <= 0.8) st.stair = Math.min(16, st.stair + 3 * (1 - st.target));

    if (r.correct && !r.hinted && r.time < exp * 4) {
      profile.speed = U.clamp(Math.exp(0.85 * Math.log(profile.speed || 1) + 0.15 * Math.log(Math.max(0.2, t / item.expected))), 0.5, 3);
    }

    const ks = skillStat(profile, item.skillId);
    ks.n++; if (r.correct) ks.correct++;
    ks.acc = ks.acc * 0.7 + (r.correct ? 0.3 : 0); ks.last = Date.now();

    // Engagement signals. In "Let's do this!" misses are expected, so they weigh less.
    const missW = st.target <= 0.6 ? 0.6 : st.target >= 0.9 ? 1.2 : st.target <= 0.72 ? 0.85 : 1;
    let F = st.F * 0.7, B = st.B * 0.72;
    const flags = [];
    const hardRole = ['stretch', 'challenge'].includes(item.role);
    if (r.skipped) { F += 0.3 * missW; flags.push('skipped'); }
    else if (!r.correct) {
      F += (hardRole ? 0.16 : 0.32) * missW;
      if (ratio < 0.3 && r.time < 4) { F += 0.15; flags.push('rapid guess'); }
    }
    if (r.hinted) { F += 0.08; flags.push('hint'); }
    if (r.time > 90) flags.push('long pause');
    if (r.correct && ratio > 2.5) { F += 0.1; flags.push('slow'); }
    if (r.correct && !r.hinted && ratio < 0.6 && item.role !== 'challenge') { B += 0.3; flags.push('fast'); }
    if (r.correct && ['warmup', 'review', 'ease', 'finisher'].includes(item.role) && ratio < 1) B += 0.12;
    if (r.correct && hardRole) { F -= 0.12; B -= 0.15; }

    st.consecWrong = r.correct ? 0 : st.consecWrong + 1;
    st.consecRight = r.correct ? st.consecRight + 1 : 0;
    if (st.consecWrong >= 2 && st.target > 0.6) F = Math.max(F, 0.6);
    if (st.consecWrong >= 3) F = Math.max(F, 0.6);
    if (st.consecRight >= 4 && ratio < 1) B = Math.max(B, 0.55);
    st.F = U.clamp(F, 0, 1); st.B = U.clamp(B, 0, 1);
    st.peakF = Math.max(st.peakF, st.F); st.peakB = Math.max(st.peakB, st.B);

    let retryQueued = false;
    if (!r.correct && item.role !== 'retry' && (!hardRole || st.mode === 'easy') && st.idx + 3 < st.len) {
      st.retryQueue.push({ skill: item.skillId, b: item.b, at: st.idx + 2 });
      retryQueued = true;
    }
    const aw = awardXP(profile, xpFor(item, r));
    st.xp += aw.xp;

    st.answers.push({
      i: st.idx, skill: item.skillId, role: item.role, b: U.fix(item.b, 1), p: U.fix(p, 2),
      correct: !!r.correct, skipped: !!r.skipped, hinted: !!r.hinted, time: U.fix(r.time, 1),
      expected: U.fix(exp, 1), F: U.fix(st.F, 2), B: U.fix(st.B, 2), theta: U.fix(profile.theta, 1),
      thetaBefore: U.fix(thetaBefore, 1), stair: U.fix(st.stair, 1), flags,
    });
    st.recent.push(item.skillId);
    st.idx++;
    // Did the answers after "Make it harder" back it up?
    st.harderChecks = st.harderChecks.filter((c) => {
      if (st.idx - c.at < 2) return true;
      const next = st.answers.slice(c.at, c.at + 2);
      const misses = next.filter((a) => !a.correct).length;
      const before = profile.harderTrust == null ? 1 : profile.harderTrust;
      if (misses === 2) profile.harderTrust = Math.max(0.3, before * 0.6);
      else if (misses === 1) profile.harderTrust = Math.max(0.3, before * 0.85);
      else profile.harderTrust = Math.min(1, before + 0.1);
      profile.harderTrust = U.fix(profile.harderTrust, 3);
      if (misses === 2) st.log.push({ i: c.at + 1, type: 'ease', text: 'Both answers after "Make it harder" were misses, so the button counts for less next time.' });
      else if (misses === 0 && before < 1) st.log.push({ i: c.at + 1, type: 'info', text: 'Answers after "Make it harder" backed it up, so the button earns back trust.' });
      return false;
    });
    return { F: st.F, B: st.B, score, xp: aw.xp, levelUp: aw.levelUp, retryQueued, streak: st.consecRight, stairUp: st.stair > stairBefore };
  }

  function sessionDone(st) { return st.idx >= st.len; }

  /* "Make it harder" (offered only right after a correct answer). Its
     weight depends on how that answer went, scaled by how well past
     requests were backed up by the answers that followed. */
  function requestHarder(st, profile) {
    const a = st.answers[st.answers.length - 1];
    if (!a || !a.correct || a.askedHarder || st.idx >= st.len) return null;
    const ratio = a.time / a.expected;
    const trust = profile.harderTrust == null ? 1 : profile.harderTrust;
    let kind, step;
    if (!a.hinted && ratio < 0.8) { kind = 'big'; step = 6; if (trust >= 0.6) st.forceChallenge = true; }
    else if (!a.hinted && ratio < 1.5) { kind = 'medium'; step = 3.5; }
    else { kind = 'small'; step = 1.5; }
    const applied = U.fix(step * trust, 2);
    st.stair = U.clamp(st.stair + applied, -12, 16);
    st.B = Math.max(0, st.B - 0.2); // the ask itself addresses boredom
    a.askedHarder = kind;
    st.harderChecks.push({ at: st.idx });
    const why = kind === 'big' ? 'fast, no hint: big step up' + (st.forceChallenge ? ' and a challenge next' : '')
      : kind === 'medium' ? 'normal pace: medium step up' : (a.hinted ? 'used a hint' : 'slow answer') + ': small step up';
    st.log.push({ i: a.i, type: 'boost', text: `Asked to make it harder (${why}${trust < 1 ? `, trust ${Math.round(trust * 100)}%` : ''}).` });
    return { kind, step: applied };
  }

  // Close a session (finished or abandoned) and adapt for next time.
  function finishSession(st, profile, opts) {
    opts = opts || {};
    const now = opts.now || Date.now();
    const answered = st.answers.filter((a) => !a.skipped);
    const nCorrect = st.answers.filter((a) => a.correct).length;
    const acc = st.answers.length ? nCorrect / st.answers.length : 0;
    const completed = !!opts.completed;
    const feel = opts.feel || null;
    const changes = [];

    if (st.answers.length === 0 && !completed) return null; // opened and closed, nothing to learn

    // Carry part of the in-session staircase into the ability estimate
    // so the next session starts where this one ended.
    if (Math.abs(st.stair) > 2) {
      const carry = st.stair * 0.35;
      profile.theta = U.clamp(profile.theta + carry, 0, 100);
      changes.push(carry > 0 ? 'Next session starts a notch harder' : 'Next session starts a notch easier');
    }

    // Challenge dial: engagement preference, separate from ability.
    let dOff = 0;
    if (!completed) dOff -= st.peakF > 0.5 || acc < st.target - 0.2 ? 3 : 1.5;
    else if (feel === 'hard') dOff -= 2;
    else if (feel === 'easy') dOff += 2;
    else if (acc >= st.target + 0.15 && st.peakB >= 0.5) dOff += 1.5;
    else if (feel === 'right') dOff += (0 - profile.offset) * 0.15;
    profile.offset = U.fix(U.clamp(profile.offset + dOff, -10, 10), 2);
    if (Math.abs(dOff) >= 1) changes.push(dOff > 0 ? 'Challenge dial up' : 'Challenge dial down');

    // Grade-row nudge: the child's own signals move their targets up to one
    // grade row harder or gentler than their enrolled grade.
    const beforeN = profile.nudge || 0;
    const rowDown = !completed || feel === 'hard' || acc < st.target - 0.15;
    const rowUp = !rowDown && (feel === 'easy' || (acc >= st.target + 0.1 && st.peakB >= 0.5) || st.answers.filter((a) => a.askedHarder === 'big').length >= 2);
    if (rowDown) profile.nudge = U.fix(U.clamp(beforeN - 1 / 3, -1, 1), 3);
    else if (rowUp) profile.nudge = U.fix(U.clamp(beforeN + 1 / 3, -1, 1), 3);
    if (profile.nudge !== beforeN) changes.push(`Success targets ${profile.nudge > beforeN ? 'one step harder' : 'one step gentler'} (${nudgeLabel(profile)})`);

    let levelUp = 0;
    if (completed) { const aw = awardXP(profile, XP.session); st.xp += aw.xp; levelUp = aw.levelUp; }
    const rec = {
      xp: st.xp, levelUp, mode: st.mode, target: st.target, grade: profile.grade, nudge: profile.nudge || 0,
      harderAsks: st.answers.filter((a) => a.askedHarder).length,
      id: st.id, start: st.start, end: now, completed, feel, planned: st.len,
      n: st.answers.length, correct: nCorrect, acc: U.fix(acc, 3),
      avgRatio: U.fix(U.mean(answered.map((a) => a.time / a.expected)), 2),
      peakF: U.fix(st.peakF, 2), peakB: U.fix(st.peakB, 2),
      eases: st.log.filter((l) => l.type === 'ease').length,
      boosts: st.log.filter((l) => l.type === 'boost').length,
      ups: st.answers.filter((a, i) => i > 0 && a.b - st.answers[i - 1].b >= 3).length,
      theta: U.fix(profile.theta, 2), offset: profile.offset, answers: st.answers, log: st.log, changes,
    };
    rec.story = narrative(rec);
    profile.sessions.push(rec);
    profile.history.push({ t: now, theta: profile.theta, kind: 'session' });
    return rec;
  }

  /* ---------------- Positive session story ---------------- */
  function narrative(rec) {
    const as = rec.answers || [];
    if (!as.length) return '';
    const pick = (arr) => arr[Math.floor(U.rand() * arr.length)];
    const nm = (id) => SK.byId[id].name.toLowerCase();
    const join = (xs) => xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1];
    const counts = {}; as.forEach((a) => { counts[a.skill] = (counts[a.skill] || 0) + 1; });
    const top = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 3);
    let best = 0, run = 0; as.forEach((a) => { run = a.correct ? run + 1 : 0; best = Math.max(best, run); });
    const ups = as.filter((a, i) => i > 0 && a.b - as[i - 1].b >= 3).length;
    const hardWins = as.filter((a) => a.correct && (a.role === 'stretch' || a.role === 'challenge')).length;
    const tried = as.filter((a) => !a.skipped).length;
    const retryWin = as.find((a) => a.role === 'retry' && a.correct);
    const misses = {}; as.forEach((a) => { if (!a.correct) misses[a.skill] = (misses[a.skill] || 0) + 1; });
    const toughest = Object.keys(misses).sort((a, b) => misses[b] - misses[a])[0];
    const out = [];
    out.push(pick(['What a session! 🌟', 'You worked so hard today! 💪', 'Your math brain was on fire today! 🔥', 'Wow, look at you go! 🚀']));
    const mode = { easy: 'You warmed up your math muscles with', balanced: 'You mixed easy and tricky problems in', stretch: 'You took on big challenges in' }[rec.mode] || 'You practiced';
    out.push(`${mode} ${join(top.map(nm))}, and you tried ${tried} problem${tried === 1 ? '' : 's'}.`);
    if (best >= 3) out.push(`You hit a streak of ${best} in a row!`);
    if (ups) out.push(`You got so good that the problems leveled up ${ups === 1 ? 'once' : ups + ' times'}. That’s what growing looks like!`);
    if (hardWins) out.push(`You cracked ${hardWins} tricky-on-purpose problem${hardWins > 1 ? 's' : ''}. That’s tough stuff!`);
    if (retryWin) out.push(`You came back to ${nm(retryWin.skill)} and nailed it on the second try. That’s how champions learn!`);
    else if (toughest) out.push('Every tricky problem you tried made your brain a little stronger.');
    if (!rec.completed) out.push('Taking a break when you need one is smart, too.');
    if (toughest) out.push(`Next time, Pip will bring back more ${nm(toughest)} so it gets easier and easier.`);
    out.push(pick(['Pip is so proud of you! 💜', 'Keep being awesome! ⭐', 'See you next time, math star! 🌈']));
    return out.join(' ');
  }

  /* ---------------- Engagement health (for grown-ups) ---------------- */

  function health(profile, now) {
    now = now || Date.now();
    const recent = profile.sessions.slice(-5);
    if (!profile.placed) return { status: 'new', label: 'Not placed yet', detail: 'Start with the placement check-in.' };
    if (recent.length < 2) return { status: 'new', label: 'Getting to know them', detail: 'A couple more sessions and the signals will settle.' };
    const quitRate = recent.filter((s) => !s.completed).length / recent.length;
    const acc = U.mean(recent.map((s) => s.acc));
    const F = U.mean(recent.map((s) => s.peakF));
    const B = U.mean(recent.map((s) => s.peakB));
    const hard = recent.filter((s) => s.feel === 'hard').length, easy = recent.filter((s) => s.feel === 'easy').length;
    const gap = daysSinceLast(profile, now);
    const target = U.mean(recent.map((s) => s.target || 0.75));
    const m = { quitRate, acc, F, B, gap, hard, easy };
    if (quitRate >= 0.4 || acc < target - 0.18 || hard >= 2)
      return { status: 'struggling', label: 'Drop-off risk: too hard', detail: `${Math.round(quitRate * 100)}% of recent sessions ended early and accuracy is ${Math.round(acc * 100)}%. Difficulty is easing; consider fewer questions or "Take it easy".`, m };
    if ((acc > target + 0.14 && B > 0.45) || easy >= 2)
      return { status: 'bored', label: 'Coasting: too easy', detail: `Accuracy ${Math.round(acc * 100)}% with fast answers. The challenge dial is rising to add stretch.`, m };
    if (gap >= 5)
      return { status: 'lapsing', label: 'Drifting away', detail: `No session in ${Math.round(gap)} days. The next one opens with extra warm-ups.`, m };
    return { status: 'flow', label: 'In the zone', detail: `Accuracy ${Math.round(acc * 100)}% against a ${Math.round(target * 100)}% target, with few early exits.`, m };
  }

  MP.Engine = {
    S, P, bFor, MODES, ROLE_LABEL, ROLE_SHORT, XP, levelInfo, awardXP, newProfile, expectedTime,
    startPlacement, nextPlacementItem, recordPlacement, placementDone, finishPlacement, placementSE,
    startSession, nextSessionItem, recordSessionAnswer, sessionDone, finishSession, health, masteredSkills, narrative,
    requestHarder, targetsFor, modeSpec, nudgeLabel, GRADE_TARGETS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
