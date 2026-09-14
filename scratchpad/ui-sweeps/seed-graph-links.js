// Links for the README's graph shot: every note joins its category's ring,
// eight hubs gather a dozen links each (so node size, which follows degree,
// varies), and a handful of cross-category links tie the clusters together.
// Through `POST /entries/{id}/links`, the same route the app uses.
//
//   BASE=http://127.0.0.1:8782 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/seed-graph-links.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const out = await page.evaluate(async () => {
    const list = await apiPagedList('/entries', 200);
    const notes = list.filter((e) => e && e.id && !e.is_draft);
    const byCat = {};
    for (const n of notes) (byCat[n.category || 'Uncategorised'] ||= []).push(n);
    const pairs = new Set();
    const wanted = [];
    const add = (a, b, reason) => {
      if (!a || !b || a.id === b.id) return;
      const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
      if (pairs.has(key)) return;
      pairs.add(key);
      wanted.push([a.id, b.id, reason]);
    };
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const hubs = [];
    for (const [cat, group] of Object.entries(byCat)) {
      for (let i = 0; i < group.length; i++) add(group[i], group[(i + 1) % group.length], `Both filed under ${cat}`);
      const hub = group[Math.floor(rnd() * group.length)];
      hubs.push(hub);
      for (const other of group.slice(0, 14)) add(hub, other, `${hub.title || 'This note'} is the one the others in ${cat} come back to`);
    }
    for (let i = 0; i < 40; i++) {
      const a = notes[Math.floor(rnd() * notes.length)], b = notes[Math.floor(rnd() * notes.length)];
      add(a, b, 'Mentions the same people and dates');
    }
    for (let i = 0; i < hubs.length; i++) add(hubs[i], hubs[(i + 1) % hubs.length], 'Two threads that keep meeting');
    let ok = 0, fail = 0;
    for (const [sid, tid, reason] of wanted) {
      const r = await api(`/entries/${sid}/links`, { method: 'POST', body: JSON.stringify({ target_id: tid, reason }) }).catch(() => null);
      if (r && r.ok) ok++; else fail++;
    }
    return { notes: notes.length, cats: Object.keys(byCat).length, wanted: wanted.length, ok, fail };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
