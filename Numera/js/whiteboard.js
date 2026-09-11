/* Numera dry-erase whiteboard: plays a worked example step by step,
   written in coloured marker. Step data comes from js/skills.js (item.wb). */
(function (root) {
  const MP = (root.MP = root.MP || {});

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const colors = (s) => esc(s).replace(/\{(\d):([^}]*)\}/g, (m, c, t) => `<span class="mk${c}">${t}</span>`);
  function rich(str) {
    let out = '', last = 0, m;
    const re = /\[([^\]\/]+)\/([^\]]+)\]/g;
    while ((m = re.exec(str))) {
      out += colors(str.slice(last, m.index));
      out += `<span class="wfr"><span>${colors(m[1])}</span><span>${colors(m[2])}</span></span>`;
      last = re.lastIndex;
    }
    return out + colors(str.slice(last));
  }
  const plain = (s) => String(s).replace(/\{\d:([^}]*)\}/g, '$1').replace(/[\[\]]/g, '');
  const INK = { 1: 'var(--m1)', 2: 'var(--m2)', 3: 'var(--m3)', 4: 'var(--m4)' };

  /* ---------- step renderers: return [html, durationMs] ---------- */
  function dots(st) {
    const frames = [];
    const chunk = (list) => { for (let i = 0; i < list.length; i += 10) frames.push(list.slice(i, i + 10)); };
    if (st.pack) chunk(st.groups.flatMap((g) => Array.from({ length: g.n }, () => g)));
    else st.groups.forEach((g) => g.n && chunk(Array.from({ length: g.n }, () => g)));
    let k = 0;
    const html = `<div class="wb-dots">${frames.map((f) => `<div class="wb-frame">${f.map((g) => `<i class="seq${g.crossed ? ' x' : ''}" style="--t:${k++};background:${INK[g.c] || INK[1]}"></i>`).join('')}${'<b></b>'.repeat(10 - f.length)}</div>`).join('')}</div>`;
    return [html.replace(/--t:(\d+)/g, (m, n) => `--t:${(n * 0.06).toFixed(2)}`), Math.min(k, 24) * 60 + 700];
  }

  function numberLine(st) {
    const W = 560, pad = 26, axis = 72;
    const range = st.max - st.min;
    const x = (v) => pad + ((v - st.min) / range) * (W - 2 * pad);
    const step = range <= 20 ? 1 : range <= 50 ? 5 : 10;
    const labelEvery = range <= 12 ? 1 : range <= 20 ? 2 : step;
    let svg = `<line x1="${pad - 10}" y1="${axis}" x2="${W - pad + 10}" y2="${axis}" class="wb-stroke"/>`;
    const markVals = st.marks.map((m) => m.v).concat(st.hops.map((h) => h.to));
    for (let v = Math.ceil(st.min / step) * step; v <= st.max; v += step) {
      svg += `<line x1="${x(v)}" y1="${axis - 7}" x2="${x(v)}" y2="${axis + 7}" class="wb-stroke thin"/>`;
      if (v % labelEvery === 0 && !markVals.some((mv) => mv !== v && Math.abs(x(mv) - x(v)) < 16)) svg += `<text x="${x(v)}" y="${axis + 26}" class="wb-tick">${v}</text>`;
    }
    st.marks.forEach((m) => {
      svg += `<circle cx="${x(m.v)}" cy="${axis}" r="7" style="fill:${INK[m.c]}"/><text x="${x(m.v)}" y="${axis + 27}" class="wb-tick strong" style="fill:${INK[m.c]}">${m.v}</text>`;
    });
    st.hops.forEach((hp, i) => {
      const x1 = x(hp.from), x2 = x(hp.to), hgt = Math.min(46, 16 + Math.abs(x2 - x1) * 0.35);
      const delay = (0.2 + i * 0.42).toFixed(2);
      svg += `<path d="M${x1} ${axis - 4} Q${(x1 + x2) / 2} ${axis - 4 - hgt * 2} ${x2} ${axis - 4}" pathLength="1" class="wb-hop" style="stroke:${INK[hp.c]};--d:${delay}s"/>`;
      svg += `<text x="${(x1 + x2) / 2}" y="${axis - hgt - 10}" class="wb-hoplabel seq" style="fill:${INK[hp.c]};--t:${delay}">${hp.label}</text>`;
      svg += `<circle cx="${x2}" cy="${axis}" r="4.5" class="seq" style="fill:${INK[hp.c]};--t:${(+delay + 0.35).toFixed(2)}"/>`;
    });
    return [`<svg class="wb-line" viewBox="0 0 ${W} 110" role="img" aria-label="number line">${svg}</svg>`, st.hops.length * 420 + 800];
  }

  // Column arithmetic with animated carries (+) and trades (−), decimals too.
  function column(st) {
    const p = st.places || 0, f = 10 ** p;
    const A = Math.round(st.top * f), B = Math.round(st.bottom * f);
    const R = st.op === '+' ? A + B : A - B;
    const minLen = p + 1;
    const W = Math.max(String(A).length, String(B).length, String(R).length, minLen);
    const pad = (n) => String(n).padStart(Math.max(String(n).length, minLen), '0').padStart(W, ' ').split('').map((c) => (c === ' ' ? null : +c));
    const a = pad(A), b = pad(B);
    const res = Array(W).fill(null), above = Array(W).fill(null), struck = Array(W).fill(false), tRes = Array(W).fill(0), tAbove = Array(W).fill(0);
    let order = 0;
    if (st.op === '+') {
      let carry = 0;
      for (let i = W - 1; i >= 0; i--) {
        const s = (a[i] || 0) + (b[i] || 0) + carry;
        carry = s >= 10 ? 1 : 0;
        res[i] = s % 10; tRes[i] = order;
        if (carry && i > 0) { above[i - 1] = 1; tAbove[i - 1] = order; }
        order++;
      }
    } else {
      const t = a.map((d) => d || 0);
      for (let i = W - 1; i >= 0; i--) {
        if (t[i] < (b[i] || 0) && i > 0) {
          t[i] += 10; t[i - 1] -= 1;
          above[i] = t[i]; struck[i] = true; tAbove[i] = order;
          above[i - 1] = t[i - 1]; struck[i - 1] = true; tAbove[i - 1] = order;
        } else if (struck[i]) { above[i] = t[i]; }
        res[i] = t[i] - (b[i] || 0); tRes[i] = order + 0.5;
        order++;
      }
      // hide leading zeros of the result (keep the one before a decimal point)
      for (let i = 0; i < W - 1 - p; i++) { if (res[i] === 0) res[i] = null; else break; }
    }
    const pointAt = p ? W - p : -1; // index of first digit after the point
    const cols = [];
    const cell = (v, cls, t) => `<span class="${cls}${t != null ? ' seq' : ''}"${t != null ? ` style="--t:${(t * 0.65 + 0.3).toFixed(2)}"` : ''}>${v == null ? '' : v}</span>`;
    const rowCells = (fn) => { let out = ''; for (let i = 0; i < W; i++) { if (i === pointAt) out += fn('pt', i); out += fn('d', i); } return out; };
    const nCols = W + (p ? 1 : 0) + 1;
    let html = `<div class="wb-col" style="grid-template-columns: .8em repeat(${nCols - 1}, auto)">`;
    html += '<span></span>' + rowCells((k, i) => k === 'pt' ? '<span class="pt"></span>' : above[i] == null ? '<span class="sm"></span>' : cell(above[i], 'sm mk4', tAbove[i]));
    html += '<span></span>' + rowCells((k, i) => k === 'pt' ? '<span class="pt">.</span>' : `<span class="${struck[i] ? 'strike' : ''}">${a[i] == null ? '' : a[i]}${struck[i] ? `<i class="seq" style="--t:${(tAbove[i] * 0.65 + 0.3).toFixed(2)}"></i>` : ''}</span>`);
    html += `<span class="op">${st.op}</span>` + rowCells((k, i) => k === 'pt' ? '<span class="pt">.</span>' : `<span>${b[i] == null ? '' : b[i]}</span>`);
    html += `<span class="rule" style="grid-column: 1 / -1"></span>`;
    html += '<span></span>' + rowCells((k, i) => k === 'pt' ? cell('.', 'pt mk3', tRes[W - 1]) : cell(res[i], 'mk3', res[i] == null ? null : tRes[i]));
    html += '</div>';
    cols.push(html);
    return [cols.join(''), order * 650 + 900];
  }

  function arrayStep(st) {
    let k = 0;
    const rows = Array.from({ length: st.rows }, (_, r) => `<div class="wb-arow seq" style="--t:${(r * 0.25).toFixed(2)}">${'<i></i>'.repeat(st.cols)}</div>`).join('');
    return [`<div class="wb-array">${rows}</div>`, st.rows * 250 + 700 + k];
  }

  function area(st) {
    const cells = [];
    let t = 0;
    let html = `<div class="wb-area" style="grid-template-columns: auto repeat(${st.cols.length}, minmax(62px, 1fr))"><span></span>`;
    st.cols.forEach((c) => { html += `<span class="hd mk1">${c}</span>`; });
    st.rows.forEach((r) => {
      html += `<span class="hd side mk2">${r}</span>`;
      st.cols.forEach((c) => { html += `<span class="cell"><b class="seq mk3" style="--t:${(0.3 + t * 0.55).toFixed(2)}">${r * c}</b><small>${r} × ${c}</small></span>`; t++; cells.push(r * c); });
    });
    html += '</div>';
    return [html, t * 550 + 900];
  }

  function bars(st) {
    let t = 0;
    const html = `<div class="wb-bars">${st.bars.map((b) => {
      const cells = [];
      let filled = 0;
      b.fills.forEach((f) => { for (let i = 0; i < f.n; i++) cells.push({ c: f.c, t: t++ }); filled += f.n; });
      for (let i = filled; i < b.parts; i++) cells.push(null);
      return `<div class="wb-bar" style="grid-template-columns: repeat(${b.parts}, 1fr)">${cells.map((c) => `<span${c ? ` class="seq" style="--t:${(c.t * 0.12 + 0.2).toFixed(2)};background:${INK[c.c]}"` : ''}>${b.labels != null ? `<em>${b.labels}</em>` : ''}</span>`).join('')}</div>`;
    }).join('')}</div>`;
    return [html, Math.min(t, 20) * 120 + 800];
  }

  function pie(st) {
    const R = 58, cx = 64, cy = 64;
    let svg = '';
    for (let i = 0; i < st.parts; i++) {
      const a0 = (i / st.parts) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / st.parts) * 2 * Math.PI - Math.PI / 2;
      const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0)], p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
      svg += `<path d="M${cx},${cy} L${p0[0].toFixed(1)},${p0[1].toFixed(1)} A${R},${R} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p1[0].toFixed(1)},${p1[1].toFixed(1)} Z" class="${i < st.shaded ? 'seq' : ''}" style="fill:${i < st.shaded ? 'var(--m2)' : 'transparent'};stroke:var(--mk);stroke-width:3;stroke-linejoin:round;--t:${(i * 0.18 + 0.2).toFixed(2)}"/>`;
    }
    return [`<svg class="wb-pie" viewBox="0 0 128 128" role="img" aria-label="fraction circle">${svg}</svg>`, st.shaded * 180 + 800];
  }

  function base10(st) {
    const rods = Array.from({ length: st.tens }, (_, i) => `<span class="rod seq" style="--t:${(i * 0.12).toFixed(2)}">${'<i></i>'.repeat(10)}</span>`).join('');
    const cubes = Array.from({ length: st.ones }, (_, i) => `<i class="cube seq" style="--t:${(st.tens * 0.12 + i * 0.08 + 0.2).toFixed(2)}"></i>`).join('');
    return [`<div class="wb-b10"><div class="rods">${rods}</div><div class="cubes">${cubes}</div></div>`, st.tens * 120 + st.ones * 80 + 800];
  }

  function place(st) {
    return [`<div class="wb-place">${st.cols.map(([name, v, c], i) => `<div><small>${name}</small><b class="seq mk${c}" style="--t:${(i * 0.3 + 0.2).toFixed(2)}">${v}</b></div>`).join('')}</div>`, st.cols.length * 300 + 800];
  }

  // Decimal point hopping right: 2.25 × 1000 -> 2250
  function shift(st) {
    const [ip, fp = ''] = st.num.split('.');
    let digits = (ip + fp).split('');
    const p0 = ip.length, p1 = p0 + st.places;
    const extra = Math.max(0, p1 - digits.length);
    digits = digits.concat(Array(extra).fill('0'));
    const bw = 46, pad = 20, y = 60;
    const W = pad * 2 + digits.length * bw;
    const xAfter = (i) => pad + i * bw;
    let svg = '';
    digits.forEach((d, i) => {
      const zero = i >= digits.length - extra;
      svg += `<rect x="${xAfter(i) + 3}" y="${y - 38}" width="${bw - 6}" height="48" rx="8" class="wb-box${zero ? ' seq' : ''}" style="--t:${(st.places * 0.5 + 0.2).toFixed(2)}"/>`;
      svg += `<text x="${xAfter(i) + bw / 2}" y="${y}" class="wb-digit${zero ? ' seq' : ''}" style="${zero ? 'fill:var(--m4);' : ''}--t:${(st.places * 0.5 + 0.2).toFixed(2)}">${d}</text>`;
    });
    svg += `<circle cx="${xAfter(p0)}" cy="${y + 4}" r="5.5" class="wb-oldpt"/>`;
    for (let j = 0; j < st.places; j++) {
      const x1 = xAfter(p0 + j), x2 = xAfter(p0 + j + 1), d = (0.2 + j * 0.5).toFixed(2);
      svg += `<path d="M${x1} ${y + 12} Q${(x1 + x2) / 2} ${y + 44} ${x2} ${y + 12}" pathLength="1" class="wb-hop" style="stroke:var(--m2);--d:${d}s"/>`;
      svg += `<text x="${(x1 + x2) / 2}" y="${y + 50}" class="wb-hoplabel seq" style="fill:var(--m2);--t:${d}">${j + 1}</text>`;
    }
    svg += `<circle cx="${xAfter(p1)}" cy="${y + 4}" r="6.5" class="seq" style="fill:var(--m3);--t:${(st.places * 0.5 + 0.3).toFixed(2)}"/>`;
    return [`<svg class="wb-shift" viewBox="0 0 ${W} 120" style="max-width:${W}px" role="img" aria-label="decimal point moves ${st.places} places right">${svg}</svg>`, st.places * 500 + 1000];
  }

  function stepHTML(st) {
    switch (st.t) {
      case 'say': return [`<p class="wb-say">${rich(st.s)}</p>`, Math.min(2200, 700 + plain(st.s).length * 22)];
      case 'eq': return [`<p class="wb-eq">${rich(st.s)}</p>`, Math.min(2000, 700 + plain(st.s).length * 30)];
      case 'dots': return dots(st);
      case 'line': return numberLine(st);
      case 'column': return column(st);
      case 'array': return arrayStep(st);
      case 'area': return area(st);
      case 'bars': return bars(st);
      case 'pie': return pie(st);
      case 'base10': return base10(st);
      case 'place': return place(st);
      case 'shift': return shift(st);
    }
    return ['', 0];
  }

  /* ---------- player ---------- */
  function create(steps, opts) {
    opts = opts || {};
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const wrap = document.createElement('section');
    wrap.className = 'wb';
    wrap.setAttribute('aria-label', 'Worked example');
    const rendered = steps.filter(Boolean).map(stepHTML);
    wrap.innerHTML = `<div class="wb-board">${rendered.map(([html], i) => `<div class="wb-step" data-i="${i}">${html}</div>`).join('')}</div>
      <div class="wb-tray"><span class="wb-marker m1"></span><span class="wb-marker m2"></span><span class="wb-marker m3"></span><span class="wb-eraser"></span>
      <div class="wb-ctl"><button type="button" class="wb-btn" data-act="replay">↻ Replay</button><button type="button" class="wb-btn" data-act="all">Show all</button></div></div>`;
    const els = [...wrap.querySelectorAll('.wb-step')];
    let timer = null, i = 0;
    const show = (k) => { els[k].classList.add('on'); if (opts.onStep) opts.onStep(k); };
    function tick() {
      if (i >= els.length) { wrap.classList.add('done'); return; }
      show(i);
      const dur = rendered[i][1];
      i++;
      timer = setTimeout(tick, dur);
    }
    function play() { clearTimeout(timer); els.forEach((e) => e.classList.remove('on')); wrap.classList.remove('done', 'instant'); i = 0; timer = setTimeout(tick, 250); }
    function all() { clearTimeout(timer); wrap.classList.add('instant', 'done'); els.forEach((e) => e.classList.add('on')); i = els.length; }
    wrap.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'replay') play(); else all();
    });
    wrap.stop = () => clearTimeout(timer);
    if (reduce) all(); else play();
    return wrap;
  }

  MP.Whiteboard = { create, rich };
})(typeof window !== 'undefined' ? window : globalThis);
