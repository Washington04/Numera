/* Simulated learners. Used for the sample "demo" profile and for tests.
   A simulated learner has a true ability that the engine never sees. */
(function (root) {
  const MP = (root.MP = root.MP || {});
  const U = MP.U, E = MP.Engine;

  function gauss() { let u = 0, v = 0; while (!u) u = U.rand(); while (!v) v = U.rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  function answer(learner, item) {
    const p = U.logistic((learner.ability - item.b) / 6);
    const correct = U.rand() < p;
    const time = item.expected * learner.pace * Math.exp(gauss() * 0.3) * (correct ? 1 : 1.3);
    return { correct, time, hinted: !correct && U.chance(learner.hintRate || 0), skipped: false };
  }

  function runPlacement(profile, learner) {
    const st = E.startPlacement(profile);
    while (!E.placementDone(st)) {
      const item = E.nextPlacementItem(st, profile);
      E.recordPlacement(st, profile, item, answer(learner, item));
    }
    return E.finishPlacement(st, profile);
  }

  // quitAtF: the learner walks away if frustration passes this level.
  function runSession(profile, learner, opts) {
    opts = opts || {};
    const st = E.startSession(profile, opts.start, { mode: opts.mode, len: opts.len });
    let quit = false;
    while (!E.sessionDone(st)) {
      const item = E.nextSessionItem(st, profile);
      E.recordSessionAnswer(st, profile, item, answer(learner, item));
      if (opts.quitAtF != null && st.F > opts.quitAtF && U.chance(0.6)) { quit = true; break; }
    }
    const acc = st.answers.filter((a) => a.correct).length / Math.max(1, st.answers.length);
    const feel = quit ? null : acc > 0.95 ? 'easy' : acc < 0.35 ? 'hard' : 'right';
    return E.finishSession(st, profile, { completed: !quit, feel, now: (opts.start || Date.now()) + st.answers.reduce((s, a) => s + a.time, 0) * 1000 });
  }

  // A realistic sample learner: placed a little too high, has one rough
  // session, then the dial and length adjust and they settle into the zone.
  function demoProfile(now) {
    now = now || Date.now();
    U.seed(20260911);
    const p = E.newProfile('Sam (sample)', '2', 5);
    p.demo = true;
    p.created = now - 12 * 864e5;
    p.history[0].t = p.created;
    const learner = { ability: 41, pace: 1.2, hintRate: 0.1 };
    runPlacement(p, learner);
    p.placedAt = p.created + 60e3;
    p.history[p.history.length - 1].t = p.placedAt;
    const days = [11, 10, 9, 8, 6, 5, 4, 2, 1, 0.2];
    days.forEach((dAgo, i) => {
      if (i === 2) learner.ability -= 9; // a rough day
      if (i === 3) learner.ability += 9;
      learner.ability += 0.6; // steady growth
      runSession(p, learner, { start: now - dAgo * 864e5, quitAtF: i < 4 ? 0.62 : 0.8, mode: ['balanced', 'balanced', 'stretch', 'easy', 'balanced', 'balanced', 'stretch', 'balanced', 'balanced', 'stretch'][i] });
    });
    U.unseed();
    return p;
  }

  MP.Sim = { answer, runPlacement, runSession, demoProfile };
})(typeof window !== 'undefined' ? window : globalThis);
