// Screenshot helper for INBOX 479: a tab (and optional Library sub-tab index,
// board id or script) at a width, clipped to a selector's box.
//   BASE=... W=820 TAB=notes SEL='.tab-page:not(.hidden) .dock' OUT=/tmp/x.png node shot479.js
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
(async () => {
  const phone = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, hasTouch: W < 820 ? true : undefined, isMobile: phone || undefined });
  if (process.env.TAB) { await page.click(`[data-tab="${process.env.TAB}"]`).catch(() => {}); await page.waitForTimeout(900); }
  if (process.env.SUB) { await page.evaluate((i) => document.querySelectorAll('#library-subtabs [role=tab]')[i].click(), Number(process.env.SUB)); await page.waitForTimeout(900); }
  if (process.env.BOARD) { await page.evaluate((id) => openWhiteboardBoard(id), Number(process.env.BOARD)); await page.waitForTimeout(2200); }
  if (process.env.JS) { await page.evaluate(process.env.JS); await page.waitForTimeout(1200); }
  if (process.env.PROBE) console.log(JSON.stringify(await page.evaluate(process.env.PROBE)));
  const el = process.env.SEL ? await page.$(process.env.SEL) : null;
  if (el) await el.screenshot({ path: process.env.OUT });
  else await page.screenshot({ path: process.env.OUT });
  await browser.close();
})();
