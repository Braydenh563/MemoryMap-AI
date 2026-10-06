// INBOX 614 (the owner: "the masculine atlas kinda looks fat", "make the
// masculine atlas look hot and 19-21 like the feminine one"). Reads both
// looks' torso paths, cloak widths and arm widths straight from atlas.js (no
// browser), and prints each torso's widths: shoulders (widest at y 37 to
// 43), waist (narrowest at y 46 to 57), hips (at y 60), and the ratios.
// BEFORE="<torso path>" also prints that one, for a before and after.
//   node atlas614-build.js
const fs = require('fs');
const src = fs.readFileSync(`${__dirname}/../../frontend/js/atlas.js`, 'utf8');
const looks = {};
for (const name of ['masculine', 'feminine']) {
  const start = src.indexOf(`  ${name}: {`);
  const body = src.slice(start, src.indexOf('\n  },', start));
  looks[name] = {
    torso: /torso: "([^"]+)"/.exec(body)[1],
    cloak: (/cloak: (\[[^\]]+\])/.exec(body) || [])[1],
    arm: (/armWidth: (\[[^\]]+\])/.exec(body) || [])[1],
  };
}
if (process.env.BEFORE) looks.before = { torso: process.env.BEFORE };
function samples(d) {
  const n = d.match(/-?[0-9.]+/g).map(Number);
  let [x, y] = n;
  const pts = [];
  for (let i = 2; i + 5 < n.length; i += 6) {
    const c = [x, y, ...n.slice(i, i + 6)];
    for (let t = 0; t <= 1; t += 0.01) {
      const u = 1 - t;
      pts.push([u ** 3 * c[0] + 3 * u * u * t * c[2] + 3 * u * t * t * c[4] + t ** 3 * c[6], u ** 3 * c[1] + 3 * u * u * t * c[3] + 3 * u * t * t * c[5] + t ** 3 * c[7]]);
    }
    [x, y] = [c[6], c[7]];
  }
  return pts;
}
function widthAt(pts, y) {
  const xs = [];
  for (let i = 1; i < pts.length; i += 1) {
    const [a, b] = [pts[i - 1], pts[i]];
    if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
  }
  return xs.length >= 2 ? Math.max(...xs) - Math.min(...xs) : 0;
}
for (const [name, look] of Object.entries(looks)) {
  const pts = samples(look.torso);
  const range = (a, b) => Array.from({ length: Math.round((b - a) * 5) + 1 }, (_, i) => a + i / 5).map((y) => [y, widthAt(pts, y)]);
  const sh = range(37, 43).reduce((m, r) => (r[1] > m[1] ? r : m));
  const wa = range(46, 57).reduce((m, r) => (r[1] < m[1] ? r : m));
  const hip = widthAt(pts, 60);
  const f = (v) => +v.toFixed(1);
  console.log(name, JSON.stringify({ shoulders: [f(sh[1]), f(sh[0])], waist: [f(wa[1]), f(wa[0])], belly51: f(widthAt(pts, 51)), hips: f(hip), ratio: `${(sh[1] / wa[1]).toFixed(2)}:1:${(hip / wa[1]).toFixed(2)}`, cloak: look.cloak, arm: look.arm }));
}
