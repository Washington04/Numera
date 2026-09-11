/* Numera UI. Plain DOM, no framework, so it runs from a double-clicked file. */
(function (root) {
  const MP = root.MP, U = MP.U, SK = MP.Skills, E = MP.Engine, Store = MP.Store, FX = MP.FX, WB = MP.Whiteboard;
  const app = document.getElementById('app');

  /* ---------- tiny DOM helpers ---------- */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const svgNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(svgNS, tag);
    for (const k in attrs || {}) if (attrs[k] != null) el.setAttribute(k, attrs[k]);
    for (const c of kids.flat(Infinity)) if (c != null) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  const raw = (html, cls) => h('span', { class: cls || null, html });
  const pipEl = (p, mood, size, cls) => raw(FX.pip({ color: p.color, look: p.look, mood, size, cls }), 'pipwrap');

  /* ---------- data + migration ---------- */
  const COLORS = ['#FF6B6B', '#FF9F43', '#FFC53D', '#3DDC97', '#4DABF7', '#9775FA', '#F783AC', '#20C997'];
  const A = {
    data: Store.load(), screen: 'profiles', pid: null,
    mode: null, run: null, item: null, input: null, t0: 0, hiddenMs: 0, hiddenAt: null,
    hinted: false, showHint: false, fb: null, placeResult: null, lastRec: null,
    form: { name: '', grade: '2', color: COLORS[4], look: 'sprout', editId: null }, confirmDelete: false, confirmRemove: null, advanceTimer: null, pendingLevel: 0,
  };
  function migrate(p) {
    if (typeof p.color !== 'string') p.color = COLORS[(Number(p.color) || 4) % COLORS.length];
    if (p.xp == null) p.xp = p.sessions.reduce((t, x) => t + x.answers.reduce((a, q) => a + (q.correct ? 10 : 3), 0) + (x.completed ? 25 : 0), p.placed ? 20 : 0);
    if (!p.mode || !E.MODES[p.mode]) p.mode = 'balanced';
    if (!p.qCount) p.qCount = 10;
    if (!p.look) p.look = 'sprout';
    if (p.nudge == null) p.nudge = 0;
    if (p.harderTrust == null) p.harderTrust = 1;
    delete p.targetP; delete p.lenMode; delete p.len;
  }
  A.data.settings = A.data.settings || { sound: true };
  if (!A.data.seededDemo) { A.data.profiles.push(MP.Sim.demoProfile(Date.now())); A.data.seededDemo = true; }
  A.data.profiles.forEach(migrate);
  FX.Sound.on = A.data.settings.sound !== false;
  Store.save(A.data);

  const profile = () => A.data.profiles.find((p) => p.id === A.pid);
  const save = () => Store.save(A.data);
  function go(screen) { clearTimeout(A.advanceTimer); A.screen = screen; A.confirmDelete = false; render(); window.scrollTo(0, 0); }
  function toast(msg) { const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), 2400); }
  const firstName = (p) => p.name.replace(' (sample)', '');

  /* ---------- copy ---------- */
  const PRAISE = ['Great job! 🎉', 'Right again! ⭐', 'Well done! 🌟', 'Awesome! 🚀', 'You got it! 🙌', 'Nailed it! 🎯', 'Brilliant! ✨', 'Super smart! 🧠', 'Way to go! 🥳', 'Fantastic! 💫', 'High five! ✋', 'Math star! ⭐', 'Boom! Correct! 💥', 'Yes! You did it! 🎈', 'Amazing work! 🌈', 'Wow, look at you! 🤩'];
  const PRAISE_SUB = ['Your brain is growing!', 'Keep it rolling!', 'Pip is doing a happy dance!', 'Quick thinking!', 'That was sharp.', 'You make it look easy.', 'On to the next one!'];
  const HARD_PRAISE = ['You beat a challenge! 🏆', 'Tough one, and you got it! 🤩', 'Challenge crushed! 💪', 'Whoa, that was a hard one! 🚀'];
  const CLOSE = ['So close! 💪', 'Almost! 🌱', 'Good try! 🌟', 'Nice effort! 🙌'];
  const GREET = ['Ready for some math magic?', 'Let’s grow that brain!', 'I saved some fun problems for you.', 'Let’s see what you can do today!', 'Math time! I’m so excited.'];
  const lastPick = {};
  function pickFresh(key, arr) { let x; do { x = U.pick(arr); } while (arr.length > 1 && x === lastPick[key]); lastPick[key] = x; return x; }

  const ROLE_BADGE = {
    warmup: ['You got this!', 'good'], ease: ['You got this!', 'good'], finisher: ['You got this!', 'good'],
    review: ['Remember this one?', 'sky'], core: null,
    stretch: ['Stretch: tricky on purpose', 'grape'], challenge: ['Challenge: a tough one', 'sun'], retry: ['Second try', 'pink'],
  };

  /* ---------- shared pieces ---------- */
  function brand() {
    return h('button', { class: 'brand', onclick: () => { A.pid = null; go('profiles'); }, 'aria-label': 'Numera home' },
      h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, raw(FX.pip({ color: '#4DABF7', mood: 'idle', size: 34 }))),
      h('span', null, 'Num', h('b', null, 'era')),
      h('span', { class: 'beta-tag' }, 'Beta'));
  }
  function soundBtn() {
    return h('button', { class: 'iconbtn', 'aria-label': FX.Sound.on ? 'Turn sound off' : 'Turn sound on', title: 'Sound', onclick: () => { FX.Sound.on = !FX.Sound.on; A.data.settings.sound = FX.Sound.on; save(); render(); if (FX.Sound.on) FX.play('tap'); } }, FX.Sound.on ? '🔊' : '🔇');
  }
  function topbar(...right) { return h('header', { class: 'top' }, brand(), h('div', { class: 'row tight' }, ...right)); }

  function ring(p, size) {
    const L = E.levelInfo(p.xp);
    const r = 44, c = 2 * Math.PI * r;
    const id = 'rg' + Math.random().toString(36).slice(2, 7);
    return h('div', { class: 'ring', style: { width: size + 'px', height: size + 'px' }, 'aria-label': `Level ${L.level}, ${L.into} of ${L.need} XP to the next level` },
      s('svg', { viewBox: '0 0 110 110', width: size, height: size },
        s('defs', null, s('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 1 }, s('stop', { offset: 0, 'stop-color': '#8B5CF6' }), s('stop', { offset: 1, 'stop-color': '#FF4D8D' }))),
        s('circle', { cx: 55, cy: 55, r, class: 'ring-track' }),
        s('circle', { cx: 55, cy: 55, r, class: 'ring-fill', stroke: `url(#${id})`, 'stroke-dasharray': `${c * L.pct} ${c}`, transform: 'rotate(-90 55 55)' })),
      h('div', { class: 'ring-label' }, h('small', null, 'Level'), h('b', null, L.level), h('span', null, `${L.into}/${L.need} XP`)));
  }

  function currentSkill(p) { return SK.list.find((sk) => p.theta >= sk.lo && p.theta <= sk.hi) || SK.list[SK.list.length - 1]; }
  function relDay(t) { const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d + ' days ago'; }

  function pathMap(p) {
    const cur = currentSkill(p).index, N = SK.list.length;
    const from = Math.max(0, Math.min(cur - 2, N - 5)), to = Math.min(N - 1, from + 4);
    const stops = [];
    for (let i = from; i <= to; i++) {
      const sk = SK.list[i];
      const state = i < cur ? 'done' : i === cur ? 'now' : 'next';
      stops.push(h('div', { class: 'stop ' + state, role: 'listitem' },
        h('span', { class: 'here' + (state === 'now' ? '' : ' ghost') }, state === 'now' ? 'You are here' : '·'),
        h('span', { class: 'dot', style: { '--c': sk.color } }, state === 'done' ? '✓' : state === 'now' ? '★' : ''),
        h('span', { class: 'name' }, sk.name)));
    }
    return h('div', { class: 'path', role: 'list', 'aria-label': 'Your math path' }, stops);
  }

  function mathText(str) {
    const out = [];
    const re = /(\d+|\?)\/(\d+|\?)|\?/g;
    let last = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > last) out.push(str.slice(last, m.index));
      if (m[1]) { const part = (x) => h('span', { class: x === '?' ? 'q' : null }, x); out.push(h('span', { class: 'fr' }, part(m[1]), part(m[2]))); }
      else out.push(h('span', { class: 'q' }, '?'));
      last = re.lastIndex;
    }
    if (last < str.length) out.push(str.slice(last));
    return out;
  }

  /* ---------- profiles ---------- */
  function screenProfiles() {
    const ps = A.data.profiles;
    return h('div', { class: 'wrap stack' },
      topbar(soundBtn()),
      h('div', { class: 'hero-title' }, h('h1', null, 'Choose your profile'), h('p', { class: 'muted' }, 'Each player keeps their own level, path and progress on this device.'), h('p', { class: 'muted small' }, '🔒 No accounts, no uploads. Nothing here ever leaves this device.')),
      h('div', { class: 'players' },
        ps.map((p) => {
          const L = E.levelInfo(p.xp), last = p.sessions[p.sessions.length - 1];
          return h('div', { class: 'player glass' },
            h('button', { class: 'player-main', onclick: () => { A.pid = p.id; go('home'); }, 'aria-label': `Play as ${p.name}` },
              pipEl(p, 'idle', 84, 'bob'),
              h('h3', null, p.name),
              h('span', { class: 'lvl' }, `Level ${L.level}`),
              h('span', { class: 'xpbar' }, h('i', { style: { width: Math.round(L.pct * 100) + '%' } }))),
            h('span', { class: 'muted small center' }, p.demo ? 'Sample player' : last ? 'Played ' + relDay(last.end) : 'New player'),
            A.confirmRemove === p.id
              ? h('div', { class: 'player-foot confirm' },
                  h('span', { class: 'small' }, `Remove ${firstName(p)} and all their progress?`),
                  h('div', { class: 'row tight' },
                    h('button', { class: 'btn quiet small-btn', onclick: () => { A.confirmRemove = null; render(); } }, 'Keep'),
                    h('button', { class: 'btn danger-solid small-btn', onclick: () => { A.data.profiles = A.data.profiles.filter((x) => x.id !== p.id); A.confirmRemove = null; save(); toast(`${firstName(p)} was removed.`); render(); } }, 'Remove')))
              : h('div', { class: 'player-foot' },
                  h('button', { class: 'link small', onclick: () => { A.pid = p.id; go('dash'); } }, 'Grown-ups'),
                  h('button', { class: 'link small', onclick: () => { A.form = { name: p.name, grade: p.grade, color: p.color, look: p.look, editId: p.id }; go('add'); } }, 'Edit'),
                  h('button', { class: 'link small danger', onclick: () => { A.confirmRemove = p.id; render(); } }, 'Remove')));
        }),
        h('button', { class: 'player add', onclick: () => { A.form = { name: '', grade: '2', color: COLORS[ps.length % COLORS.length], look: FX.LOOKS[ps.length % FX.LOOKS.length][0], editId: null }; go('add'); } },
          h('span', { class: 'plus' }, '+'), 'Add a player')));
  }

  function screenAdd() {
    const f = A.form;
    const editing = f.editId ? A.data.profiles.find((x) => x.id === f.editId) : null;
    const big = () => raw(FX.pip({ color: f.color, look: f.look, mood: f.name.trim() ? 'cheer' : 'idle', size: 150, cls: 'bob' }));
    const preview = h('div', { class: 'preview' }, big());
    const nameInput = h('input', { type: 'text', id: 'player-name', maxlength: '20', value: f.name, placeholder: 'First name or nickname', autocomplete: 'off', oninput: (e) => {
      const had = !!f.name.trim(); f.name = e.target.value; saveBtn.disabled = !f.name.trim();
      if (had !== !!f.name.trim()) preview.replaceChildren(big());
    } });
    const saveBtn = h('button', { class: 'btn primary big', disabled: !f.name.trim(), onclick: () => {
      if (editing) {
        Object.assign(editing, { name: f.name.trim(), color: f.color, look: f.look, grade: f.grade });
        save(); toast('Saved! ✨'); go('profiles'); return;
      }
      const p = E.newProfile(f.name.trim(), f.grade, f.color);
      p.look = f.look;
      A.data.profiles.push(p); A.pid = p.id; save(); FX.play('big'); go('home');
    } }, editing ? 'Save changes' : 'Let’s go!');
    if (!editing) setTimeout(() => nameInput.focus(), 0);
    return h('div', { class: 'wrap stack' },
      topbar(h('button', { class: 'btn ghost', onclick: () => go('profiles') }, 'Cancel')),
      h('div', { class: 'glass pad addcard' },
        preview,
        h('div', { class: 'stack' },
          h('h1', null, editing ? 'Edit player' : 'New player'),
          h('div', { class: 'field' }, h('label', { class: 'label', for: 'player-name' }, 'Name'), nameInput,
            h('p', { class: 'note' }, '🔒 A first name or nickname is all we need — it stays on this device and is never uploaded anywhere.')),
          h('div', { class: 'field' },
            h('span', { class: 'label' }, 'Pick your buddy'),
            h('div', { class: 'looks', role: 'radiogroup', 'aria-label': 'Buddy' },
              FX.LOOKS.map(([k, label]) => h('button', { class: 'look', role: 'radio', 'aria-checked': String(f.look === k), onclick: () => { f.look = k; FX.play('tap'); render(); } },
                raw(FX.pip({ color: f.color, look: k, mood: 'idle', size: 50 })), h('span', null, label))))),
          h('div', { class: 'field' },
            h('span', { class: 'label' }, 'Pick a color'),
            h('div', { class: 'chips', role: 'group', 'aria-label': 'Color' },
              COLORS.map((c) => h('button', { class: 'swatch', 'aria-label': 'Color', 'aria-pressed': String(f.color === c), style: { '--c': c }, onclick: () => { f.color = c; render(); } })))),
          h('div', { class: 'field' },
            h('span', { class: 'label' }, 'School grade'),
            h('div', { class: 'chips', role: 'group', 'aria-label': 'School grade' },
              ['K', '1', '2', '3', '4', '5'].map((g) => h('button', { class: 'chip', 'aria-pressed': String(f.grade === g), onclick: () => { f.grade = g; render(); } }, g))),
            h('p', { class: 'note' }, editing ? 'Changing the grade doesn’t reset progress. Use “Redo check-in” in Grown-ups for that.' : 'Just a starting guess. A quick check-in finds the right spot.')),
          h('div', null, saveBtn))));
  }

  /* ---------- home ---------- */
  // Rolling streak: with no streak going, today is the first of 7 days;
  // with a streak in progress, today sits in the middle.
  function streakInfo(p) {
    const days = new Set(p.sessions.map((x) => U.dayKey(x.end)));
    const key = (off) => U.dayKey(Date.now() + off * 864e5);
    let prev = 0; while (days.has(key(-1 - prev))) prev++;
    const today = days.has(key(0));
    return { days, key, prev, today, count: prev + (today ? 1 : 0) };
  }
  function streakStrip(p) {
    const st = streakInfo(p);
    const start = st.prev > 0 ? -3 : 0;
    const out = [];
    for (let off = start; off < start + 7; off++) {
      const t = Date.now() + off * 864e5, on = st.days.has(st.key(off));
      const cls = 'd' + (on ? ' on' : '') + (off === 0 ? ' today' : '') + (off > 0 ? ' future' : '');
      out.push(h('div', { class: cls }, h('i', null, on ? '⭐' : off === 0 ? '?' : ''), off === 0 ? 'Today' : 'SMTWTFS'[new Date(t).getDay()]));
    }
    return h('div', { class: 'week', 'aria-label': `${st.count}-day streak` }, out);
  }
  function streakLine(p) {
    const st = streakInfo(p);
    if (st.today) return st.count >= 2 ? `🔥 ${st.count}-day streak! Come back tomorrow to make it ${st.count + 1}.` : '🔥 Day 1 of a new streak! Come back tomorrow for day 2.';
    if (st.prev) return `🔥 ${st.prev}-day streak! Play today to make it ${st.prev + 1}.`;
    return 'Play today to start a streak!';
  }

  function modePicker(p) {
    const moods = { easy: 'idle', balanced: 'think', stretch: 'wow' };
    return h('div', { class: 'modes', role: 'radiogroup', 'aria-label': 'How do you want to play?' },
      Object.entries(E.MODES).map(([k, m]) => h('button', { class: 'mode m-' + k, role: 'radio', 'aria-checked': String(p.mode === k), onclick: () => { p.mode = k; save(); FX.play('tap'); render(); } },
        raw(FX.pip({ color: p.color, look: p.look, mood: moods[k], size: 58 })),
        h('b', null, m.label), h('span', null, m.blurb))));
  }

  function screenHome() {
    const p = profile();
    if (!p) return screenProfiles();
    const L = E.levelInfo(p.xp);
    const cur = currentSkill(p);
    const mins = Math.max(2, Math.round(p.qCount * cur.t * (p.speed || 1) * 1.5 / 60));
    if (!p.placed) {
      return h('div', { class: 'wrap stack' },
        topbar(soundBtn(), h('button', { class: 'btn ghost', onclick: () => { A.pid = null; go('profiles'); } }, 'Switch')),
        h('div', { class: 'glass pad hero' },
          h('div', { class: 'hero-pip' }, pipEl(p, 'cheer', 170, 'bob'), h('div', { class: 'bubble' }, `Hi ${firstName(p)}! I’m Pip.`)),
          h('div', { class: 'stack' },
            h('h1', null, 'Let’s find your starting spot'),
            h('p', { class: 'lead' }, 'About 10 questions. Some will be easy and some might be things you haven’t learned yet. That’s totally okay! Just try your best, or tap “Haven’t learned this yet.”'),
            h('div', null, h('button', { class: 'btn primary big', onclick: startPlacement }, 'Start my check-in ✨')))));
    }
    const last = p.sessions[p.sessions.length - 1];
    return h('div', { class: 'wrap stack' },
      topbar(soundBtn(), h('button', { class: 'btn ghost', onclick: () => go('dash') }, 'Grown-ups'), h('button', { class: 'btn ghost', onclick: () => { A.pid = null; go('profiles'); } }, 'Switch')),
      h('div', { class: 'glass pad hero' },
        h('div', { class: 'hero-pip' }, pipEl(p, 'idle', 150, 'bob'), h('div', { class: 'bubble' }, pickFresh('greet', GREET))),
        h('div', { class: 'stack hero-main' },
          h('div', { class: 'row spread top-align' },
            h('div', { class: 'stack tight' }, h('span', { class: 'label' }, 'Hi ' + firstName(p)), h('h1', null, 'Now exploring: ', h('span', { class: 'grad' }, cur.name))),
            ring(p, 112)),
          h('div', { class: 'stack tight' }, h('span', { class: 'label' }, 'How do you want to play?'), modePicker(p)),
          h('div', { class: 'row spread end-align' },
            h('div', { class: 'stack tight' }, h('span', { class: 'label' }, 'How many questions?'),
              h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'How many questions' },
                [5, 10, 15, 20].map((n) => h('button', { class: 'chip', role: 'radio', 'aria-checked': String(p.qCount === n), 'aria-pressed': String(p.qCount === n), onclick: () => { p.qCount = n; save(); render(); } }, n)))),
            h('div', { class: 'stack tight end' },
              h('button', { class: 'btn primary big', onclick: startSession }, 'Play ▶'),
              h('span', { class: 'muted small' }, `About ${mins} minutes`))))),
      h('div', { class: 'grid2' },
        h('div', { class: 'glass pad stack' }, h('span', { class: 'label' }, 'Your math path'), pathMap(p)),
        h('div', { class: 'glass pad stack' }, h('span', { class: 'label' }, 'Streak'), streakStrip(p), h('p', { class: 'streakline' }, streakLine(p)), h('p', { class: 'muted small' }, `${L.need - L.into} XP to Level ${L.level + 1}. Every answer earns XP, even the tricky ones.`))),
      last && last.story ? h('div', { class: 'glass pad stack' }, h('span', { class: 'label' }, 'Last time'), h('p', { class: 'story' }, last.story)) : null);
  }

  /* ---------- practice ---------- */
  function startPlacement() { A.mode = 'placement'; A.run = E.startPlacement(profile()); nextItem(); }
  function startSession() { A.mode = 'session'; A.run = E.startSession(profile()); A.run.finished = false; nextItem(); }
  function blankInput(item) { return item.kind === 'frac' ? { n: '', d: '', focus: 'n' } : item.kind === 'choice' ? null : ''; }
  function nextItem() {
    const p = profile();
    A.item = A.mode === 'placement' ? E.nextPlacementItem(A.run, p) : E.nextSessionItem(A.run, p);
    A.input = blankInput(A.item);
    A.t0 = performance.now(); A.hiddenMs = 0; A.hiddenAt = document.hidden ? performance.now() : null;
    A.hinted = false; A.showHint = false; A.fb = null;
    go('practice');
  }
  function elapsed() { const hid = A.hiddenMs + (A.hiddenAt != null ? performance.now() - A.hiddenAt : 0); return Math.max(0.3, (performance.now() - A.t0 - hid) / 1000); }
  // Fractions need both the top and the bottom before Check unlocks.
  function hasInput() { const it = A.item, v = A.input; return it.kind === 'frac' ? v.n !== '' && v.d !== '' : it.kind === 'choice' ? v != null : v !== '' && v !== '.'; }

  function submit(skip) {
    if (A.fb) return;
    if (!skip && !hasInput()) return;
    const p = profile(), it = A.item;
    const correct = !skip && SK.checkAnswer(it, A.input);
    const r = { correct, skipped: !!skip, hinted: A.hinted, time: elapsed() };
    const res = A.mode === 'placement' ? E.recordPlacement(A.run, p, it, r) : E.recordSessionAnswer(A.run, p, it, r);
    save();
    const hard = ['stretch', 'challenge'].includes(it.role);
    const streak = A.mode === 'session' ? A.run.consecRight : 0;
    A.fb = {
      correct, skipped: !!skip, xp: res.xp, retryQueued: !!res.retryQueued, hard,
      title: correct ? (hard ? pickFresh('hard', HARD_PRAISE) : streak >= 3 ? `${streak} in a row! 🔥` : pickFresh('praise', PRAISE)) : skip ? 'Let’s see how it works 🧠' : pickFresh('close', CLOSE),
      sub: correct ? pickFresh('psub', PRAISE_SUB) : null,
      showWB: A.mode === 'session',
    };
    if (res.levelUp) A.pendingLevel = res.levelUp;
    render();
    if (correct) {
      FX.play(hard || streak >= 3 ? 'big' : 'correct');
      const card = document.querySelector('.problem');
      const rect = card ? card.getBoundingClientRect() : null;
      FX.confetti(hard || streak >= 3 ? 140 : 60, rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
      A.advanceTimer = setTimeout(advance, A.mode === 'placement' ? 1100 : canAskHarder() ? 2800 : 1700);
    } else {
      FX.play('almost');
      const wb = document.querySelector('.fb.close');
      if (wb && wb.scrollIntoView) wb.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (A.pendingLevel) setTimeout(showLevelUp, correct ? 500 : 200);
  }

  // "Make it harder" is offered only on the celebration card of a session.
  function canAskHarder() {
    if (A.mode !== 'session' || !A.fb || !A.fb.correct || !A.run) return false;
    const a = A.run.answers[A.run.answers.length - 1];
    return !!a && !a.askedHarder && A.run.idx < A.run.len;
  }
  function askHarder() {
    clearTimeout(A.advanceTimer);
    const res = E.requestHarder(A.run, profile());
    if (!res) return;
    save();
    A.fb.harder = res.kind;
    FX.play('tap');
    render();
    A.advanceTimer = setTimeout(advance, 900);
  }

  function showLevelUp() {
    const lvl = A.pendingLevel; if (!lvl) return;
    A.pendingLevel = 0;
    clearTimeout(A.advanceTimer);
    const p = profile();
    FX.play('level'); FX.confetti(180);
    const close = () => { ov.remove(); if (A.fb && A.fb.correct && A.screen === 'practice') A.advanceTimer = setTimeout(advance, 400); };
    const ov = h('div', { class: 'overlay', role: 'dialog', 'aria-label': `Level ${lvl}!` },
      h('div', { class: 'levelup pop' },
        h('div', { class: 'burst', 'aria-hidden': 'true' }),
        pipEl(p, 'wow', 150, 'jump'),
        h('span', { class: 'label' }, 'Level up!'),
        h('div', { class: 'lvlnum' }, 'Level ' + lvl),
        h('p', { class: 'lead' }, 'All that practice is paying off! 🎉'),
        h('button', { class: 'btn primary big', onclick: close }, 'Keep going')));
    document.body.append(ov);
    setTimeout(() => { const b = ov.querySelector('button'); if (b) b.focus(); }, 50);
  }

  function advance() {
    clearTimeout(A.advanceTimer);
    if (document.querySelector('.overlay')) return;
    const p = profile();
    if (A.mode === 'placement') {
      if (E.placementDone(A.run)) { A.placeResult = E.finishPlacement(A.run, p); save(); A.run = null; if (A.placeResult.levelUp) A.pendingLevel = A.placeResult.levelUp; go('placed'); FX.play('big'); FX.confetti(160); return; }
      nextItem(); return;
    }
    if (E.sessionDone(A.run)) { go('summary'); FX.play('big'); FX.confetti(160); return; }
    nextItem();
  }
  function stopPractice() {
    const p = profile();
    clearTimeout(A.advanceTimer);
    if (A.mode === 'session' && A.run && !A.run.finished) {
      A.run.finished = true;
      const rec = E.finishSession(A.run, p, { completed: false });
      save();
      toast(rec ? 'Saved! Great practice today. 🌟' : 'See you soon! 👋');
    } else if (A.mode === 'placement') toast('Check-in paused. Start again anytime.');
    A.run = null; go('home');
  }
  function finishWithFeel(feel) {
    const p = profile();
    if (!A.run || A.run.finished) { go('home'); return; }
    A.run.finished = true;
    A.lastRec = E.finishSession(A.run, p, { completed: true, feel });
    save(); A.run = null;
    if (A.lastRec && A.lastRec.levelUp) { A.pendingLevel = A.lastRec.levelUp; go('home'); showLevelUp(); return; }
    toast(feel ? 'Thanks! Pip will remember that. 💜' : 'Saved! ⭐');
    go('home');
  }

  function renderVisual(v) {
    if (!v) return null;
    if (v.type === 'dots') {
      const frames = [];
      v.groups.forEach((g) => {
        let left = g.n;
        while (left > 0) {
          const n = Math.min(10, left); left -= n;
          frames.push(h('div', { class: 'frame', 'aria-hidden': 'true' }, Array.from({ length: n }, () => h('i', { class: g.crossed ? 'x' : null, style: { '--c': SK.TONE[g.tone % SK.TONE.length] } }))));
        }
      });
      return h('div', { class: 'dots' }, frames);
    }
    if (v.type === 'array') return h('div', { class: 'array', style: { gridTemplateColumns: `repeat(${v.cols}, 18px)` }, 'aria-label': `${v.rows} rows of ${v.cols}` }, Array.from({ length: v.rows * v.cols }, () => h('i')));
    if (v.type === 'base10') {
      return h('div', { class: 'base10', 'aria-label': `${v.tens} tens and ${v.ones} ones` },
        h('div', { class: 'b10tens' }, Array.from({ length: v.tens }, () => h('div', { class: 'b10rod' }, Array.from({ length: 10 }, () => h('i'))))),
        v.ones ? h('div', { class: 'b10ones' }, Array.from({ length: v.ones }, () => h('i'))) : null);
    }
    const fill = (on) => on ? 'url(#candy)' : 'var(--card-solid)';
    const defs = s('defs', null, s('linearGradient', { id: 'candy', x1: 0, y1: 0, x2: 0, y2: 1 }, s('stop', { offset: 0, 'stop-color': '#7CB6FF' }), s('stop', { offset: 1, 'stop-color': '#3E7BFA' })));
    if (v.type === 'pie') {
      const R = 60, cx = 70, cy = 70, parts = [];
      for (let i = 0; i < v.parts; i++) {
        const a0 = (i / v.parts) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / v.parts) * 2 * Math.PI - Math.PI / 2;
        const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0), x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        parts.push(s('path', { d: `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`, style: `fill:${fill(i < v.shaded)};stroke:var(--ink);stroke-width:2.5;stroke-linejoin:round` }));
      }
      return s('svg', { class: 'fracsvg', viewBox: '0 0 140 140', role: 'img', 'aria-label': `circle in ${v.parts} parts, ${v.shaded} shaded` }, defs, parts);
    }
    if (v.type === 'bar') {
      const W = 260, cells = [];
      for (let i = 0; i < v.parts; i++) cells.push(s('rect', { x: 10 + (i * W) / v.parts, y: 10, width: W / v.parts, height: 50, style: `fill:${fill(i < v.shaded)};stroke:var(--ink);stroke-width:2.5` }));
      return s('svg', { class: 'fracsvg bar', viewBox: '0 0 280 70', role: 'img', 'aria-label': `bar in ${v.parts} parts, ${v.shaded} shaded` }, defs, cells);
    }
    if (v.type === 'bars2') {
      const W = 240, rows = [];
      [v.a, v.b].forEach((f, r) => { for (let i = 0; i < f.d; i++) rows.push(s('rect', { x: 20 + (i * W) / f.d, y: 8 + r * 44, width: W / f.d, height: 32, style: `fill:${fill(i < f.n)};stroke:var(--ink);stroke-width:2` })); });
      return s('svg', { class: 'fracsvg bar', viewBox: '0 0 280 92', role: 'img', 'aria-label': 'two fraction bars' }, defs, rows);
    }
    return null;
  }

  function renderInput() {
    const it = A.item;
    if (it.kind === 'choice') return h('div', { class: 'choices' }, it.choices.map((c) => h('button', { class: 'choice', 'aria-pressed': String(A.input === c), onclick: () => { A.input = c; submit(false); } }, c)));
    const press = (k) => {
      if (A.fb) return;
      if (it.kind === 'frac') {
        const f = A.input;
        if (k === 'back') f[f.focus] = f[f.focus].slice(0, -1);
        else if (k === 'swap') f.focus = f.focus === 'n' ? 'd' : 'n';
        else if (f[f.focus].length < 4) f[f.focus] += k;
      } else if (k === 'back') A.input = A.input.slice(0, -1);
      else if (k === '.') { if (!A.input.includes('.')) A.input = (A.input || '0') + '.'; }
      else if (A.input.length < 7) A.input = A.input === '0' ? k : A.input + k;
      render();
    };
    A.press = press;
    let shown;
    if (it.kind === 'frac') {
      const f = A.input;
      const slot = (key, label) => h('button', { class: 'slot' + (f.focus === key ? ' active' : ''), 'aria-label': label, onclick: () => { f.focus = key; render(); } }, f[key] || h('span', { class: 'ph' }, key === 'n' ? 'top' : 'bottom'));
      shown = h('div', { class: 'fracin' }, slot('n', 'Top number'), h('div', { class: 'bar' }), slot('d', 'Bottom number'));
    } else shown = h('div', { class: 'slot active', 'aria-live': 'polite' }, A.input || h('span', { class: 'ph' }, 'Type your answer'));
    const fnKey = it.kind === 'dec' ? h('button', { class: 'key', onclick: () => press('.') }, '.')
      : it.kind === 'frac' ? h('button', { class: 'key fn', onclick: () => press('swap') }, A.input.focus === 'n' ? 'Bottom ↓' : 'Top ↑') : h('div');
    const needBoth = it.kind === 'frac' && !hasInput() && (A.input.n || A.input.d);
    return h('div', { class: 'answer' }, shown,
      needBoth ? h('p', { class: 'note center' }, 'Fill in both the top and the bottom.') : null,
      h('div', { class: 'keys' },
        ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => h('button', { class: 'key', onclick: () => press(k) }, k)),
        fnKey, h('button', { class: 'key', onclick: () => press('0') }, '0'),
        h('button', { class: 'key fn', 'aria-label': 'Delete', onclick: () => press('back') }, '⌫')),
      h('button', { class: 'btn primary big wide', disabled: !hasInput(), onclick: () => submit(false) }, 'Check'));
  }

  function renderFeedback() {
    const it = A.item, fb = A.fb, p = profile();
    if (fb.correct) {
      return h('div', { class: 'fb good pop', role: 'status' },
        h('div', { class: 'burst', 'aria-hidden': 'true' }),
        pipEl(p, fb.hard ? 'wow' : 'cheer', 92, 'jump'),
        h('div', { class: 'stack tight' },
          h('h2', null, fb.title),
          h('p', { class: 'muted' }, fb.sub),
          fb.harder ? h('p', { class: 'harder-note pop' }, 'Next one’s tougher! 🔥') : null,
          h('div', { class: 'row tight' },
            h('span', { class: 'xp-pill float' }, `+${fb.xp} XP`),
            !fb.harder && canAskHarder() ? h('button', { class: 'btn hot-btn', onclick: askHarder }, 'Make it harder 🔥') : null,
            h('button', { class: 'btn', onclick: advance }, 'Next →'))));
    }
    const sub = A.mode === 'placement' ? (fb.skipped ? 'No problem. On to the next one!' : 'That one’s tricky. On to the next!')
      : fb.skipped ? 'No problem! The next one will be a little easier.'
        : fb.retryQueued ? 'Let’s come back to this one.'
          : fb.hard ? 'That was a tough one! Here’s the trick.' : 'Let’s look at it together.';
    const wbHost = h('div', { class: 'wbhost' });
    const mountWB = () => { wbHost.replaceChildren(h('h3', { class: 'wb-title' }, 'Let’s see how it works'), WB.create(it.wb || [])); };
    if (fb.showWB) mountWB();
    return h('div', { class: 'fb close pop', role: 'status' },
      h('div', { class: 'fb-head' },
        pipEl(p, 'oops', 84),
        h('div', { class: 'stack tight' },
          h('h2', null, A.mode === 'placement' ? (fb.skipped ? 'That’s okay! 🌱' : 'Nice try! 🌱') : fb.title),
          h('p', null, sub),
          h('p', { class: 'answer-reveal' }, 'The answer is ', h('b', null, SK.answerText(it)), '.'),
          h('span', { class: 'xp-pill soft' }, `+${fb.xp} XP for ${fb.skipped ? 'being honest' : 'trying'}`))),
      wbHost,
      h('div', { class: 'row tight' },
        !fb.showWB ? h('button', { class: 'btn', onclick: (e) => { fb.showWB = true; mountWB(); e.currentTarget.remove(); } }, 'Show me how') : null,
        h('button', { class: 'btn primary', onclick: advance }, 'Got it! Next →')));
  }

  function difficultyMeter(it) {
    if (it.pBefore == null) return null;
    const p = it.pBefore;
    const lvl = p > 0.9 ? 1 : p > 0.75 ? 2 : p > 0.6 ? 3 : p > 0.45 ? 4 : 5;
    return h('div', { class: 'meter', role: 'img', 'aria-label': `Difficulty ${lvl} of 5`, title: 'How tricky this one is' },
      Array.from({ length: 5 }, (_, i) => h('i', { class: i < lvl ? 'on' : null, style: { height: 7 + i * 3 + 'px' } })));
  }

  function screenPractice() {
    const it = A.item, run = A.run, sk = SK.byId[it.skillId], p = profile();
    const total = A.mode === 'placement' ? run.max : run.len;
    const done = run.answers;
    const track = h('div', { class: 'track', 'aria-label': `Question ${Math.min(total, done.length + 1)} of ${total}` },
      Array.from({ length: total }, (_, i) => {
        const a = done[i];
        if (a) return h('span', { class: a.correct ? 'ok' : 'miss' });
        return h('span', { class: i === done.length && !A.fb ? 'cur' : null });
      }));
    const badge = A.mode === 'placement' ? ['Check-in', 'sky'] : ROLE_BADGE[it.role];
    const skipLabel = A.mode === 'placement' ? 'Haven’t learned this yet' : 'Skip this one';
    return h('div', { class: 'practice' },
      h('div', { class: 'ptop' },
        h('button', { class: 'iconbtn', onclick: stopPractice, 'aria-label': 'Stop for now', title: 'Stop for now' }, '✕'),
        track,
        difficultyMeter(it),
        h('span', { class: 'xp-chip' }, '⭐ ', A.mode === 'session' ? '+' + run.xp : 'Lv ' + E.levelInfo(p.xp).level)),
      h('div', { class: 'glass problem' + (A.fb ? (A.fb.correct ? ' is-good' : ' is-close') : '') },
        h('div', { class: 'badges' },
          badge ? h('span', { class: 'badge ' + badge[1] }, badge[0]) : null,
          it.harder && !A.fb ? h('span', { class: 'badge hot pop' }, 'Turning it up! 🔥') : null),
        h('p', { class: 'prompt' }, it.prompt),
        renderVisual(it.visual),
        it.display ? h('div', { class: 'display', 'aria-label': it.display.replace('?', 'what') }, mathText(it.display)) : null,
        it.column ? h('div', { class: 'column', role: 'img', 'aria-label': `${it.column.top} ${it.column.op} ${it.column.bottom}` },
          h('span', { class: 'op' }), h('span', null, it.column.top), h('span', { class: 'op' }, it.column.op), h('span', null, it.column.bottom), h('span', { class: 'rule' })) : null,
        h('span', { class: 'skillchip' }, h('i', { style: { background: sk.color } }), sk.name),
        !A.fb ? h('div', { class: 'corner-pip' }, pipEl(p, 'think', 58)) : null),
      A.fb ? renderFeedback() : [
        A.showHint ? h('div', { class: 'hintbox glass' }, h('b', null, 'Hint: '), it.hint) : null,
        renderInput(),
        h('div', { class: 'helpers' },
          A.showHint ? h('span') : h('button', { class: 'btn quiet', onclick: () => { A.hinted = true; A.showHint = true; render(); } }, '💡 Show a hint'),
          h('button', { class: 'btn ghost', onclick: () => submit(true) }, skipLabel + ' ⏭')),
      ]);
  }

  function screenPlaced() {
    const p = profile(), cur = currentSkill(p);
    setTimeout(showLevelUp, 900);
    return h('div', { class: 'wrap stack' },
      topbar(soundBtn()),
      h('div', { class: 'glass pad hero celebrate' },
        h('div', { class: 'hero-pip' }, h('div', { class: 'burst', 'aria-hidden': 'true' }), pipEl(p, 'cheer', 170, 'jump')),
        h('div', { class: 'stack' },
          h('span', { class: 'label' }, 'Check-in complete'),
          h('h1', null, 'You’re all set! 🎉'),
          h('p', { class: 'lead' }, 'Your adventure starts with ', h('b', null, cur.name), '. Every session mixes wins with tricky ones, and gets harder as you get stronger.'),
          pathMap(p),
          h('div', { class: 'row' }, ring(p, 104), h('span', { class: 'xp-pill' }, `+${E.XP.placement} XP for finishing!`)),
          h('div', null, h('button', { class: 'btn primary big', onclick: () => go('home') }, 'Let’s play! ▶')))));
  }

  function screenSummary() {
    const run = A.run, p = profile();
    if (!run) return screenHome();
    const n = run.answers.length, c = run.answers.filter((a) => a.correct).length;
    const story = E.narrative({ answers: run.answers, mode: run.mode, completed: true });
    return h('div', { class: 'wrap stack' },
      topbar(soundBtn()),
      h('div', { class: 'glass pad hero celebrate' },
        h('div', { class: 'hero-pip' }, h('div', { class: 'burst', 'aria-hidden': 'true' }), pipEl(p, 'cheer', 160, 'jump')),
        h('div', { class: 'stack' },
          h('span', { class: 'label' }, 'Session complete'),
          h('h1', null, pickFresh('done', ['You did it! 🎉', 'Awesome session! 🌟', 'Great work today! 🚀', 'What a session! 🥳'])),
          h('div', { class: 'row' }, h('span', { class: 'bigscore' }, c), h('span', { class: 'lead' }, `right out of ${n}`), h('span', { class: 'xp-pill' }, `+${run.xp + E.XP.session} XP`)),
          h('div', { class: 'stars' }, run.answers.map((a) => h('span', { class: a.correct ? 'on' : null }, a.correct ? '⭐' : '•'))),
          h('p', { class: 'story' }, story))),
      h('div', { class: 'glass pad stack' },
        h('h2', null, 'How did that feel?'),
        h('div', { class: 'feel' },
          h('button', { class: 'btn feelbtn', onclick: () => finishWithFeel('easy') }, h('span', { class: 'emo' }, '😎'), 'Too easy'),
          h('button', { class: 'btn feelbtn', onclick: () => finishWithFeel('right') }, h('span', { class: 'emo' }, '😊'), 'Just right'),
          h('button', { class: 'btn feelbtn', onclick: () => finishWithFeel('hard') }, h('span', { class: 'emo' }, '😅'), 'Too hard')),
        h('div', null, h('button', { class: 'link', onclick: () => finishWithFeel(null) }, 'Skip'))));
  }

  /* ---------- grown-ups ---------- */
  const STATUS_TONE = { flow: 'var(--good)', bored: 'var(--sky)', struggling: 'var(--sun)', lapsing: 'var(--ink-3)', new: 'var(--ink-3)' };

  function chartTrace(ses) {
    const as = ses.answers;
    const W = 560, H = 220, L = 58, R = 14, T = 16, B = 30;
    const vals = as.flatMap((a) => [a.b, a.thetaBefore != null ? a.thetaBefore : a.theta]);
    const lo = Math.min(...vals) - 4, hi = Math.max(...vals) + 4;
    const x = (i) => L + (as.length === 1 ? 0 : (i * (W - L - R)) / (as.length - 1));
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const els = [];
    [0, 0.5, 1].forEach((f) => els.push(s('line', { x1: L, x2: W - R, y1: T + f * (H - T - B), y2: T + f * (H - T - B), class: 'gridline' })));
    els.push(s('text', { x: L - 8, y: T + 10, 'text-anchor': 'end' }, 'harder'));
    els.push(s('text', { x: L - 8, y: H - B, 'text-anchor': 'end' }, 'easier'));
    els.push(s('path', { d: as.map((a, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(a.thetaBefore != null ? a.thetaBefore : a.theta).toFixed(1)}`).join(' '), class: 'line-theta' }));
    els.push(s('path', { d: as.map((a, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(a.b).toFixed(1)}`).join(' '), class: 'line-diff' }));
    const every = as.length > 12 ? 2 : 1;
    as.forEach((a, i) => {
      els.push(s('circle', { cx: x(i), cy: y(a.b), r: 6.5, class: a.skipped ? 'dot-skip' : a.correct ? 'dot-good' : 'dot-miss' }));
      if (a.askedHarder) els.push(s('text', { x: x(i), y: y(a.b) - 11, 'text-anchor': 'middle', class: 'flame' }, '🔥'));
      if (i % every === 0) els.push(s('text', { x: x(i), y: H - 10, 'text-anchor': 'middle' }, 'Q' + (i + 1)));
    });
    return s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Problem difficulty, question by question' }, els);
  }

  function chartZone(p) {
    const ss = p.sessions.slice(-12);
    const W = 560, H = 210, L = 38, R = 12, T = 12, B = 26;
    const y = (v) => T + (1 - v) * (H - T - B);
    const bw = (W - L - R) / Math.max(ss.length, 6);
    const els = [s('defs', null, s('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, s('rect', { width: 3, height: 6, style: 'fill:var(--sun)' })))];
    [0, 0.5, 1].forEach((v) => { els.push(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'gridline' })); els.push(s('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end' }, Math.round(v * 100) + '%')); });
    ss.forEach((ses, i) => {
      const t = ses.target || 0.75;
      const x0 = L + i * bw + bw * 0.14, w = bw * 0.72;
      els.push(s('rect', { x: x0 - 3, y: y(Math.min(1, t + 0.1)), width: w + 6, height: y(t - 0.1) - y(Math.min(1, t + 0.1)), rx: 4, class: 'zone' }));
      const col = ses.acc > t + 0.1 ? 'var(--sky)' : ses.acc < t - 0.1 ? 'var(--grape)' : 'var(--good)';
      els.push(s('rect', { x: x0 + w * 0.2, y: y(ses.acc), width: w * 0.6, height: Math.max(2, y(0) - y(ses.acc)), rx: 4, style: `fill:${ses.completed ? col : 'url(#hatch)'}` }));
      els.push(s('text', { x: x0 + w / 2, y: H - 6, 'text-anchor': 'middle' }, new Date(ses.end).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })));
    });
    return s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Session accuracy against each session’s target' }, els);
  }

  function chartGrowth(p) {
    const pts = p.history.map((x) => x.theta);
    const W = 560, H = 230, L = 64, R = 12, T = 12, B = 24;
    const lo = Math.max(0, Math.min(...pts) - 8), hi = Math.min(100, Math.max(...pts) + 8);
    const x = (i) => L + (pts.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (pts.length - 1));
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const els = [];
    SK.GRADES.forEach((g, gi) => {
      const g0 = gi === 0 ? 0 : SK.GRADES[gi - 1].upTo, g1 = Math.min(100, g.upTo);
      const a = Math.max(lo, g0), b = Math.min(hi, g1);
      if (b <= a) return;
      els.push(s('rect', { x: L, y: y(b), width: W - L - R, height: y(a) - y(b), class: gi % 2 ? 'band' : 'band alt' }));
      if (y(a) - y(b) >= 18) els.push(s('text', { x: L - 8, y: (y(a) + y(b)) / 2 + 4, 'text-anchor': 'end' }, g.g === 'K' ? 'K' : 'Grade ' + g.g));
    });
    const line = pts.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    els.push(s('path', { d: `${line} L${x(pts.length - 1)},${y(lo)} L${x(0)},${y(lo)} Z`, class: 'area-fill' }));
    els.push(s('path', { d: line, class: 'line-growth' }));
    els.push(s('circle', { cx: x(pts.length - 1), cy: y(pts[pts.length - 1]), r: 6, class: 'dot-end' }));
    return s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Skill growth across grade bands' }, els);
  }

  function chartSignals(p) {
    const ss = p.sessions.slice(-12);
    const W = 560, H = 150, L = 38, R = 12, T = 12, B = 16;
    const n = Math.max(ss.length, 2);
    const x = (i) => L + (i * (W - L - R)) / (n - 1);
    const y = (v) => T + (1 - v) * (H - T - B);
    const els = [s('rect', { x: L, y: y(1), width: W - L - R, height: y(0.55) - y(1), class: 'zone warn' })];
    [0, 1].forEach((v) => els.push(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'gridline' })));
    els.push(s('text', { x: L - 6, y: y(1) + 4, 'text-anchor': 'end' }, 'high'));
    els.push(s('text', { x: L - 6, y: y(0) + 4, 'text-anchor': 'end' }, 'low'));
    [['peakF', 'var(--grape)'], ['peakB', 'var(--sky)']].forEach(([k, col]) => {
      if (!ss.length) return;
      els.push(s('path', { d: ss.map((ses, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(ses[k]).toFixed(1)}`).join(' '), style: `fill:none;stroke:${col};stroke-width:2.5;stroke-linejoin:round` }));
      ss.forEach((ses, i) => els.push(s('circle', { cx: x(i), cy: y(ses[k]), r: 3.5, style: `fill:${col}` })));
    });
    return s('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Peak frustration and boredom per session' }, els);
  }

  function skillStatus(p, sk) {
    const k = p.skills[sk.id];
    if (sk.hi < p.theta - 2) return (k && !k.assumed && k.n >= 3 && k.acc < 0.6) ? ['Review', 'sun'] : ['Mastered', 'good'];
    if (sk.lo <= p.theta + 2) return ['Practicing', 'sky'];
    if (sk.lo <= p.theta + 10) return ['Up next', ''];
    return ['Later', ''];
  }
  function segCtl(label, opts, value, onPick) {
    return h('div', { class: 'field' }, h('span', { class: 'label' }, label),
      h('div', { class: 'seg-ctl', role: 'group', 'aria-label': label },
        opts.map(([v, text]) => h('button', { 'aria-pressed': String(String(value) === String(v)), onclick: () => onPick(v) }, text))));
  }
  function exportData(p) {
    const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `numera-${p.name.replace(/\W+/g, '-').toLowerCase()}.json` });
    document.body.append(a); a.click(); a.remove();
  }

  function screenDash() {
    const p = profile();
    if (!p) return screenProfiles();
    const hl = E.health(p), L = E.levelInfo(p.xp);
    const recent = p.sessions.slice(-5), last = p.sessions[p.sessions.length - 1];
    const quits = p.sessions.filter((x) => !x.completed).length;
    const modeCounts = {}; p.sessions.forEach((x) => { if (x.mode) modeCounts[x.mode] = (modeCounts[x.mode] || 0) + 1; });
    const favMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0];
    const stat = (label, value, sub) => h('div', { class: 'stat' }, h('span', { class: 'label' }, label), h('b', null, value), sub ? h('span', { class: 'note' }, sub) : null);
    const avgTarget = recent.length ? U.mean(recent.map((x) => x.target || 0.75)) : 0.7;

    return h('div', { class: 'wrap wide stack' },
      topbar(h('button', { class: 'btn ghost', onclick: () => go('home') }, 'Back to play'), h('button', { class: 'btn ghost', onclick: () => { A.pid = null; go('profiles'); } }, 'All players')),
      h('div', { class: 'row spread' },
        h('div', { class: 'row' }, pipEl(p, 'idle', 70),
          h('div', null, h('h1', null, p.name), h('p', { class: 'muted' }, p.placed ? `Level ${L.level} · working at ${SK.gradeDetail(p.theta)} skills · enrolled in ${SK.gradeLabel(p.grade).toLowerCase()}` : 'Placement check-in not done yet.'))),
        p.demo ? h('span', { class: 'badge' }, 'Sample player with simulated history') : null),

      h('div', { class: 'dash' },
        h('div', { class: 'glass status span-12' },
          h('span', { class: 'sdot', style: { background: STATUS_TONE[hl.status] } }),
          h('div', { class: 'stack tight' },
            h('span', { class: 'label' }, 'Engagement health'),
            h('h2', null, hl.label),
            h('p', { class: 'muted' }, hl.detail),
            last && last.changes && last.changes.length ? h('p', { class: 'small' }, h('b', null, 'After the last session: '), last.changes.join('. ') + '.') : null)),

        h('div', { class: 'glass span-12 stats' },
          stat('Level', String(L.level), `${p.xp} XP total`),
          stat('Sessions', `${p.sessions.length - quits}/${p.sessions.length}`, 'finished / started'),
          stat('Accuracy', recent.length ? Math.round(U.mean(recent.map((x) => x.acc)) * 100) + '%' : '–', `last ${recent.length}, target ${Math.round(avgTarget * 100)}%`),
          stat('Early exits', String(quits), 'sessions left early'),
          stat('Favorite mode', favMode ? E.MODES[favMode[0]].label : '–', favMode ? `${favMode[1]} sessions` : ''),
          stat('Pace', (p.speed || 1) < 0.85 ? 'Quick' : (p.speed || 1) > 1.3 ? 'Careful' : 'Typical', 'vs. expected time'),
          stat('Make it harder', String(recent.reduce((t, x) => t + (x.harderAsks || 0), 0)), (p.harderTrust == null ? 1 : p.harderTrust) >= 0.9 ? 'presses, backed up by results' : (p.harderTrust >= 0.6 ? 'presses, partly backed up' : 'presses, often not backed up'))),

        last && last.story ? h('div', { class: 'glass pad span-12 stack' }, h('span', { class: 'label' }, 'Last session story'), h('p', { class: 'story' }, last.story)) : null,

        h('div', { class: 'glass pad span-7 stack' },
          h('div', { class: 'row spread' }, h('h3', null, 'Difficulty, problem by problem'),
            h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: 'var(--good)' } }), 'right'), h('span', null, h('i', { style: { background: 'var(--sun)' } }), 'missed'), h('span', null, h('i', { style: { background: 'var(--ink-3)' } }), 'skipped'), h('span', null, h('i', { class: 'dash-key' }), 'ability estimate'))),
          last ? chartTrace(last) : h('p', { class: 'muted' }, 'No sessions yet.'),
          h('p', { class: 'note' }, last ? `Last session (${E.MODES[last.mode] ? E.MODES[last.mode].label : 'earlier version'}, aiming for ${Math.round((last.target || 0.75) * 100)}% right). Every answer moves the next problem: a right answer steps it up, a miss steps it down, a skip steps it down further.` : '')),

        h('div', { class: 'glass pad span-5 stack' },
          h('h3', null, 'What the app did last session'),
          last ? [
            h('div', { class: 'qstrip' }, last.answers.map((a) => h('div', { class: 'qbox' + (a.correct ? '' : ' miss'), title: `${SK.byId[a.skill].name}, ${E.ROLE_LABEL[a.role]}, ${a.time}s (expected ${a.expected}s)` },
              h('span', { class: 'bar', style: { background: SK.byId[a.skill].color } }), h('span', null, a.askedHarder ? '🔥' : E.ROLE_SHORT[a.role]),
              h('span', { style: { color: a.time > a.expected * 2.5 ? 'var(--sun)' : a.time < a.expected * 0.6 ? 'var(--sky)' : 'var(--ink-3)' } }, Math.round(a.time) + 's')))),
            last.log.length ? h('ul', { class: 'log' }, last.log.map((l) => h('li', null, h('b', null, 'Q' + (l.i + 1)), h('span', null, l.text)))) : h('p', { class: 'note' }, 'No safety adjustments were needed. The per-answer difficulty steps are in the chart.'),
            h('p', { class: 'note' }, `${relDay(last.end)}, ${last.completed ? 'finished' : 'left early'}${last.feel ? ', felt ' + { easy: 'too easy', right: 'just right', hard: 'too hard' }[last.feel] : ''}.`),
          ] : h('p', { class: 'muted' }, 'No sessions yet.')),

        h('div', { class: 'glass pad span-7 stack' },
          h('div', { class: 'row spread' }, h('h3', null, 'Were sessions on target?'), h('div', { class: 'legend' },
            h('span', null, h('i', { class: 'zone-key' }), 'target'), h('span', null, h('i', { style: { background: 'var(--good)' } }), 'on target'),
            h('span', null, h('i', { style: { background: 'var(--sky)' } }), 'too easy'), h('span', null, h('i', { style: { background: 'var(--grape)' } }), 'too hard'), h('span', null, h('i', { style: { background: 'var(--sun)' } }), 'left early'))),
          p.sessions.length ? chartZone(p) : h('p', { class: 'muted' }, 'No sessions yet.'),
          h('p', { class: 'note' }, 'Each session’s target depends on the mode picked (90%, 70% or 50%).')),

        h('div', { class: 'glass pad span-5 stack' },
          h('h3', null, 'Skill growth'),
          chartGrowth(p),
          h('p', { class: 'note' }, 'Internal skill estimate against grade bands. The child only ever sees their Level, which only goes up.')),

        h('div', { class: 'glass pad span-7 stack' },
          h('div', { class: 'row spread' }, h('h3', null, 'Engagement signals'), h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: 'var(--grape)' } }), 'frustration'), h('span', null, h('i', { style: { background: 'var(--sky)' } }), 'boredom'))),
          p.sessions.length ? chartSignals(p) : h('p', { class: 'muted' }, 'No sessions yet.'),
          h('p', { class: 'note' }, 'Peak per session. Frustration builds from misses in a row, skips, hints, very slow answers and rapid guessing. Boredom builds from fast, easy correct answers. In the shaded zone the app inserts a “You got this!” problem or a challenge.')),

        h('div', { class: 'glass pad span-5 stack' },
          h('h3', null, 'Settings'),
          segCtl('Default mode', Object.entries(E.MODES).map(([k, m]) => [k, m.label]), p.mode, (v) => { p.mode = v; save(); render(); }),
          segCtl('Questions per session', [[5, '5'], [10, '10'], [15, '15'], [20, '20']], p.qCount, (v) => { p.qCount = Number(v); save(); render(); }),
          segCtl('Sound', [[true, 'On'], [false, 'Off']], FX.Sound.on, (v) => { FX.Sound.on = v === true || v === 'true'; A.data.settings.sound = FX.Sound.on; save(); render(); }),
          h('div', { class: 'row' },
            h('button', { class: 'btn', onclick: () => { p.placed = false; save(); go('home'); } }, 'Redo check-in'),
            h('button', { class: 'btn', onclick: () => exportData(p) }, 'Export data')),
          h('button', { class: 'btn quiet danger', onclick: () => {
            if (!A.confirmDelete) { A.confirmDelete = true; render(); return; }
            A.data.profiles = A.data.profiles.filter((x) => x.id !== p.id); save(); A.pid = null; go('profiles');
          } }, A.confirmDelete ? 'Tap again to delete ' + p.name : 'Delete player')),

        h('div', { class: 'glass pad span-12 stack' },
          h('h3', null, 'Skill path'),
          h('div', { class: 'scroll' }, h('table', { class: 'skills' },
            h('thead', null, h('tr', null, h('th', null, 'Skill'), h('th', null, 'Grade'), h('th', null, 'Status'), h('th', { class: 'n' }, 'Tries'), h('th', { class: 'n' }, 'Recent'))),
            h('tbody', null, SK.list.map((sk) => {
              const k = p.skills[sk.id]; const [st, tone] = skillStatus(p, sk);
              return h('tr', null,
                h('td', null, h('span', { class: 'row tight nowrap' }, h('i', { class: 'skdot', style: { background: sk.color } }), sk.name)),
                h('td', null, sk.grade), h('td', null, h('span', { class: 'badge ' + tone }, st)),
                h('td', { class: 'n' }, k && k.n ? k.n : '–'),
                h('td', { class: 'n' }, k && k.n ? Math.round(k.acc * 100) + '%' : k && k.assumed ? 'placed' : '–'));
            }))))),

        h('div', { class: 'glass pad span-12 stack' },
          h('h3', null, 'How each mode builds a session'),
          h('p', { class: 'small muted' }, `Success targets for ${firstName(p)}: ${SK.gradeLabel(p.grade).toLowerCase()} row, ${E.nudgeLabel(p)}. Targets follow enrolled grade (age), not skill level, and can drift one grade row either way based on early exits, “How did that feel?” answers and “Make it harder” presses.`),
          h('div', { class: 'scroll' }, h('table', { class: 'skills' },
            h('thead', null, h('tr', null, h('th', null, 'Mode'), h('th', null, `Aims for (${firstName(p)})`), h('th', null, 'K → Grade 5'), h('th', null, 'Mix'))),
            h('tbody', null, (() => { const T = E.targetsFor(p), pct = (x) => Math.round(x * 100) + '%', col = (i) => ['K', '1', '2', '3', '4', '5'].map((g) => Math.round(E.GRADE_TARGETS[g][i] * 100)).join(' · ');
              return [
                h('tr', null, h('td', null, h('b', null, 'Take it easy')), h('td', null, h('b', null, pct(T.easy)), ' right'), h('td', { class: 'nowrap small muted' }, col(0)), h('td', null, 'Mostly “You got this!” reps and reviews, an occasional stretch.')),
                h('tr', null, h('td', null, h('b', null, 'Give me some hard ones')), h('td', null, h('b', null, pct(T.balanced)), ' right'), h('td', { class: 'nowrap small muted' }, col(1)), h('td', null, 'Core practice alternating with “Stretch: tricky on purpose” problems.')),
                h('tr', null, h('td', null, h('b', null, 'Let’s do this!')), h('td', null, h('b', null, pct(T.stretch)), ' right'), h('td', { class: 'nowrap small muted' }, col(2)), h('td', null, 'Mostly stretch problems. Misses count less toward frustration because they’re expected.')),
              ]; })()))),
          h('p', { class: 'note' }, 'In every mode, difficulty moves after each answer toward the target. Hot streaks climb faster. “Make it harder” after a right answer steps up by an amount that depends on how fast and unaided that answer was, and counts for less if the next answers are misses. A skip steps down further than a miss. Two misses in a row brings a “You got this!” problem. A missed skill comes back a couple of questions later. Every session ends on a likely win.'))));
  }

  /* ---------- render + global events ---------- */
  function render() {
    const view = { profiles: screenProfiles, add: screenAdd, home: screenHome, practice: screenPractice, placed: screenPlaced, summary: screenSummary, dash: screenDash }[A.screen] || screenProfiles;
    app.replaceChildren(view());
  }

  document.addEventListener('keydown', (e) => {
    const ov = document.querySelector('.overlay');
    if (ov) { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); ov.querySelector('button').click(); } return; }
    if (A.screen !== 'practice' || !A.item) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (A.fb) { if (e.key === 'Enter') { e.preventDefault(); advance(); } return; }
    const it = A.item;
    if (it.kind === 'choice') { if (['<', '>', '='].includes(e.key)) { A.input = e.key; submit(false); } return; }
    if (/^[0-9]$/.test(e.key)) A.press(e.key);
    else if (e.key === 'Backspace') A.press('back');
    else if (e.key === '.' && it.kind === 'dec') A.press('.');
    else if ((e.key === '/' || e.key === 'Tab') && it.kind === 'frac') { e.preventDefault(); A.press('swap'); }
    else if (e.key === 'Enter') { e.preventDefault(); if (it.kind === 'frac' && !hasInput()) { if (A.input.focus === 'n' && A.input.n) A.press('swap'); } else submit(false); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) A.hiddenAt = performance.now();
    else if (A.hiddenAt != null) { A.hiddenMs += performance.now() - A.hiddenAt; A.hiddenAt = null; }
  });
  // Closing the app mid-session is the drop-off signal. Record it.
  window.addEventListener('pagehide', () => {
    const p = profile();
    if (p && A.mode === 'session' && A.run && !A.run.finished && A.run.answers.length) {
      A.run.finished = true;
      E.finishSession(A.run, p, { completed: E.sessionDone(A.run) });
      save();
    }
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  if (location.hash === '#debug') root.__mp = { A, render, advance, submit };
  render();
})(window);
