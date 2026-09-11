/* Numera skill ladder, K through grade 5.
   Every skill owns a band [lo, hi] on one internal 0-100 ability scale
   (never shown to children). A generator receives d in [0,1] (position
   inside the band) and returns a problem, including "wb": the whiteboard
   steps for a worked example.

   Whiteboard markup, used in say/eq strings:
     {1:text}   colored marker (1 blue, 2 pink, 3 green, 4 yellow)
     [a/b]      stacked fraction; a and b may contain colour tokens */
(function (root) {
  const MP = (root.MP = root.MP || {});
  const U = MP.U;

  // Candy palette for skill identity (glossy chips, progress path).
  const TONE = ['#FF6B6B', '#FF9F43', '#FFC53D', '#3DDC97', '#4DABF7', '#9775FA', '#F783AC', '#20C997'];

  const NAMES = ['Maya', 'Leo', 'Ava', 'Sam', 'Noor', 'Kai', 'Zoe', 'Eli', 'Rosa', 'Theo', 'Ivy', 'Omar'];
  const THINGS = ['stickers', 'shells', 'marbles', 'crayons', 'apples', 'stamps', 'rocks', 'cards'];

  const C = (i, x) => `{${i}:${x}}`;
  const say = (s) => ({ t: 'say', s });
  const eq = (s) => ({ t: 'eq', s });
  const frac = (n, d) => ({ n, d });
  const fracStr = (f) => f.n + '/' + f.d;
  const F = (n, d) => `[${n}/${d}]`;
  // Number line with unit hops (or one big hop when there are many).
  function hops(from, n, dir, c) {
    const out = [];
    if (n <= 0) return out;
    if (n > 6) return [{ from, to: from + dir * n, c, label: (dir > 0 ? '+' : '−') + n }];
    for (let i = 0; i < n; i++) out.push({ from: from + dir * i, to: from + dir * (i + 1), c, label: (dir > 0 ? '+' : '−') + '1' });
    return out;
  }
  const line = (min, max, hopsArr, marks) => ({ t: 'line', min, max, hops: hopsArr || [], marks: marks || [] });
  const placeChart = (cols) => ({ t: 'place', cols });

  const skills = [
    {
      id: 'count', name: 'Counting', grade: 'K', lo: -10, hi: 10, t: 6,
      gen(d) {
        const n = U.int(U.lerpInt(1, 9, d), U.lerpInt(3, 20, d));
        const parts = Array(Math.floor(n / 5)).fill(5);
        if (n % 5) parts.push(n % 5);
        return {
          prompt: 'How many dots?', kind: 'int', answer: n,
          visual: { type: 'dots', groups: [{ n, tone: 4 }] },
          hint: 'Touch each dot as you count. Each full row has 5.',
          explain: `There are ${n} dots.`,
          wb: [
            { t: 'dots', groups: [{ n, c: 1 }] },
            n >= 5 ? say(`Each full row has ${C(1, 5)} dots.`) : say('Touch and count each dot.'),
            eq(n >= 5 ? `${parts.join(' + ')} = ${C(3, n)}` : `${Array.from({ length: n }, (_, i) => i + 1).join(', ')} … ${C(3, n)}`),
          ],
        };
      },
    },
    {
      id: 'compare', name: 'Bigger or smaller', grade: 'K', lo: 4, hi: 16, t: 5,
      gen(d) {
        const max = d < 0.3 ? 10 : d < 0.7 ? 30 : 100;
        const a = U.int(0, max);
        const b = U.chance(0.15) ? a : U.int(0, max);
        const ans = a < b ? '<' : a > b ? '>' : '=';
        const lo = Math.floor(Math.min(a, b) / 10) * 10, hi = Math.max(lo + 10, Math.ceil((Math.max(a, b) + 1) / 10) * 10);
        return {
          prompt: 'Which sign goes in the gap?', display: `${a}  ?  ${b}`, kind: 'choice',
          choices: ['<', '=', '>'], answer: ans,
          hint: 'The open side of < or > faces the bigger number.',
          explain: a === b ? `${a} and ${b} are the same, so =.` : `${Math.max(a, b)} is bigger, so ${a} ${ans} ${b}.`,
          wb: [
            line(lo, hi, [], [{ v: a, c: 1 }, { v: b, c: 2 }]),
            say(a === b ? 'They land on the same spot. Same number!' : 'On a number line, the one further right is bigger.'),
            a === b ? eq(`${C(1, a)} = ${C(2, b)}`) : eq(`${C(1, a)} ${C(3, ans)} ${C(2, b)}`),
            a === b ? say('Same amount, so we use =.') : say(`The open mouth faces ${C(a > b ? 1 : 2, Math.max(a, b))}, the bigger number.`),
          ],
        };
      },
    },
    {
      id: 'add10', name: 'Adding within 10', grade: 'K', lo: 8, hi: 20, t: 5,
      gen(d) {
        const s = U.int(U.lerpInt(3, 6, d), U.lerpInt(5, 10, d));
        const a = U.int(0, s), b = s - a, big = Math.max(a, b), small = Math.min(a, b);
        return {
          prompt: 'Add.', display: `${a} + ${b} = ?`, kind: 'int', answer: s,
          visual: d < 0.5 ? { type: 'dots', groups: [{ n: a, tone: 4 }, { n: b, tone: 6 }] } : null,
          hint: `Start at ${big} and count on ${small} more.`,
          explain: `${a} + ${b} = ${s}.`,
          wb: [
            { t: 'dots', groups: [{ n: a, c: 1 }, { n: b, c: 2 }] },
            say(`Start at the bigger number, ${C(a >= b ? 1 : 2, big)}. Count on ${C(a >= b ? 2 : 1, small)}.`),
            line(0, 10, hops(big, small, 1, 2), [{ v: big, c: 1 }]),
            eq(`${C(1, a)} + ${C(2, b)} = ${C(3, s)}`),
          ],
        };
      },
    },
    {
      id: 'sub10', name: 'Taking away within 10', grade: 'K', lo: 12, hi: 24, t: 6,
      gen(d) {
        const a = U.int(U.lerpInt(3, 6, d), U.lerpInt(6, 10, d));
        const b = U.int(1, a);
        return {
          prompt: 'Subtract.', display: `${a} − ${b} = ?`, kind: 'int', answer: a - b,
          visual: d < 0.5 ? { type: 'dots', groups: [{ n: a - b, tone: 4 }, { n: b, tone: 4, crossed: true }] } : null,
          hint: `Start at ${a} and count back ${b}.`,
          explain: `${a} take away ${b} leaves ${a - b}.`,
          wb: [
            { t: 'dots', groups: [{ n: a - b, c: 1 }, { n: b, c: 2, crossed: true }] },
            say(`Start with ${C(1, a)}. Take away ${C(2, b)}.`),
            line(0, 10, hops(a, b, -1, 2), [{ v: a, c: 1 }]),
            eq(`${C(1, a)} − ${C(2, b)} = ${C(3, a - b)}`),
          ],
        };
      },
    },
    {
      id: 'add20', name: 'Adding within 20', grade: '1', lo: 18, hi: 30, t: 6,
      gen(d) {
        let a, b;
        if (d < 0.35) { a = U.int(8, 15); b = U.int(1, 3); }
        else { a = U.int(U.lerpInt(5, 7, d), 9); b = U.int(Math.max(11 - a, 2), 9); }
        if (U.chance(0.5)) [a, b] = [b, a];
        const s = a + b, big = Math.max(a, b), small = Math.min(a, b);
        const need = 10 - big;
        const makeTen = big < 10 && small > need;
        const story = U.chance(0.25);
        const who = U.pick(NAMES), what = U.pick(THINGS);
        const wb = makeTen ? [
          { t: 'dots', pack: true, groups: [{ n: big, c: 1 }, { n: small, c: 2 }] },
          say(`Make a ten! ${C(1, big)} needs ${C(2, need)} more to fill the frame.`),
          eq(`${C(1, big)} + ${C(2, small)} = ${C(1, big)} + ${C(2, need)} + ${C(2, small - need)}`),
          eq(`= ${C(4, 10)} + ${C(2, small - need)} = ${C(3, s)}`),
        ] : [
          say(`Start at ${C(1, big)}. Count on ${C(2, small)}.`),
          line(Math.max(0, big - 2), Math.min(20, Math.max(big + small + 2, big + 8)), hops(big, small, 1, 2), [{ v: big, c: 1 }]),
          eq(`${C(1, big)} + ${C(2, small)} = ${C(3, s)}`),
        ];
        if (story) wb.unshift(say(`${who} starts with ${C(1, a)} and gets ${C(2, b)} more. "More" means add.`));
        return {
          prompt: story ? `${who} has ${a} ${what}. ${who} gets ${b} more. How many ${what} now?` : 'Add.',
          display: story ? null : `${a} + ${b} = ?`, kind: 'int', answer: s,
          hint: makeTen ? `Make a ten: ${big} + ${need} = 10.` : `Start at ${big} and count on ${small}.`,
          explain: `${a} + ${b} = ${s}.`, wb,
        };
      },
    },
    {
      id: 'sub20', name: 'Taking away within 20', grade: '1', lo: 22, hi: 34, t: 7,
      gen(d) {
        const a = U.int(11, U.lerpInt(14, 20, d));
        const ones = a % 10;
        const b = d < 0.4 ? U.int(1, Math.max(1, ones)) : U.int(Math.min(ones + 1, 9), 9);
        const r = a - b;
        const bridge = b > ones && ones > 0;
        return {
          prompt: 'Subtract.', display: `${a} − ${b} = ?`, kind: 'int', answer: r,
          hint: `Think addition: ${b} + ? = ${a}.`,
          explain: `${a} − ${b} = ${r}.`,
          wb: bridge ? [
            say(`Take away ${C(2, b)} in two jumps. First jump to 10.`),
            line(Math.max(0, r - 1), a + 1, [{ from: a, to: 10, c: 2, label: '−' + ones }, { from: 10, to: r, c: 4, label: '−' + (b - ones) }], [{ v: a, c: 1 }]),
            eq(`${C(1, a)} − ${C(2, ones)} = 10`),
            eq(`10 − ${C(4, b - ones)} = ${C(3, r)}`),
            say(`${C(2, ones)} + ${C(4, b - ones)} is ${b}, so ${a} − ${b} = ${C(3, r)}.`),
          ] : [
            say(`Start at ${C(1, a)}. Count back ${C(2, b)}.`),
            line(Math.max(0, r - 1), a + 1, hops(a, b, -1, 2), [{ v: a, c: 1 }]),
            eq(`${C(1, a)} − ${C(2, b)} = ${C(3, r)}`),
          ],
        };
      },
    },
    {
      id: 'placeval', name: 'Tens and ones', grade: '1', lo: 26, hi: 38, t: 7,
      gen(d) {
        if (d < 0.6) {
          const tens = U.int(1, 9), ones = U.int(0, 9), n = tens * 10 + ones;
          const blocks = { t: 'base10', hundreds: 0, tens, ones };
          if (U.chance(0.5)) {
            return {
              prompt: 'What number is this?', kind: 'int', answer: n,
              visual: { type: 'base10', hundreds: 0, tens, ones },
              hint: 'Each long rod is 10. Each small cube is 1.',
              explain: `${tens} tens and ${ones} ones make ${n}.`,
              wb: [blocks, say(`${C(1, tens)} long rods: ${C(1, tens * 10)}.`), say(`${C(2, ones)} small cubes: ${C(2, ones)}.`), eq(`${C(1, tens * 10)} + ${C(2, ones)} = ${C(3, n)}`)],
            };
          }
          return {
            prompt: `How many tens are in ${n}?`, kind: 'int', answer: tens,
            visual: d < 0.3 ? { type: 'base10', hundreds: 0, tens, ones } : null,
            hint: 'The left digit of a two-digit number counts tens.',
            explain: `${n} is ${tens} tens and ${ones} ones.`,
            wb: [placeChart([['tens', tens, 3], ['ones', ones, 2]]), blocks, say(`${n} is ${C(3, tens)} tens and ${C(2, ones)} ones.`), eq(`${C(3, tens)} tens`)],
          };
        }
        const h = U.int(1, 9), t = U.int(0, 9), o = U.int(0, 9), n = h * 100 + t * 10 + o;
        const chart = (hi) => placeChart([['hundreds', h, hi === 'h' ? 3 : 1], ['tens', t, hi === 't' ? 3 : 2], ['ones', o, 4]]);
        if (U.chance(0.5)) {
          return {
            prompt: `What number is ${h} hundreds, ${t} tens and ${o} ones?`, kind: 'int', answer: n,
            hint: 'Write the hundreds digit, then tens, then ones.',
            explain: `${h * 100} + ${t * 10} + ${o} = ${n}.`,
            wb: [chart(), say('Put each digit in its place.'), eq(`${C(1, h * 100)} + ${C(2, t * 10)} + ${C(4, o)} = ${C(3, n)}`)],
          };
        }
        const which = U.pick([['hundreds', h * 100, h, 'h'], ['tens', t * 10, t, 't']]);
        const digit = which[2];
        if (digit === 0) {
          return {
            prompt: `How many hundreds are in ${n}?`, kind: 'int', answer: h,
            hint: 'In a three-digit number, the first digit counts hundreds.',
            explain: `${n} has ${h} hundreds.`,
            wb: [chart('h'), say('The first digit is the hundreds place.'), eq(`${C(3, h)} hundreds`)],
          };
        }
        return {
          prompt: `What is the ${digit} in ${n} worth?`, kind: 'int', answer: which[1],
          hint: 'Find which place the digit is in: hundreds, tens or ones.',
          explain: `The ${digit} is in the ${which[0]} place, so it is worth ${which[1]}.`,
          wb: [chart(which[3]), say(`The ${C(3, digit)} sits in the ${which[0]} place.`), eq(`${C(3, digit)} ${which[0]} = ${C(3, which[1])}`)],
        };
      },
    },
    {
      id: 'add2d', name: 'Two-digit adding', grade: '2', lo: 32, hi: 46, t: 12,
      gen(d) {
        let a, b;
        if (d < 0.4) {
          const a1 = U.int(1, 7), b1 = U.int(1, 8 - a1), a0 = U.int(0, 8), b0 = U.int(0, 9 - a0);
          a = a1 * 10 + a0; b = b1 * 10 + b0;
        } else if (d < 0.8) {
          const a0 = U.int(3, 9), b0 = U.int(10 - a0, 9);
          a = U.int(1, 6) * 10 + a0; b = U.int(1, 3) * 10 + b0;
        } else { a = U.int(120, 780); b = U.int(15, 99); }
        const regroup = (a % 10) + (b % 10) >= 10;
        return {
          prompt: 'Add.', column: { top: a, bottom: b, op: '+' }, kind: 'int', answer: a + b,
          hint: 'Add the ones first. If they make 10 or more, carry 1 ten.',
          explain: `${a} + ${b} = ${a + b}.`,
          wb: [
            say('Line up the places. Start with the ones.'),
            { t: 'column', top: a, bottom: b, op: '+' },
            regroup ? say(`${a % 10} + ${b % 10} = ${(a % 10) + (b % 10)}. Write ${C(3, ((a % 10) + (b % 10)) % 10)}, carry the ${C(4, 1)} ten.`) : say('No carrying needed this time.'),
            eq(`${a} + ${b} = ${C(3, a + b)}`),
          ],
        };
      },
    },
    {
      id: 'sub2d', name: 'Two-digit subtracting', grade: '2', lo: 36, hi: 50, t: 14,
      gen(d) {
        let a, b;
        if (d < 0.4) { const a1 = U.int(3, 9), a0 = U.int(2, 9); a = a1 * 10 + a0; b = U.int(1, a1 - 1) * 10 + U.int(0, a0); }
        else if (d < 0.8) { const a0 = U.int(0, 7); a = U.int(3, 9) * 10 + a0; b = U.int(1, Math.floor(a / 10) - 1) * 10 + U.int(a0 + 1, 9); }
        else { a = U.int(300, 900); b = U.int(25, 199); }
        const borrow = (b % 10) > (a % 10);
        return {
          prompt: 'Subtract.', column: { top: a, bottom: b, op: '−' }, kind: 'int', answer: a - b,
          hint: 'Start with the ones. If the top digit is smaller, trade 1 ten for 10 ones.',
          explain: `${a} − ${b} = ${a - b}.`,
          wb: [
            say('Line up the places. Start with the ones.'),
            { t: 'column', top: a, bottom: b, op: '−' },
            borrow ? say(`${a % 10} is smaller than ${b % 10}, so trade a ten for ${C(4, 10)} ones: ${(a % 10) + 10} − ${b % 10} = ${C(3, (a % 10) + 10 - (b % 10))}.`) : say('Every top digit is big enough. No trading needed.'),
            eq(`${a} − ${b} = ${C(3, a - b)}`),
          ],
        };
      },
    },
    {
      id: 'mul', name: 'Times tables', grade: '3', lo: 42, hi: 58, t: 6,
      gen(d) {
        let a, b;
        if (d < 0.35) { a = U.pick([2, 5, 10]); b = U.int(1, 10); }
        else if (d < 0.7) { a = U.int(3, 6); b = U.int(2, 10); }
        else { a = U.int(6, 12); b = U.int(4, 12); }
        if (U.chance(0.5)) [a, b] = [b, a];
        const story = d > 0.3 && U.chance(0.2);
        const what = U.pick(THINGS);
        const rows = Math.min(a, b), cols = Math.max(a, b), p = a * b;
        let wb;
        if (p <= 60) {
          wb = [
            { t: 'array', rows, cols },
            say(`${C(1, rows)} rows with ${C(2, cols)} in each row.`),
            say(`Skip count by ${C(2, cols)}:`),
            eq(Array.from({ length: rows }, (_, i) => i === rows - 1 ? C(3, cols * (i + 1)) : cols * (i + 1)).join(', ')),
            eq(`${C(1, rows)} × ${C(2, cols)} = ${C(3, p)}`),
          ];
        } else {
          const c1 = 5, c2 = cols - 5;
          wb = [
            say(`Big fact? Split ${C(2, cols)} into ${C(4, 5)} and ${C(2, c2)}.`),
            { t: 'area', rows: [rows], cols: [c1, c2] },
            eq(`${rows} × ${C(4, 5)} = ${rows * 5}`),
            eq(`${rows} × ${C(2, c2)} = ${rows * c2}`),
            eq(`${rows * 5} + ${rows * c2} = ${C(3, p)}`),
          ];
        }
        return {
          prompt: story ? `There are ${a} bags with ${b} ${what} in each. How many ${what}?` : 'Multiply.',
          display: story ? null : `${a} × ${b} = ?`, kind: 'int', answer: p,
          visual: d < 0.25 && p <= 40 ? { type: 'array', rows, cols } : null,
          hint: `Skip count by ${rows}: ${rows}, ${2 * rows}, ${3 * rows}...`,
          explain: `${a} groups of ${b} is ${p}.`, wb,
        };
      },
    },
    {
      id: 'div', name: 'Sharing and dividing', grade: '3', lo: 48, hi: 62, t: 7,
      gen(d) {
        let a, q;
        if (d < 0.35) { a = U.pick([2, 5, 10]); q = U.int(1, 10); }
        else if (d < 0.7) { a = U.int(3, 6); q = U.int(2, 10); }
        else { a = U.int(6, 12); q = U.int(3, 12); }
        const total = a * q;
        const wb = total <= 60 ? [
          say(`Share ${C(1, total)} into ${C(2, a)} equal rows.`),
          { t: 'array', rows: a, cols: q },
          say(`Each row gets ${C(3, q)}.`),
          eq(`${C(1, total)} ÷ ${C(2, a)} = ${C(3, q)}`),
        ] : [
          say(`Think: ${C(2, a)} times what makes ${C(1, total)}?`),
          say(`Skip count by ${C(2, a)} until you reach ${total}:`),
          eq(Array.from({ length: q }, (_, i) => (i + 1) * a).join(', ')),
          say(`That took ${C(3, q)} jumps.`),
          eq(`${C(2, a)} × ${C(3, q)} = ${C(1, total)}, so ${C(1, total)} ÷ ${C(2, a)} = ${C(3, q)}`),
        ];
        return {
          prompt: 'Divide.', display: `${total} ÷ ${a} = ?`, kind: 'int', answer: q,
          hint: `Think: ${a} × ? = ${total}.`,
          explain: `${a} × ${q} = ${total}, so ${total} ÷ ${a} = ${q}.`, wb,
        };
      },
    },
    {
      id: 'fracid', name: 'Fractions of a shape', grade: '3', lo: 50, hi: 60, t: 8,
      gen(d) {
        if (d < 0.65) {
          const den = d < 0.3 ? U.pick([2, 3, 4]) : U.pick([3, 4, 5, 6, 8]);
          const k = U.int(1, den - 1);
          const shape = U.chance(0.5) ? 'pie' : 'bar';
          return {
            prompt: 'What fraction is shaded?', kind: 'frac', answer: frac(k, den),
            visual: { type: shape, parts: den, shaded: k },
            hint: 'Bottom number: how many equal parts. Top number: how many are shaded.',
            explain: `${k} of ${den} equal parts are shaded, so ${k}/${den}.`,
            wb: [
              shape === 'pie' ? { t: 'pie', parts: den, shaded: k } : { t: 'bars', bars: [{ parts: den, fills: [{ n: k, c: 2 }] }] },
              say(`Count all the equal parts: ${C(1, den)}. That is the bottom number.`),
              say(`Count the shaded parts: ${C(2, k)}. That is the top number.`),
              eq(F(C(2, k), C(1, den))),
            ],
          };
        }
        let f1, f2;
        if (U.chance(0.5)) { const den = U.pick([4, 5, 6, 8]); f1 = frac(U.int(1, den - 1), den); f2 = frac(U.int(1, den - 1), den); }
        else { const n = U.int(1, 3); f1 = frac(n, U.int(n + 1, 8)); f2 = frac(n, U.int(n + 1, 8)); }
        const v1 = f1.n / f1.d, v2 = f2.n / f2.d;
        const ans = v1 < v2 ? '<' : v1 > v2 ? '>' : '=';
        return {
          prompt: 'Which sign goes in the gap?', display: `${fracStr(f1)}  ?  ${fracStr(f2)}`, kind: 'choice',
          choices: ['<', '=', '>'], answer: ans,
          visual: { type: 'bars2', a: f1, b: f2 },
          hint: f1.d === f2.d ? 'Same size parts: more parts is bigger.' : 'Same number of parts: bigger parts (smaller bottom number) is bigger.',
          explain: `${fracStr(f1)} ${ans} ${fracStr(f2)}.`,
          wb: [
            { t: 'bars', bars: [{ parts: f1.d, fills: [{ n: f1.n, c: 1 }] }, { parts: f2.d, fills: [{ n: f2.n, c: 2 }] }] },
            say(f1.d === f2.d ? 'Same bottom number means same size parts. Compare how many.' : 'Same top number. Fewer parts means each part is bigger.'),
            say('Compare how much of each bar is colored.'),
            eq(`${F(C(1, f1.n), C(1, f1.d))} ${C(3, ans)} ${F(C(2, f2.n), C(2, f2.d))}`),
          ],
        };
      },
    },
    {
      id: 'add3d', name: 'Big adding and subtracting', grade: '3', lo: 52, hi: 66, t: 18,
      gen(d) {
        const big = d > 0.6;
        const sub = U.chance(0.5);
        let a = big ? U.int(1200, 9800) : U.int(210, 980);
        let b = big ? U.int(300, a - 100) : U.int(105, sub ? a - 50 : 890);
        if (sub && b > a) [a, b] = [b, a];
        const op = sub ? '−' : '+', ans = sub ? a - b : a + b;
        return {
          prompt: sub ? 'Subtract.' : 'Add.', column: { top: a, bottom: b, op }, kind: 'int', answer: ans,
          hint: 'Line up the places. Work right to left: ones, tens, hundreds.',
          explain: `${a} ${op} ${b} = ${ans}.`,
          wb: [
            say('Line up the places. Work right to left, one column at a time.'),
            { t: 'column', top: a, bottom: b, op },
            say(sub ? `When a top digit is too small, trade from the next place (${C(4, 'yellow')} marks).` : `When a column makes 10 or more, carry to the next place (${C(4, 'yellow')} marks).`),
            eq(`${a} ${op} ${b} = ${C(3, ans)}`),
          ],
        };
      },
    },
    {
      id: 'mulmd', name: 'Multi-digit multiplying', grade: '4', lo: 60, hi: 74, t: 25,
      gen(d) {
        let a, b;
        if (d < 0.4) { a = U.int(12, 49); b = U.int(2, 6); }
        else if (d < 0.75) { a = U.int(102, 489); b = U.int(3, 9); }
        else { a = U.int(12, 39); b = U.int(11, 29); }
        const split = (n) => String(n).split('').map((ch, i, arr) => Number(ch) * 10 ** (arr.length - 1 - i)).filter((x) => x > 0);
        const cols = split(a), rows = split(b);
        const parts = [];
        rows.forEach((r) => cols.forEach((c) => parts.push(r * c)));
        return {
          prompt: 'Multiply.', column: { top: a, bottom: b, op: '×' }, kind: 'int', answer: a * b,
          hint: `Break it apart by place value: ${rows.flatMap((r) => cols.map((c) => `${c} × ${r}`)).join(' + ')} = ?`,
          explain: `${a} × ${b} = ${a * b}.`,
          wb: [
            say(`Break ${C(1, a)}${rows.length > 1 ? ` and ${C(2, b)}` : ''} into place-value parts.`),
            { t: 'area', rows, cols },
            say('Multiply each box, then add the boxes.'),
            eq(`${parts.join(' + ')} = ${C(3, a * b)}`),
          ],
        };
      },
    },
    {
      id: 'fraceq', name: 'Equivalent fractions', grade: '4', lo: 62, hi: 74, t: 12,
      gen(d) {
        const den = U.pick([2, 3, 4, 5, 6]);
        const n = U.int(1, den - 1);
        const g = U.gcd(n, den);
        const base = frac(n / g, den / g);
        const k = U.int(2, d < 0.5 ? 4 : 6);
        const bars = { t: 'bars', bars: [{ parts: base.d, fills: [{ n: base.n, c: 1 }] }, { parts: base.d * k, fills: [{ n: base.n * k, c: 2 }] }] };
        if (d < 0.7) {
          const askTop = U.chance(0.6);
          return {
            prompt: askTop ? `Fill in the top number: ${fracStr(base)} = ?/${base.d * k}` : `Fill in the bottom number: ${fracStr(base)} = ${base.n * k}/?`,
            display: askTop ? `${fracStr(base)} = ?/${base.d * k}` : `${fracStr(base)} = ${base.n * k}/?`,
            kind: 'int', answer: askTop ? base.n * k : base.d * k,
            hint: `Top and bottom get multiplied by the same number (${k}).`,
            explain: `${base.n} × ${k} = ${base.n * k} and ${base.d} × ${k} = ${base.d * k}.`,
            wb: [
              bars,
              say(`Cut every part into ${C(4, k)} smaller parts. Same amount colored!`),
              eq(`${F(`${base.n} × ${C(4, k)}`, `${base.d} × ${C(4, k)}`)} = ${F(C(askTop ? 3 : 2, base.n * k), C(askTop ? 2 : 3, base.d * k))}`),
              say('Whatever you do to the bottom, do to the top.'),
            ],
          };
        }
        return {
          prompt: 'Write this fraction in simplest form.', display: `${base.n * k}/${base.d * k}`,
          kind: 'frac', answer: base, requireSimplest: true,
          hint: 'Find a number that divides both top and bottom. Keep going until you cannot.',
          explain: `Divide top and bottom by ${k}: ${fracStr(base)}.`,
          wb: [
            say(`Both ${C(2, base.n * k)} and ${C(2, base.d * k)} can be divided by ${C(4, k)}.`),
            eq(`${F(`${base.n * k} ÷ ${C(4, k)}`, `${base.d * k} ÷ ${C(4, k)}`)} = ${F(C(3, base.n), C(3, base.d))}`),
            { t: 'bars', bars: [{ parts: base.d * k, fills: [{ n: base.n * k, c: 2 }] }, { parts: base.d, fills: [{ n: base.n, c: 3 }] }] },
            say('Same amount, fewer and bigger parts.'),
          ],
        };
      },
    },
    {
      id: 'longdiv', name: 'Long division', grade: '4', lo: 66, hi: 80, t: 30,
      gen(d) {
        let a, q;
        if (d < 0.4) { a = U.int(2, 6); q = U.int(11, 29); }
        else if (d < 0.75) { a = U.int(3, 9); q = U.int(21, 140); }
        else { a = U.int(11, 25); q = U.int(12, 45); }
        const total = a * q;
        const chunks = String(q).split('').map((ch, i, arr) => Number(ch) * 10 ** (arr.length - 1 - i)).filter((x) => x > 0);
        let left = total;
        const steps = chunks.map((c) => { const before = left; left -= a * c; return eq(`${C(2, a)} × ${C(4, c)} = ${a * c}   →   ${before} − ${a * c} = ${left}`); });
        return {
          prompt: 'Divide.', display: `${total} ÷ ${a} = ?`, kind: 'int', answer: q,
          hint: `Take away big groups of ${a}: try ${a} × 10 first.`,
          explain: `${a} × ${q} = ${total}, so the answer is ${q}.`,
          wb: [
            say(`Take away groups of ${C(2, a)} from ${C(1, total)}, in big friendly chunks.`),
            ...steps,
            say('Nothing left! Add up the chunks.'),
            eq(`${chunks.map((c) => C(4, c)).join(' + ')} = ${C(3, q)}`),
          ],
        };
      },
    },
    {
      id: 'fracadd', name: 'Adding fractions', grade: '5', lo: 68, hi: 84, t: 22,
      gen(d) {
        let f1, f2;
        if (d < 0.45) {
          const den = U.pick([4, 5, 6, 8, 10]);
          f1 = frac(U.int(1, den - 2), den); f2 = frac(U.int(1, den - f1.n - 1), den);
        } else if (d < 0.75) {
          const den = U.pick([2, 3, 4, 5]); const k = U.pick([2, 3]);
          f1 = frac(U.int(1, den - 1), den); f2 = frac(U.int(1, den * k - 1), den * k);
        } else {
          const pair = U.pick([[2, 3], [3, 4], [2, 5], [4, 6], [3, 5]]);
          f1 = frac(U.int(1, pair[0] - 1), pair[0]); f2 = frac(U.int(1, pair[1] - 1), pair[1]);
        }
        const n = f1.n * f2.d + f2.n * f1.d, dd = f1.d * f2.d, g = U.gcd(n, dd);
        const lcd = f1.d * f2.d / U.gcd(f1.d, f2.d);
        const n1 = f1.n * lcd / f1.d, n2 = f2.n * lcd / f2.d;
        const bar = n1 + n2 <= lcd ? { t: 'bars', bars: [{ parts: lcd, fills: [{ n: n1, c: 1 }, { n: n2, c: 2 }] }] } : null;
        const wb = f1.d === f2.d ? [
          bar,
          say('Same bottom number, so the parts are the same size. Add the tops.'),
          eq(`${F(C(1, f1.n), f1.d)} + ${F(C(2, f2.n), f2.d)} = ${F(C(3, f1.n + f2.n), f1.d)}`),
        ] : [
          say(`Different bottoms. Make them match: use ${C(4, lcd)}.`),
          f1.d !== lcd ? eq(`${F(f1.n, f1.d)} = ${F(C(1, n1), C(4, lcd))}`) : null,
          f2.d !== lcd ? eq(`${F(f2.n, f2.d)} = ${F(C(2, n2), C(4, lcd))}`) : null,
          bar,
          eq(`${F(C(1, n1), lcd)} + ${F(C(2, n2), lcd)} = ${F(C(3, n1 + n2), lcd)}`),
        ];
        return {
          prompt: 'Add. Any equal fraction is OK.', display: `${fracStr(f1)} + ${fracStr(f2)} = ?`,
          kind: 'frac', answer: frac(n / g, dd / g),
          hint: f1.d === f2.d ? 'Same bottom number: add the tops, keep the bottom.' : `Make the bottoms match. Try ${lcd}ths.`,
          explain: `The answer is ${n / g}/${dd / g}.`, wb: wb.filter(Boolean),
        };
      },
    },
    {
      id: 'dec', name: 'Decimals', grade: '4', lo: 72, hi: 86, t: 15,
      gen(d) {
        if (d < 0.35) {
          const a = U.int(1, 9) / 10, b = U.fix(U.int(10, 99) / 100);
          const [x, y] = U.chance(0.5) ? [a, b] : [b, a];
          const ans = x < y ? '<' : x > y ? '>' : '=';
          return {
            prompt: 'Which sign goes in the gap?', display: `${U.fmtDec(x)}  ?  ${U.fmtDec(y)}`, kind: 'choice',
            choices: ['<', '=', '>'], answer: ans,
            hint: 'Write both with two decimal places, like 0.50 and 0.45, then compare.',
            explain: `${x.toFixed(2)} ${ans} ${y.toFixed(2)}.`,
            wb: [
              say('Give both numbers the same number of decimal places.'),
              eq(`${U.fmtDec(x)} → ${C(1, x.toFixed(2))}`),
              eq(`${U.fmtDec(y)} → ${C(2, y.toFixed(2))}`),
              say(`Now compare like whole numbers: ${Math.round(x * 100)} hundredths and ${Math.round(y * 100)} hundredths.`),
              eq(`${C(1, x.toFixed(2))} ${C(3, ans)} ${C(2, y.toFixed(2))}`),
            ],
          };
        }
        const hundredths = d > 0.7;
        const a = hundredths ? U.int(120, 950) / 100 : U.int(11, 89) / 10;
        const b = hundredths ? U.int(5, Math.floor(a * 10)) / 10 : U.int(11, 69) / 10;
        const sub = hundredths && U.chance(0.5) && a > b;
        const ans = U.fix(sub ? a - b : a + b);
        const places = hundredths ? 2 : 1;
        return {
          prompt: sub ? 'Subtract.' : 'Add.', display: `${U.fmtDec(a)} ${sub ? '−' : '+'} ${U.fmtDec(b)} = ?`,
          kind: 'dec', answer: ans,
          hint: 'Line up the decimal points, then add or subtract like whole numbers.',
          explain: `${U.fmtDec(a)} ${sub ? '−' : '+'} ${U.fmtDec(b)} = ${U.fmtDec(ans)}.`,
          wb: [
            say(`Line up the ${C(4, 'decimal points')}. Fill gaps with 0.`),
            { t: 'column', top: a, bottom: b, op: sub ? '−' : '+', places },
            say('The point in the answer drops straight down.'),
            eq(`${U.fmtDec(a)} ${sub ? '−' : '+'} ${U.fmtDec(b)} = ${C(3, U.fmtDec(ans))}`),
          ],
        };
      },
    },
    {
      id: 'fracmul', name: 'Fractions of a number', grade: '5', lo: 78, hi: 90, t: 18,
      gen(d) {
        if (d < 0.7) {
          const den = U.pick([2, 3, 4, 5, 6, 8]);
          const num = d < 0.35 ? 1 : U.int(2, den - 1);
          const whole = den * U.int(2, 9);
          const each = whole / den;
          return {
            prompt: `What is ${num}/${den} of ${whole}?`, kind: 'int', answer: each * num,
            hint: `First find 1/${den} of ${whole} by dividing by ${den}.`,
            explain: `${whole} ÷ ${den} = ${each}${num > 1 ? `, then × ${num} = ${each * num}` : ''}.`,
            wb: [
              say(`Split ${C(1, whole)} into ${C(2, den)} equal groups.`),
              { t: 'bars', bars: [{ parts: den, fills: [{ n: num, c: 3 }], labels: each }] },
              eq(`${C(1, whole)} ÷ ${C(2, den)} = ${C(4, each)} in each group`),
              num > 1 ? say(`Take ${C(3, num)} of the groups.`) : say('Take one group.'),
              eq(num > 1 ? `${C(3, num)} × ${C(4, each)} = ${C(3, each * num)}` : `${F(1, den)} of ${whole} = ${C(3, each)}`),
            ],
          };
        }
        const den = U.pick([3, 4, 5, 6, 8]), num = U.int(1, den - 1), w = U.int(2, 7);
        const g = U.gcd(num * w, den);
        return {
          prompt: 'Multiply. Any equal fraction is OK.', display: `${w} × ${num}/${den} = ?`, kind: 'frac',
          answer: frac(num * w / g, den / g),
          hint: 'Multiply the top number by the whole number. The bottom stays.',
          explain: `${w} × ${num} = ${w * num}, so ${w * num}/${den}.`,
          wb: [
            say(`${C(1, w)} × ${F(num, den)} means ${C(1, w)} groups of ${F(num, den)}.`),
            w <= 4 ? { t: 'bars', bars: Array.from({ length: w }, () => ({ parts: den, fills: [{ n: num, c: 2 }] })) } : null,
            eq(w <= 4 ? `${Array(w).fill(F(C(2, num), den)).join(' + ')} = ${F(C(3, num * w), den)}` : `${C(1, w)} × ${C(2, num)} = ${C(3, num * w)}`),
            say('The size of the parts (the bottom) stays the same.'),
            eq(`${C(1, w)} × ${F(C(2, num), den)} = ${F(C(3, num * w), den)}`),
          ].filter(Boolean),
        };
      },
    },
    {
      id: 'decmul', name: 'Multiplying decimals', grade: '5', lo: 84, hi: 96, t: 18,
      gen(d) {
        if (d < 0.35) {
          const a = U.fix(U.int(11, 999) / 100), p = U.pick([10, 100, 1000]);
          const k = String(p).length - 1;
          return {
            prompt: 'Multiply.', display: `${U.fmtDec(a)} × ${p} = ?`, kind: 'dec', answer: U.fix(a * p),
            hint: `× ${p} moves every digit ${k} place${k > 1 ? 's' : ''} to the left.`,
            explain: `${U.fmtDec(a)} × ${p} = ${U.fmtDec(a * p)}.`,
            wb: [
              say(`Times ${C(2, p)}: every digit gets ${C(2, p)} times bigger.`),
              say(`Same as hopping the decimal point ${C(2, k)} place${k > 1 ? 's' : ''} to the right.`),
              { t: 'shift', num: U.fmtDec(a), places: k },
              k > 1 && String(U.fix(a * p)).length > String(a).replace('.', '').replace(/^0+/, '').length ? say(`Run out of digits? Fill the empty places with ${C(4, 0)}.`) : null,
              eq(`${C(1, U.fmtDec(a))} × ${C(2, p)} = ${C(3, U.fmtDec(U.fix(a * p)))}`),
            ].filter(Boolean),
          };
        }
        const aT = U.int(2, 9), a = aT / 10;
        const whole = d < 0.7;
        const bRaw = U.int(2, 9), b = whole ? bRaw : bRaw / 10;
        const ans = U.fix(a * b);
        return {
          prompt: 'Multiply.', display: `${U.fmtDec(a)} × ${U.fmtDec(b)} = ?`, kind: 'dec', answer: ans,
          hint: 'Multiply as whole numbers, then count the decimal places in both numbers.',
          explain: `${U.fmtDec(a)} × ${U.fmtDec(b)} = ${U.fmtDec(ans)}.`,
          wb: whole ? [
            say(`${C(1, U.fmtDec(a))} is ${C(1, aT)} tenths.`),
            eq(`${C(1, aT)} tenths × ${C(2, b)} = ${C(4, aT * b)} tenths`),
            eq(`${C(4, aT * b)} tenths = ${C(3, U.fmtDec(ans))}`),
          ] : [
            say('Ignore the points and multiply.'),
            eq(`${C(1, aT)} × ${C(2, bRaw)} = ${C(4, aT * bRaw)}`),
            say(`Count decimal places: ${C(1, 1)} + ${C(2, 1)} = 2. The answer needs 2 places.`),
            eq(`${U.fmtDec(a)} × ${U.fmtDec(b)} = ${C(3, ans.toFixed(2))}`),
          ],
        };
      },
    },
    {
      id: 'ooo', name: 'Order of operations', grade: '5', lo: 86, hi: 100, t: 20,
      gen(d) {
        const a = U.int(2, 9), b = U.int(2, 9), c = U.int(2, 9);
        if (d < 0.4) {
          return {
            prompt: 'Solve. Multiply before you add.', display: `${a} + ${b} × ${c} = ?`, kind: 'int', answer: a + b * c,
            hint: 'Do × and ÷ first, then + and −.', explain: `${b} × ${c} = ${b * c}, then ${a} + ${b * c} = ${a + b * c}.`,
            wb: [say('Multiply first. Circle the ×.'), eq(`${a} + ${C(4, `${b} × ${c}`)}`), eq(`= ${a} + ${C(4, b * c)}`), eq(`= ${C(3, a + b * c)}`)],
          };
        }
        if (d < 0.75) {
          return {
            prompt: 'Solve. Brackets first.', display: `(${a} + ${b}) × ${c} = ?`, kind: 'int', answer: (a + b) * c,
            hint: 'Work inside the brackets first.', explain: `${a} + ${b} = ${a + b}, then × ${c} = ${(a + b) * c}.`,
            wb: [say('Brackets go first.'), eq(`${C(4, `(${a} + ${b})`)} × ${c}`), eq(`= ${C(4, a + b)} × ${c}`), eq(`= ${C(3, (a + b) * c)}`)],
          };
        }
        const e = U.int(2, 5), f = e * U.int(2, 6);
        const big = Math.max(a, b) + 1, small = Math.min(a, b);
        const p1 = (big - small) * c, p2 = f / e;
        return {
          prompt: 'Solve.', display: `(${big} − ${small}) × ${c} + ${f} ÷ ${e} = ?`, kind: 'int', answer: p1 + p2,
          hint: 'Brackets, then × and ÷ left to right, then + and −.',
          explain: `(${big} − ${small}) × ${c} + ${f} ÷ ${e} = ${p1 + p2}.`,
          wb: [
            say(`Order: ${C(4, 'brackets')}, then × and ÷, then + and −.`),
            eq(`${C(4, `(${big} − ${small})`)} × ${c} + ${f} ÷ ${e}`),
            eq(`= ${C(1, `${big - small} × ${c}`)} + ${C(2, `${f} ÷ ${e}`)}`),
            eq(`= ${C(1, p1)} + ${C(2, p2)}`),
            eq(`= ${C(3, p1 + p2)}`),
          ],
        };
      },
    },
  ];

  const byId = {};
  skills.forEach((s, i) => { s.index = i; s.color = TONE[i % TONE.length]; byId[s.id] = s; });

  // Grade bands on the internal ability scale (grown-up labels and starting points).
  const GRADES = [
    { g: 'K', start: 8, upTo: 17 },
    { g: '1', start: 22, upTo: 32 },
    { g: '2', start: 37, upTo: 48 },
    { g: '3', start: 51, upTo: 63 },
    { g: '4', start: 65, upTo: 79 },
    { g: '5', start: 80, upTo: 101 },
  ];
  function gradeFor(theta) {
    for (const b of GRADES) if (theta < b.upTo) return b.g;
    return '5';
  }
  function gradeLabel(g) { return g === 'K' ? 'Kindergarten' : 'Grade ' + g; }
  function startTheta(g) { return (GRADES.find((b) => b.g === g) || GRADES[2]).start; }
  // "early / mid / late Grade 3" for grown-ups, instead of a raw number.
  function gradeDetail(theta) {
    const i = GRADES.findIndex((b) => theta < b.upTo);
    const b = GRADES[i < 0 ? GRADES.length - 1 : i];
    const lo = i <= 0 ? 0 : GRADES[i - 1].upTo, hi = Math.min(100, b.upTo);
    const f = (theta - lo) / (hi - lo);
    return (f < 0.34 ? 'early ' : f < 0.67 ? 'mid ' : 'late ') + (b.g === 'K' ? 'kindergarten' : 'grade ' + b.g);
  }

  function makeItem(skill, b) {
    const d = U.clamp((b - skill.lo) / (skill.hi - skill.lo), 0, 1);
    const base = skill.gen(d);
    return Object.assign({
      id: U.uid(), skillId: skill.id, d, b: U.lerp(skill.lo, skill.hi, d),
      expected: skill.t * (1 + 0.6 * d),
    }, base);
  }

  function skillsAt(b) {
    const bb = U.clamp(b, skills[0].lo, 100);
    let c = skills.filter((s) => bb >= s.lo - 1 && bb <= s.hi + 1);
    if (!c.length) c = [skills.reduce((best, s) => (Math.abs((s.lo + s.hi) / 2 - bb) < Math.abs((best.lo + best.hi) / 2 - bb) ? s : best))];
    return c;
  }

  function checkAnswer(item, input) {
    if (input == null) return false;
    switch (item.kind) {
      case 'int': return String(input).trim() !== '' && Number(input) === item.answer;
      case 'dec': {
        const x = parseFloat(input);
        return !isNaN(x) && Math.abs(U.fix(x) - item.answer) < 1e-9;
      }
      case 'choice': return input === item.answer;
      case 'frac': {
        const n = parseInt(input.n, 10);
        const dRaw = String(input.d || '').trim();
        const dd = dRaw === '' ? 1 : parseInt(dRaw, 10);
        if (isNaN(n) || isNaN(dd) || dd === 0) return false;
        if (n * item.answer.d !== item.answer.n * dd) return false;
        if (item.requireSimplest) return U.gcd(n, dd) === 1;
        return true;
      }
    }
    return false;
  }

  function answerText(item) {
    if (item.kind === 'frac') return item.answer.d === 1 ? String(item.answer.n) : fracStr(item.answer);
    if (item.kind === 'dec') return U.fmtDec(item.answer);
    return String(item.answer);
  }

  MP.Skills = { list: skills, byId, TONE, GRADES, gradeFor, gradeLabel, gradeDetail, startTheta, makeItem, skillsAt, checkAnswer, answerText };
})(typeof window !== 'undefined' ? window : globalThis);
