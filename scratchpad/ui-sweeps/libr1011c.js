// libr-1011 row 1234: the Attach picker's and the library picker's source
// strips are tab strips with counts. W wide, THEME light or dark.
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
(async () => {
  const { browser, page } = await boot({ args: ['--disable-dev-shm-usage', '--disable-gpu', '--renderer-process-limit=1'], viewport: { width: W, height: W > 800 ? 900 : 844 } });
  const out = { W, theme: process.env.THEME || 'light' };
  const measure = (selector) => page.evaluate((sel) => {
    const strip = document.querySelector(sel);
    if (!strip) return null;
    const cs = getComputedStyle(strip);
    const r = strip.getBoundingClientRect();
    const tabs = [...strip.querySelectorAll(':scope > button')].map((b) => {
      const t = b.getBoundingClientRect();
      const a = getComputedStyle(b, '::after');
      return { text: b.innerText.replace(/\n/g, ' '), w: Math.round(t.width), h: Math.round(t.height), selected: b.getAttribute('aria-selected'), line: a.transform !== 'none' && b.getAttribute('aria-selected') === 'true' ? a.transform : '', radius: getComputedStyle(b).borderRadius, bg: getComputedStyle(b).backgroundColor };
    });
    const host = strip.closest('#note-picker-panel, .entry-pick-card');
    const hr = host.getBoundingClientRect();
    return { className: strip.className, display: cs.display, overflowX: cs.overflowX, boxShadow: cs.boxShadow !== 'none', w: Math.round(r.width), hostW: Math.round(hr.width), scrollW: strip.scrollWidth, clientW: strip.clientWidth, pageOverflow: document.documentElement.scrollWidth > innerWidth, hostInView: hr.left >= -1 && hr.right <= innerWidth + 1, tabs };
  }, selector);
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => openNotePicker());
  await page.waitForTimeout(1500);
  out.attach = await measure('#note-picker-sources');
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/libr1011c-attach-${W}-${out.theme}.png` });
  await page.evaluate(() => closeNotePicker());
  await page.waitForTimeout(500);
  await page.evaluate(() => { window.__pick = pickLibraryItemDialog('Point at', { sources: ['note', 'document', 'file', 'link', 'board'] }); });
  await page.waitForTimeout(2500);
  out.library = await measure('.entry-pick-card .picker-kinds');
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/libr1011c-library-${W}-${out.theme}.png` });
  const tab = await page.$('.entry-pick-card .picker-kinds > button:nth-child(2)');
  if (tab) { await tab.click(); await page.waitForTimeout(800); }
  out.afterClick = await page.evaluate(() => [...document.querySelectorAll('.entry-pick-card .picker-kinds > button')].map((b) => b.getAttribute('aria-selected')));
  await page.keyboard.press('Escape');
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
