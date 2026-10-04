// INBOX 524 follow-up: an error toast's Report this (and Undo-style actions) never overflow their box.
// W / THEME as the other sweeps; touch context at 390.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 390);
  const phone = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: 844 }, hasTouch: phone, isMobile: phone });
  await page.waitForTimeout(500);
  await page.evaluate(() => { toast('Something went wrong inside MemoryMap. Try again; if it keeps happening, Settings > Logs has the details.', true); toastAction('Note deleted', 'Undo', () => {}); });
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => {
    const tr = t.getBoundingClientRect();
    return { cls: t.className, box: [Math.round(tr.left), Math.round(tr.width), Math.round(tr.height)], overflowX: t.scrollWidth > t.clientWidth,
      kids: [...t.children].map((c) => { const r = c.getBoundingClientRect(); return { tag: c.tagName + '.' + c.className, w: Math.round(r.width), h: Math.round(r.height), inside: r.left >= tr.left - 0.5 && r.right <= tr.right + 0.5, clips: c.scrollWidth > c.clientWidth + 1 }; }) };
  }));
  console.log(JSON.stringify(out, null, 1));
  await page.screenshot({ path: (process.env.SCRATCH || '.') + `/shots/toastfit-${W}-${process.env.THEME || 'light'}.png` });
  await browser.close();
})();
