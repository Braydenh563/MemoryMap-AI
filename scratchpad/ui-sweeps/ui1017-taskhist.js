// BACKLOG "Start of the next PR": a finished job's Logs button (Settings,
// Background tasks, Recently finished) stays at the row's top right and never
// wraps onto a row of its own. Fake history rows with a long "when" line.
//   BASE=http://127.0.0.1:8786 W=1440 node ui1017-taskhist.js
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(() => openSettingsModal('tasks'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const at = Date.now() / 1000 - 600;
    renderTaskHistory([
      { label: 'Reading an image with the vision model', outcome: 'completed', at, duration_ms: 84000, count: 3, origin: 'auto', name: 'moondream2:latest-with-a-long-name', detail: '', lines: [] },
      { label: 'Indexing', outcome: 'failed', at, duration_ms: 1200, count: 1, origin: 'you', name: '', detail: 'The embedding model is not installed.', lines: [] },
    ]);
  });
  await page.waitForTimeout(400);
  const out = await page.evaluate(() => [...document.querySelectorAll('#task-history > li')].map((li) => {
    const row = li.querySelector('.entry-meta');
    const r = row.getBoundingClientRect();
    const kids = [...row.children].map((c) => { const q = c.getBoundingClientRect(); return [c.tagName.toLowerCase() + '.' + c.className.toString().slice(0, 22), Math.round(q.left - r.left), Math.round(q.top - r.top), Math.round(q.width), Math.round(q.height)]; });
    return { row: [Math.round(r.width), Math.round(r.height)], kids };
  }));
  console.log(JSON.stringify(out));
  await browser.close();
})();
