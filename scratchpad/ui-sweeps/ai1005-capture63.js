// CHAT_PLAN, INBOX 63's decisions for Capture, Write with the AI and Ask,
// read against what renders: for each sub-tab, the visible controls inside
// it in reading order (tag#id[label]@x,y). SHOT_DIR saves a view of each.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.waitForTimeout(2500);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1200);
  for (const name of (process.env.SUBS || 'Capture,Writing room,Ask').split(',')) {
    await page.evaluate((label) => {
      const b = [...document.querySelectorAll('#tab-notes button')].find((x) => x.textContent.trim() === label && x.offsetParent);
      b?.click();
    }, name);
    await page.waitForTimeout(1200);
    const out = await page.evaluate(() => {
      const vis = (el) => el && el.offsetParent !== null && el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().top < innerHeight;
      return [...document.querySelectorAll('#tab-notes button, #tab-notes select, #tab-notes textarea, #tab-notes input, #tab-notes [contenteditable=true]')]
        .filter(vis)
        .filter((b) => b.getBoundingClientRect().top > 110)
        .map((b) => {
          const r = b.getBoundingClientRect();
          const label = (b.getAttribute('aria-label') || b.textContent || b.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 26);
          return `${b.tagName.toLowerCase()}#${b.id || ''}[${label}]@${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}x${Math.round(r.height)}`;
        });
    });
    console.log(name, JSON.stringify(out));
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/sub-${name.replace(/\W+/g, '')}-${W}-${process.env.THEME || 'light'}.png` });
  }
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
