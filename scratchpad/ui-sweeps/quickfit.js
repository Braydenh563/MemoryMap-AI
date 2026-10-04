// INBOX 524 follow-up: the Quick access manager fits its dialog (no sideways overflow, rows inside the card),
// its footer is one row of 44px targets on a phone, the heading is sentence case, and a refusal is an inline
// notice (no toast, no Report this). W / THEME as the other sweeps.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 390);
  const phone = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: 844 }, hasTouch: phone, isMobile: phone });
  await page.evaluate(() => switchTab('dashboard')); await page.waitForTimeout(800);
  await page.evaluate(() => { quickEditing = true; renderQuickLinks(); });
  await page.waitForTimeout(600);
  await page.click('.quick-edit-add'); await page.waitForTimeout(400);
  // fill to the cap, then a ninth
  for (let i = 0; i < 9; i++) {
    const n = await page.$$eval('.quick-manage-item[draggable="true"]', (e) => e.length);
    if (n >= 8 && i > 0) { const rows = await page.$$('ul[aria-label="More commands"] .note-picker-row'); await rows[0].click(); break; }
    const rows = await page.$$('ul[aria-label="More commands"] .note-picker-row'); if (!rows.length) break; await rows[0].click();
  }
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const card = document.querySelector('.quick-pick'), c = card.getBoundingClientRect();
    const sc = document.querySelector('.quick-manage-scroll');
    const rows = [...document.querySelectorAll('.quick-manage-item')];
    const out = rows.filter((r) => { const b = r.getBoundingClientRect(); return b.right > c.right + 0.5 || b.left < c.left - 0.5; }).length;
    const foot = [...document.querySelectorAll('.quick-manage-foot button')].map((b) => { const r = b.getBoundingClientRect(); return [b.textContent, Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
    const warn = document.querySelector('.quick-manage-warn');
    const heads = [...document.querySelectorAll('.quick-manage-group')].filter((h) => !h.hidden).map((h) => h.textContent);
    return { card: [Math.round(c.width), Math.round(c.height)], scrollOverflowX: sc.scrollWidth > sc.clientWidth, scrollLeft: sc.scrollLeft, cardOverflowX: card.scrollWidth > card.clientWidth,
      rowsOutsideCard: out, foot, footOneRow: new Set(foot.map((f) => f[1])).size === 1, heads, warn: warn && !warn.hidden ? warn.textContent : null,
      toasts: document.querySelectorAll('.toast').length, reportButtons: document.querySelectorAll('.toast-help').length };
  });
  console.log(JSON.stringify(m));
  await page.screenshot({ path: (process.env.SCRATCH || '.') + `/shots/qfit-${W}-${process.env.THEME || 'light'}.png` });
  await browser.close();
})();
