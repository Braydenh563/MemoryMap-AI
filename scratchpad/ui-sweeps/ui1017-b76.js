// INBOX 904 B76: the drafting spinner and its words sit in the Atlas column's
// head (top of the AI side), not under the user's thoughts. The draft route is
// held open so the working state can be measured, then answered.
//   BASE=http://127.0.0.1:8786 W=1440 node ui1017-b76.js
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.waitForTimeout(3000);
  let release;
  const held = new Promise((r) => { release = r; });
  await page.route('**/drafts/compose/stream', async (route) => {
    await held;
    await route.fulfill({ status: 200, contentType: 'application/x-ndjson', body: '{"type":"thinking","text":"Weighing the order."}\n{"type":"delta","text":"A short draft."}\n{"type":"done","draft":"A short draft."}\n' });
  });
  await page.evaluate(() => { switchTab('notes'); showNotesSection('writing-room'); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => { $('draft-thoughts').value = 'a few thoughts'; });
  const box = (sel) => page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cols = [...document.querySelectorAll('.draft-column')].map((c) => c.getBoundingClientRect());
    return { text: el.textContent.trim(), hidden: el.classList.contains('hidden'), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), inColumn: cols.findIndex((c) => r.left >= c.left - 1 && r.right <= c.right + 1 && r.top >= c.top - 1 && r.bottom <= c.bottom + 1), cols: cols.map((c) => [Math.round(c.left), Math.round(c.top), Math.round(c.bottom)]) };
  }, sel);
  await page.evaluate(() => { document.getElementById('draft-compose').disabled = false; composeDraft(); });
  await page.waitForTimeout(1500);
  const out = {};
  out.status = await box('#draft-status');
  out.working = await box('#draft-working');
  out.thinkingTop = await page.evaluate(() => { const t = document.getElementById('draft-thinking').getBoundingClientRect(); return Math.round(t.top); });
  release();
  await page.waitForTimeout(1500);
  out.after = { working: await box('#draft-working'), status: await box('#draft-status') };
  out.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(JSON.stringify(out));
  await browser.close();
})();
