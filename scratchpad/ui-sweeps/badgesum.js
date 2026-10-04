// One line per badge family from a badgealign.js run's JSON (INBOX 503):
// mean/worst (signed mean) of |icon from the badge's centre|, |words from it|, |icon from
// words|, and the rows of badges past the limit. Pass one or two JSON files
// (before, after) to print them side by side; commas join one run's files.
//   node badgesum.js $SCRATCH/shots/ba-1440-light.json [after.json]
const fs = require('fs');
// A group of files joined by commas is one run (one process per view).
const load = (f) => f.split(',').map((x) => JSON.parse(fs.readFileSync(x, 'utf8'))).reduce((a, j) => ({ rows: a.rows.concat(j.rows), marks: a.marks.concat(j.marks || []), rowsOut: a.rowsOut.concat(j.rowsOut || []) }), { rows: [], marks: [], rowsOut: [] });
const fam = (k) => k.split('|')[0].replace(/\.chip-interactive/, '') || 'chip';
const stat = (list, key) => {
  const raw = list.map((r) => r[key]).filter((x) => x !== undefined && x !== null);
  const v = raw.map(Math.abs);
  if (!v.length) return '   -            ';
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const signed = raw.reduce((a, b) => a + b, 0) / raw.length;
  return `${mean.toFixed(2)}/${Math.max(...v).toFixed(2)}(${signed >= 0 ? '+' : ''}${signed.toFixed(2)})`.padEnd(17);
};
const table = (j) => {
  const m = new Map();
  for (const r of j.rows) {
    // The unexplained single "Tight fit" instance (a card mid-scroll) is a
    // capture artefact: any |value| over 3px is dropped, and said so.
    if (Math.abs(r.tc) > 3 || Math.abs(r.ic) > 3) continue;
    const k = fam(r.key);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};
const files = process.argv.slice(2);
const js = files.map(load);
const tabs = js.map(table);
const keys = [...new Set(tabs.flatMap((t) => [...t.keys()]))].sort();
console.log('family'.padEnd(34) + files.map((_, i) => `[${i}] n  icon/ctr          words/ctr         icon/words`.padEnd(60)).join(''));
for (const k of keys) {
  let line = k.slice(0, 33).padEnd(34);
  for (const t of tabs) {
    const l = t.get(k) || [];
    line += `${String(l.length).padStart(3)}  ${stat(l, 'ic')} ${stat(l, 'tc')} ${stat(l, 'dy')}`.padEnd(70);
  }
  console.log(line);
}
for (const [i, j] of js.entries()) {
  const rows = j.rowsOut || [];
  const bad = rows.filter((r) => r.h > 0.5 || r.c > 0.5 || r.t > 0.5);
  const byKind = new Map();
  for (const r of bad) { const k = `h${r.h} c${r.c} t${r.t} ${r.names.split(' ').slice(0, 3).join(' ')}`; byKind.set(k, (byKind.get(k) || 0) + 1); }
  console.log(`\n[${i}] rows of badges ${rows.length}, past 0.5px ${bad.length}`);
  for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`   ${n}x ${k}`);
}
