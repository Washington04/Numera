/* Numera effects: Pip the mascot (original character), confetti,
   and tiny synthesized sounds. No image or audio files needed. */
(function (root) {
  const MP = (root.MP = root.MP || {});
  let uid = 0;

  function mix(hex, other, t) {
    const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = p(hex), b = p(other);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }

  /* Pip: a gumdrop-shaped buddy with a leaf sprout, big sparkly eyes and
     rosy cheeks. Moods: idle, cheer, oops, think, wow. */
  // Buddy looks: same Pip, different ears, horns and hats.
  const LOOKS = [
    ['sprout', 'Sprout'], ['cat', 'Kitty'], ['bunny', 'Bunny'], ['bear', 'Bear'], ['panda', 'Panda'],
    ['fox', 'Fox'], ['robot', 'Robot'], ['unicorn', 'Unicorn'], ['dino', 'Dino'], ['crown', 'Royal'],
  ];
  function lookParts(look, id, deep) {
    const body = `url(#${id}b)`, pink = '#FF9EC0', gold = `url(#${id}g)`;
    let back = '', front = '', patches = '', noSprout = true;
    switch (look) {
      case 'cat':
        back = `<path d="M24 44 L28 6 L56 24 Z" fill="${body}"/><path d="M96 44 L92 6 L64 24 Z" fill="${body}"/><path d="M31 34 L33 15 L47 25 Z" fill="${pink}"/><path d="M89 34 L87 15 L73 25 Z" fill="${pink}"/>`; break;
      case 'fox':
        back = `<path d="M20 46 L22 0 L58 24 Z" fill="${body}"/><path d="M100 46 L98 0 L62 24 Z" fill="${body}"/><path d="M22 0 L21 16 L33 9 Z" fill="${deep}"/><path d="M98 0 L99 16 L87 9 Z" fill="${deep}"/>`;
        front = `<ellipse cx="31" cy="92" rx="15" ry="11" fill="#fff" opacity=".85"/><ellipse cx="89" cy="92" rx="15" ry="11" fill="#fff" opacity=".85"/>`; break;
      case 'bunny':
        back = `<ellipse cx="42" cy="-2" rx="10" ry="26" transform="rotate(-12 42 -2)" fill="${body}"/><ellipse cx="78" cy="-2" rx="10" ry="26" transform="rotate(12 78 -2)" fill="${body}"/><ellipse cx="42" cy="0" rx="4.5" ry="17" transform="rotate(-12 42 0)" fill="${pink}"/><ellipse cx="78" cy="0" rx="4.5" ry="17" transform="rotate(12 78 0)" fill="${pink}"/>`; break;
      case 'bear':
        back = `<circle cx="28" cy="28" r="14" fill="${body}"/><circle cx="92" cy="28" r="14" fill="${body}"/><circle cx="28" cy="28" r="6.5" fill="${deep}"/><circle cx="92" cy="28" r="6.5" fill="${deep}"/>`; break;
      case 'panda':
        back = `<circle cx="28" cy="28" r="14" fill="#2A2150"/><circle cx="92" cy="28" r="14" fill="#2A2150"/>`;
        patches = `<ellipse cx="42" cy="68" rx="17" ry="20" transform="rotate(20 42 68)" fill="#2A2150" opacity=".85"/><ellipse cx="78" cy="68" rx="17" ry="20" transform="rotate(-20 78 68)" fill="#2A2150" opacity=".85"/>`; break;
      case 'robot':
        front = `<path d="M60 17 L60 2" stroke="#8A93A8" stroke-width="4" stroke-linecap="round"/><circle cx="60" cy="0" r="6" fill="#FF5D73"/><circle cx="58" cy="-2" r="2" fill="#fff" opacity=".8"/><rect x="4" y="66" width="10" height="18" rx="4" fill="#AEB6C8"/><rect x="106" y="66" width="10" height="18" rx="4" fill="#AEB6C8"/>`; break;
      case 'unicorn':
        front = `<path d="M52 22 L60 -12 L68 22 Z" fill="${gold}"/><path d="M55 12 L66 8 M54 4 L64 1" stroke="#fff" stroke-width="2" opacity=".7"/>`;
        back = `<path d="M70 20 C84 10 96 18 100 32 C92 26 84 26 78 30 Z" fill="#B794F6"/><path d="M76 24 C88 18 100 28 102 42 C94 34 86 32 80 34 Z" fill="#F783AC"/>`; break;
      case 'dino':
        back = `<path d="M34 30 L40 8 L50 24 Z" fill="${deep}"/><path d="M50 22 L60 0 L70 22 Z" fill="${deep}"/><path d="M70 24 L80 8 L86 30 Z" fill="${deep}"/>`; break;
      case 'crown':
        front = `<path d="M38 24 L40 2 L50 13 L60 -4 L70 13 L80 2 L82 24 Z" fill="${gold}" stroke="#E0A000" stroke-width="1.5" stroke-linejoin="round"/><circle cx="60" cy="12" r="3.5" fill="#FF5D73"/><circle cx="46" cy="18" r="2.5" fill="#4DABF7"/><circle cx="74" cy="18" r="2.5" fill="#3DDC97"/>`; break;
      default: noSprout = false;
    }
    return { back, front, patches, sprout: !noSprout };
  }

  function pip(opts) {
    const o = Object.assign({ color: '#4DABF7', mood: 'idle', size: 120, cls: '', look: 'sprout' }, opts || {});
    const id = 'pip' + (++uid);
    const light = mix(o.color, '#ffffff', 0.55), deep = mix(o.color, '#1a1040', 0.35);
    const ink = '#2A2150';
    const lk = lookParts(o.look, id, deep);
    const eyeY = o.mood === 'think' ? 63 : 66;
    const irisDX = o.mood === 'think' ? 3 : 0, irisDY = o.mood === 'think' ? -3 : 1;
    const eye = (cx) => {
      if (o.mood === 'cheer') return `<path d="M${cx - 10} ${eyeY + 2} Q${cx} ${eyeY - 9} ${cx + 10} ${eyeY + 2}" fill="none" stroke="${ink}" stroke-width="4.5" stroke-linecap="round"/>`;
      const star = o.mood === 'wow'
        ? `<path d="M${cx + irisDX} ${eyeY - 7} L${cx + 2 + irisDX} ${eyeY - 1} L${cx + 8 + irisDX} ${eyeY + 1} L${cx + 2 + irisDX} ${eyeY + 3} L${cx + irisDX} ${eyeY + 9} L${cx - 2 + irisDX} ${eyeY + 3} L${cx - 8 + irisDX} ${eyeY + 1} L${cx - 2 + irisDX} ${eyeY - 1} Z" fill="#fff"/>`
        : `<circle cx="${cx - 3.5 + irisDX}" cy="${eyeY - 4 + irisDY}" r="3.8" fill="#fff"/><circle cx="${cx + 3.5 + irisDX}" cy="${eyeY + 4 + irisDY}" r="1.8" fill="#fff" opacity=".9"/>`;
      return `<g class="pip-eye"><ellipse cx="${cx}" cy="${eyeY}" rx="13" ry="15" fill="#fff"/>` +
        `<ellipse cx="${cx + irisDX}" cy="${eyeY + irisDY + 1}" rx="9.5" ry="11.5" fill="url(#${id}i)"/>${star}</g>`;
    };
    const mouth = {
      idle: `<path d="M51 86 Q60 95 69 86" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`,
      cheer: `<path d="M47 83 Q60 104 73 83 Z" fill="${ink}"/><path d="M53 93 Q60 99 67 93 Q60 90 53 93Z" fill="#FF7BA5"/>`,
      wow: `<ellipse cx="60" cy="90" rx="7" ry="8" fill="${ink}"/>`,
      oops: `<path d="M53 89 Q60 94 67 89" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`,
      think: `<path d="M53 89 L66 87" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`,
    }[o.mood] || '';
    const brows = o.mood === 'oops'
      ? `<path d="M35 45 Q43 40 51 44" fill="none" stroke="${deep}" stroke-width="3" stroke-linecap="round"/><path d="M69 44 Q77 40 85 45" fill="none" stroke="${deep}" stroke-width="3" stroke-linecap="round"/>` : '';
    const armsUp = o.mood === 'cheer' || o.mood === 'wow';
    const arms = armsUp
      ? `<ellipse cx="13" cy="54" rx="7" ry="13" transform="rotate(-28 13 54)" fill="url(#${id}b)"/><ellipse cx="107" cy="54" rx="7" ry="13" transform="rotate(28 107 54)" fill="url(#${id}b)"/>`
      : `<ellipse cx="13" cy="88" rx="7" ry="12" transform="rotate(18 13 88)" fill="url(#${id}b)"/><ellipse cx="107" cy="88" rx="7" ry="12" transform="rotate(-18 107 88)" fill="url(#${id}b)"/>`;
    const sparkles = armsUp
      ? `<g class="pip-spark" fill="#FFD43B"><path d="M8 20 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/><path d="M110 14 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/></g>` : '';
    return `<svg class="pip pip-${o.mood} ${o.cls}" width="${o.size}" height="${Math.round(o.size * 1.2)}" viewBox="0 -14 120 144" aria-hidden="true">
<defs>
<radialGradient id="${id}b" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="${light}"/><stop offset=".55" stop-color="${o.color}"/><stop offset="1" stop-color="${deep}"/></radialGradient>
<linearGradient id="${id}i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B2350"/><stop offset="1" stop-color="#6A58C8"/></linearGradient>
<linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8CF0B0"/><stop offset="1" stop-color="#22B573"/></linearGradient>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE58A"/><stop offset="1" stop-color="#FFB400"/></linearGradient>
</defs>
<ellipse class="pip-shadow" cx="60" cy="124" rx="34" ry="5" fill="rgba(40,30,90,.18)"/>
<g class="pip-body">
${lk.back}${arms}
<path d="M60 16 C92 16 108 46 108 78 C108 106 88 118 60 118 C32 118 12 106 12 78 C12 46 28 16 60 16Z" fill="url(#${id}b)"/>
${lk.sprout ? `<path d="M60 17 C 60 10 61 6 63 2" fill="none" stroke="#22B573" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="72" cy="7" rx="10" ry="5.5" transform="rotate(-25 72 7)" fill="url(#${id}l)"/>` : ''}
<ellipse cx="40" cy="38" rx="14" ry="8" transform="rotate(-25 40 38)" fill="#fff" opacity=".5"/>
${lk.patches}${brows}${eye(44)}${eye(76)}
<ellipse cx="31" cy="84" rx="7.5" ry="4.5" fill="#FF7BA5" opacity=".55"/><ellipse cx="89" cy="84" rx="7.5" ry="4.5" fill="#FF7BA5" opacity=".55"/>
${mouth}${lk.front}
</g>${sparkles}</svg>`;
  }

  /* ---------- confetti ---------- */
  const reduce = () => root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = ['#FF6B6B', '#FFC53D', '#3DDC97', '#4DABF7', '#9775FA', '#F783AC', '#FF9F43'];
  function confetti(amount, origin) {
    if (reduce()) return;
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    const ox = origin ? origin.x : innerWidth / 2, oy = origin ? origin.y : innerHeight * 0.4;
    const parts = Array.from({ length: amount || 90 }, () => {
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 9;
      return { x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 6, r: 4 + Math.random() * 5, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: COLORS[Math.floor(Math.random() * COLORS.length)], shape: Math.floor(Math.random() * 3) };
    });
    const t0 = performance.now();
    function frame(t) {
      const age = (t - t0) / 1000;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      parts.forEach((p) => {
        p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age / 1.8); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.6, 0, 7); ctx.fill(); }
        else { ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? p.r * 0.45 : p.r; ctx.lineTo(Math.cos(i * Math.PI / 4) * rr, Math.sin(i * Math.PI / 4) * rr); } ctx.fill(); }
        ctx.restore();
      });
      if (age < 1.9) requestAnimationFrame(frame); else cv.remove();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- sound ---------- */
  let actx = null;
  function tone(freq, start, dur, type, vol) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, actx.currentTime + start);
    g.gain.linearRampToValueAtTime(vol || 0.16, actx.currentTime + start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + start + dur);
    o.connect(g).connect(actx.destination);
    o.start(actx.currentTime + start); o.stop(actx.currentTime + start + dur + 0.05);
  }
  function play(kind) {
    try {
      actx = actx || new (root.AudioContext || root.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      if (kind === 'correct') { tone(784, 0, 0.18); tone(988, 0.08, 0.2); tone(1319, 0.16, 0.35); }
      else if (kind === 'big') { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.07, 0.35, 'triangle', 0.13)); }
      else if (kind === 'almost') { tone(440, 0, 0.18, 'triangle', 0.1); tone(392, 0.12, 0.28, 'triangle', 0.1); }
      else if (kind === 'level') { [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * 0.09, 0.4, 'triangle', 0.12)); }
      else if (kind === 'tap') tone(660, 0, 0.05, 'sine', 0.05);
    } catch (e) { /* audio unavailable */ }
  }

  MP.FX = { pip, confetti, play, mix, LOOKS };
})(typeof window !== 'undefined' ? window : globalThis);
