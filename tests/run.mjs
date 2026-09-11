// Engine tests with simulated learners. Run: node tests/run.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const ctx = vm.createContext({ console, Math, Date });
for (const f of ['util.js', 'skills.js', 'engine.js', 'sim.js']) {
  vm.runInContext(fs.readFileSync(path.join(dir, '..', 'js', f), 'utf8'), ctx, { filename: f });
}
const { U, Skills: SK, Engine: E, Sim } = ctx.MP;

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('  FAIL', msg); } };
const section = (s) => console.log('\n' + s);

section('1. Every generator produces valid, self-consistent problems');
U.seed(1);
for (const s of SK.list) {
  for (let i = 0; i < 400; i++) {
    const d = i / 399;
    const it = SK.makeItem(s, s.lo + d * (s.hi - s.lo));
    const where = `${s.id} d=${d.toFixed(2)}`;
    ok(it.prompt && it.hint && it.explain, `${where} missing text`);
    ok(!/NaN|undefined|Infinity/.test(JSON.stringify(it)), `${where} bad value ${JSON.stringify(it).slice(0, 200)}`);
    if (it.kind === 'int') ok(Number.isInteger(it.answer) && it.answer >= 0, `${where} int answer ${it.answer}`);
    if (it.kind === 'dec') ok(typeof it.answer === 'number' && it.answer >= 0, `${where} dec answer`);
    if (it.kind === 'choice') ok(it.choices.includes(it.answer), `${where} choice`);
    if (it.kind === 'frac') ok(it.answer.d > 0 && it.answer.n > 0, `${where} frac ${JSON.stringify(it.answer)}`);
    // The checker accepts the stated answer.
    const input = it.kind === 'frac' ? { n: String(it.answer.n), d: String(it.answer.d) } : it.kind === 'choice' ? it.answer : SK.answerText(it);
    ok(SK.checkAnswer(it, input), `${where} checker rejects its own answer ${SK.answerText(it)}`);
    ok(Array.isArray(it.wb) && it.wb.length >= 2 && it.wb.every((st) => st && st.t), `${where} whiteboard steps`);
    for (const st of it.wb || []) {
      if (st.t === 'say' || st.t === 'eq') {
        ok(typeof st.s === 'string' && st.s.length > 0, `${where} empty wb text`);
        ok((st.s.match(/\{/g) || []).length === (st.s.match(/\}/g) || []).length, `${where} unbalanced colour tokens: ${st.s}`);
        ok((st.s.match(/\[/g) || []).length === (st.s.match(/\]/g) || []).length, `${where} unbalanced fraction tokens: ${st.s}`);
      }
      if (st.t === 'line') ok(st.max > st.min && st.hops.every((h) => h.from >= st.min && h.from <= st.max && h.to >= st.min && h.to <= st.max) && st.marks.every((m) => m.v >= st.min && m.v <= st.max), `${where} number line out of range ${JSON.stringify(st)}`);
      if (st.t === 'bars') ok(st.bars.every((b) => b.fills.reduce((x, f) => x + f.n, 0) <= b.parts), `${where} bar overfilled`);
      if (st.t === 'column' && st.op === '−') ok(st.top >= st.bottom, `${where} column negative`);
    }
    if (it.column) {
      const { top, bottom, op } = it.column;
      const v = op === '+' ? top + bottom : op === '−' ? top - bottom : top * bottom;
      ok(v === it.answer, `${where} column math ${top}${op}${bottom}=${it.answer}`);
    }
  }
}
// Fraction checker: equivalents accepted unless simplest form required.
ok(SK.checkAnswer({ kind: 'frac', answer: { n: 1, d: 2 } }, { n: '2', d: '4' }), 'equivalent fraction accepted');
ok(!SK.checkAnswer({ kind: 'frac', answer: { n: 1, d: 2 }, requireSimplest: true }, { n: '2', d: '4' }), 'simplest form enforced');
ok(SK.checkAnswer({ kind: 'dec', answer: 0.3 }, '0.30'), 'decimal trailing zero accepted');
console.log('  done');

section('2. Placement finds true ability (400 simulated learners)');
U.seed(7);
const errs = [], lens = [];
for (let i = 0; i < 400; i++) {
  const trueA = 5 + U.rand() * 90;
  const grade = SK.gradeFor(trueA + (U.rand() - 0.5) * 30); // parents guess the grade roughly
  const p = E.newProfile('t', grade);
  const st = E.startPlacement(p);
  while (!E.placementDone(st)) { const it = E.nextPlacementItem(st, p); E.recordPlacement(st, p, it, Sim.answer({ ability: trueA, pace: 1 }, it)); }
  E.finishPlacement(st, p);
  errs.push(Math.abs(p.theta - trueA)); lens.push(st.n);
}
const mae = U.mean(errs), p90 = errs.sort((a, b) => a - b)[Math.floor(errs.length * 0.9)];
console.log(`  mean abs error ${mae.toFixed(1)} pts, 90th pct ${p90.toFixed(1)} pts, avg ${U.mean(lens).toFixed(1)} questions (a grade band is ~12-15 pts)`);
ok(mae < 7, 'placement mean error under 7 points');

section('3. Each mode lands near its grade-based target; perfect sessions are rare');
for (const grade of ['K', '2', '5']) {
  for (const mode of ['easy', 'balanced', 'stretch']) {
    U.seed(11);
    const accs = [], targets = [], perfect = [];
    for (let i = 0; i < 150; i++) {
      const band = SK.GRADES.find((g) => g.g === grade);
      const a = band.start + U.rand() * 8;
      const p = E.newProfile('t', grade); p.theta = a; p.placed = true;
      const L = { ability: a, pace: 1 };
      for (let s = 0; s < 6; s++) {
        const r = Sim.runSession(p, L, { mode, len: 10 });
        accs.push(r.acc); targets.push(r.target); perfect.push(r.correct === r.n ? 1 : 0);
        L.ability += 0.5;
      }
    }
    const t = U.mean(targets), got = U.mean(accs);
    console.log(`  grade ${grade}  ${E.MODES[mode].label.padEnd(24)} target ${(t * 100).toFixed(0)}%  got ${(got * 100).toFixed(1)}%  perfect ${(U.mean(perfect) * 100).toFixed(1)}%`);
    ok(Math.abs(got - t) < 0.06, `grade ${grade} ${mode} accuracy near target`);
    if (t <= 0.72) ok(U.mean(perfect) < 0.05, `grade ${grade} ${mode} perfect sessions rare`);
  }
}
{
  const t = (g, n) => E.targetsFor({ grade: g, nudge: n });
  ok(t('K', 0).stretch === 0.75 && t('5', 0).stretch === 0.5, 'grade table endpoints');
  ok(t('2', 1).stretch === t('3', 0).stretch && t('2', -1).stretch === t('1', 0).stretch, 'nudge moves one grade row');
  ok(t('K', -1).stretch === 0.75 && t('5', 1).stretch === 0.5, 'nudge clamps at the table edges');
}

section('3a. "Make it harder": trusted when backed up, discounted when not');
{
  // Bored learner (15 pts better than estimated, fast) presses after quick right answers.
  U.seed(41);
  const gainWith = [], gainWithout = [];
  for (const press of [true, false]) {
    for (let i = 0; i < 200; i++) {
      const a = 40 + U.rand() * 40;
      const p = E.newProfile('t', '3'); p.theta = a - 15; p.placed = true;
      const st = E.startSession(p, null, { mode: 'balanced', len: 10 });
      while (!E.sessionDone(st)) {
        const it = E.nextSessionItem(st, p);
        const r = Sim.answer({ ability: a, pace: 0.6 }, it);
        E.recordSessionAnswer(st, p, it, r);
        if (press && r.correct) E.requestHarder(st, p);
      }
      (press ? gainWith : gainWithout).push(U.mean(st.answers.slice(2).map((x) => x.b)) - (a - 15));
    }
  }
  console.log(`  bored learner: problems after Q2 averaged ${U.mean(gainWithout).toFixed(1)} pts above the starting estimate without presses, ${U.mean(gainWith).toFixed(1)} with`);
  ok(U.mean(gainWith) > U.mean(gainWithout) + 3, 'presses raise difficulty faster for a bored learner');

  // Over-confident learner (10 pts weaker than estimated) presses after every right answer.
  U.seed(42);
  const trusts = [], accs = [];
  for (let i = 0; i < 200; i++) {
    const a = 30 + U.rand() * 40;
    const p = E.newProfile('t', '3'); p.theta = a + 10; p.placed = true;
    for (let s = 0; s < 4; s++) {
      const st = E.startSession(p, null, { mode: 'balanced', len: 10 });
      while (!E.sessionDone(st)) {
        const it = E.nextSessionItem(st, p);
        const r = Sim.answer({ ability: a, pace: 1.4 }, it);
        E.recordSessionAnswer(st, p, it, r);
        if (r.correct) E.requestHarder(st, p);
      }
      const rec = E.finishSession(st, p, { completed: true });
      if (s === 3) accs.push(rec.acc);
    }
    trusts.push(p.harderTrust);
  }
  console.log(`  over-confident learner: button trust after 4 sessions ${(U.mean(trusts) * 100).toFixed(0)}%, accuracy in session 4 ${(U.mean(accs) * 100).toFixed(0)}% (target 75%)`);
  ok(U.mean(trusts) < 0.8, 'trust drops when presses are not backed up');
  ok(U.mean(accs) > 0.55, 'over-confident learner is not crushed');
}

section('3b. A learner who is better than we think: difficulty climbs within the session');
{
  U.seed(12);
  const firstHalf = [], secondHalf = [], perfect = [];
  for (let i = 0; i < 300; i++) {
    const a = 40 + U.rand() * 45;
    const p = E.newProfile('t', 'K'); p.theta = a - 20; p.placed = true;
    const r = Sim.runSession(p, { ability: a, pace: 0.8 }, { mode: 'balanced', len: 10 });
    const bs = r.answers.map((x) => x.b);
    firstHalf.push(U.mean(bs.slice(1, 4))); secondHalf.push(U.mean(bs.slice(5, 9)));
    perfect.push(r.correct === r.n ? 1 : 0);
  }
  console.log(`  first session, placed 20 pts too low: item difficulty Q2-4 avg ${U.mean(firstHalf).toFixed(1)} -> Q6-9 avg ${U.mean(secondHalf).toFixed(1)}; perfect sessions ${(U.mean(perfect) * 100).toFixed(0)}%`);
  ok(U.mean(secondHalf) - U.mean(firstHalf) > 8, 'difficulty rises within one session');
}

section('4. Mis-placed too high: controller eases off, learner keeps going');
U.seed(21);
function scenario(gap, withController, frozen) {
  const res = { quits: 0, acc: [], eases: 0, sessions: 0, finalGap: [] };
  for (let i = 0; i < 150; i++) {
    const a = 20 + U.rand() * 60;
    const p = E.newProfile('t', 'K'); p.theta = a + gap; p.placed = true;
    const L = { ability: a, pace: 1 };
    for (let s = 0; s < 5; s++) {
      if (!withController) p.offset = 0;
      const st = E.startSession(p, null, { mode: 'balanced', len: 10 });
      let quit = false;
      while (!E.sessionDone(st)) {
        if (!withController) { st.F = 0; st.B = 0; st.retryQueue = []; }
        if (frozen) st.stair = 0;
        const it = E.nextSessionItem(st, p);
        E.recordSessionAnswer(st, p, it, Sim.answer(L, it));
        if (frozen) p.theta = a + gap; // fixed level: what a static app does
        // Same quit rule in all arms, based only on what the child experiences.
        if (st.consecWrong >= 2 && U.chance(0.35)) { quit = true; break; }
      }
      if (frozen) st.stair = 0;
      const r = E.finishSession(st, p, { completed: !quit });
      if (frozen) p.theta = a + gap;
      if (!r) continue;
      res.sessions++; if (quit) res.quits++; res.acc.push(r.acc); res.eases += r.eases;
    }
    res.finalGap.push(p.theta - a);
  }
  return res;
}
const on = scenario(15, true), off = scenario(15, false), fixed = scenario(15, false, true);
console.log(`  full Numera:            quit rate ${(on.quits / on.sessions * 100).toFixed(0)}%, accuracy ${(U.mean(on.acc) * 100).toFixed(0)}%, estimate gap after 5 sessions ${U.mean(on.finalGap).toFixed(1)} pts`);
console.log(`  no engagement controller: quit rate ${(off.quits / off.sessions * 100).toFixed(0)}%, accuracy ${(U.mean(off.acc) * 100).toFixed(0)}%`);
console.log(`  fixed level (static app): quit rate ${(fixed.quits / fixed.sessions * 100).toFixed(0)}%, accuracy ${(U.mean(fixed.acc) * 100).toFixed(0)}%`);
ok(on.quits / on.sessions <= off.quits / off.sessions + 0.02, 'controller does not increase quits');
ok(off.quits / off.sessions < fixed.quits / fixed.sessions, 'adaptive beats fixed level');

section('5. Bored learner (placed too low): difficulty lifts');
U.seed(31);
const liftGap = [], challenge = [];
for (let i = 0; i < 150; i++) {
  const a = 30 + U.rand() * 55;
  const p = E.newProfile('t', 'K'); p.theta = a - 18; p.placed = true;
  const L = { ability: a, pace: 0.5 };
  for (let s = 0; s < 4; s++) { const r = Sim.runSession(p, L, { mode: 'balanced', len: 10 }); challenge.push(r.boosts); }
  liftGap.push(a - p.theta);
}
console.log(`  gap closed from 18 to ${U.mean(liftGap).toFixed(1)} pts in 4 sessions; ${U.mean(challenge).toFixed(1)} challenge boosts/session`);
ok(U.mean(liftGap) < 9, 'bored learner lifted');

section('6. Levels only go up and start at 1');
{
  ok(E.levelInfo(0).level === 1, 'level starts at 1');
  const p = E.newProfile('t', '5'); p.theta = 95; p.placed = true;
  ok(E.levelInfo(p.xp).level === 1, 'strong learner still starts at level 1');
  let prev = 1, drops = 0;
  const L = { ability: 60, pace: 1 };
  for (let s = 0; s < 20; s++) { Sim.runSession(p, L, { quitAtF: 0.7 }); const lv = E.levelInfo(p.xp).level; if (lv < prev) drops++; prev = lv; }
  ok(drops === 0, 'level never decreases');
  console.log(`  after 20 sessions: level ${prev}, ${p.xp} XP`);
}

section('7. Demo profile builds');
const demo = Sim.demoProfile(Date.now());
console.log(`  ${demo.sessions.length} sessions, ${demo.sessions.filter((s) => !s.completed).length} ended early, level ${E.levelInfo(demo.xp).level}, health: ${E.health(demo).label}`);
ok(demo.sessions.length >= 8, 'demo has sessions');

console.log(fails ? `\n${fails} FAILURES` : '\nAll checks passed');
process.exit(fails ? 1 : 0);
