// Every API request the app makes, timed, per tab (INBOX 472: "Enhance the
// backend optimise, make things faster"). Boots, reloads with the listener on
// (so the boot's own requests count), then visits each tab twice and records
// each request's time to first byte (the server's share: request sent to
// response start, from the browser's Resource Timing). Prints the slowest
// routes, grouped by path with the query string stripped, worst first.
//
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/apibench.js
// Seed first: seed-timeline-bulk.py <data>/memorymap.db 2000, seed-notebook.sh.
const fs = require('fs');
const { boot } = require('./lib.js');

const TABS = (process.env.TABS || 'dashboard,notes,chat,graph,library,timeline,reminders,documents,whiteboard').split(',');
const OUT = process.env.OUT || '';

(async () => {
  const { browser, page } = await boot();
  const rows = [];
  let where = 'boot';
  page.on('requestfinished', (req) => {
    const url = new URL(req.url());
    if (!['fetch', 'xhr'].includes(req.resourceType())) return;
    const t = req.timing();
    const ttfb = t.responseStart - t.requestStart;
    const total = t.responseEnd - t.startTime;
    rows.push({ where, method: req.method(), path: url.pathname.replace(/\/\d+(?=\/|$)/g, '/:id'), ttfb, total });
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  for (const pass of [1, 2]) {
    for (const tab of TABS) {
      where = `${tab}#${pass}`;
      await page.evaluate((t) => window.switchTab && window.switchTab(t), tab);
      await page.waitForTimeout(2500);
    }
  }
  const by = new Map();
  for (const r of rows) {
    const k = `${r.method} ${r.path}`;
    if (!by.has(k)) by.set(k, { k, n: 0, max: 0, sum: 0, where: new Set() });
    const g = by.get(k);
    g.n++; g.sum += r.ttfb; g.max = Math.max(g.max, r.ttfb); g.where.add(r.where.split('#')[0]);
  }
  const list = [...by.values()].sort((a, b) => b.max - a.max);
  console.log('route'.padEnd(52), 'n', 'mean', ' max', 'tabs');
  for (const g of list.slice(0, Number(process.env.TOP || 30))) {
    console.log(g.k.padEnd(52), String(g.n).padStart(2), String(Math.round(g.sum / g.n)).padStart(4), String(Math.round(g.max)).padStart(5), [...g.where].join(','));
  }
  console.log(`requests ${rows.length}, routes ${list.length}, sum ttfb ${Math.round(rows.reduce((s, r) => s + r.ttfb, 0))}ms`);
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(list.map((g) => ({ ...g, where: [...g.where] })), null, 1));
  await browser.close();
})();
