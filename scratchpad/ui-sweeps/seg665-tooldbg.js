// INBOX 665 (d) debug: what in the note strip sits past its edge at W.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 390);
  const { page, browser } = await boot({ viewport: { width: W, height: 900 } });
  await page.evaluate(async () => { await ensureModule('library'); switchTab('notes'); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => showNotesSection?.('capture'));
  await page.waitForTimeout(800);
  const dump = () => page.evaluate(() => {
    const bar = document.getElementById('note-toolbar');
    const r = bar.getBoundingClientRect();
    return { bar: [Math.round(r.left), Math.round(r.right), Math.round(r.height)], cls: bar.className, kids: [...bar.querySelectorAll('button, summary, .select-shell')].filter((el) => el.getClientRects().length).map((el) => { const e = el.getBoundingClientRect(); const cs = getComputedStyle(el); return `${(el.getAttribute('aria-label') || el.title || el.className).slice(0, 20)}:${Math.round(e.left)}-${Math.round(e.right)}${el.closest('.doc-toolbar-over') ? ' over' : ''}${cs.visibility === 'hidden' ? ' vis-hidden' : ''}${el.hidden ? ' hidden' : ''}`; }) };
  });
  console.log(JSON.stringify(await dump()));
  await page.evaluate(() => document.querySelector('#note-toolbar .doc-toolbar-more').click());
  await page.waitForTimeout(500);
  console.log(JSON.stringify(await dump()));
  await browser.close();
})();
