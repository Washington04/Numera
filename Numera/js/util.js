/* Numera: small shared helpers. Classic script (no modules) so the app
   runs by double-clicking index.html, with no server or install. */
(function (root) {
  const MP = (root.MP = root.MP || {});
  const U = {};

  U.rand = Math.random;
  // Deterministic RNG for tests and demo data (mulberry32).
  U.seed = function (s) {
    let a = s >>> 0;
    U.rand = function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  U.unseed = function () { U.rand = Math.random; };

  U.int = (lo, hi) => lo + Math.floor(U.rand() * (hi - lo + 1));
  U.pick = (arr) => arr[Math.floor(U.rand() * arr.length)];
  U.chance = (p) => U.rand() < p;
  U.clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.lerpInt = (a, b, t) => Math.round(U.lerp(a, b, U.clamp(t, 0, 1)));
  U.gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; };
  U.logistic = (x) => 1 / (1 + Math.exp(-x));
  U.logit = (p) => Math.log(p / (1 - p));
  U.uid = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(U.rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  U.mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  U.median = (xs) => {
    if (!xs.length) return 0;
    const s = xs.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  // Round away float noise: 0.1 + 0.2 -> 0.3
  U.fix = (x, places = 4) => Math.round(x * 10 ** places) / 10 ** places;
  U.fmtDec = (x) => String(U.fix(x));
  U.dayKey = (t) => { const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

  MP.U = U;
})(typeof window !== 'undefined' ? window : globalThis);
