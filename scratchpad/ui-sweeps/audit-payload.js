// Brief 43 item 2, "every list paged": every JSON response a cold load of each
// tab receives, largest first, so an endpoint that returns the whole notebook
// shows as a number (bytes and rows) rather than as a feeling.
//   BASE=http://127.0.0.1:8787 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node audit-payload.js
const { boot, BASE } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const seen = new Map();
  page.on('response', async (r) => {
    const u = r.url().replace(BASE, '');
    if (!/json/.test(r.headers()['content-type'] || '')) return;
    try {
      const body = await r.body();
      let rows = null;
      try { const j = JSON.parse(body.toString()); rows = Array.isArray(j) ? j.length : (j && Array.isArray(j.items) ? j.items.length : null); } catch (e) {}
      const prev = seen.get(u) || { bytes: 0, rows, n: 0 };
      seen.set(u, { bytes: Math.max(prev.bytes, body.length), rows: rows ?? prev.rows, n: prev.n + 1 });
    } catch (e) {}
  });
  const tabs = await page.evaluate(() => [...document.querySelectorAll('#tab-bar button')].map((b) => b.dataset.tab));
  for (const t of tabs) { await page.evaluate((x) => window.switchTab(x), t); await page.waitForTimeout(2500); }
  const rows = [...seen.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 14);
  for (const [u, v] of rows) console.log(String(v.bytes).padStart(8), 'B', String(v.rows ?? '-').padStart(5), 'rows', 'x' + v.n, u);
  await browser.close();
})();
