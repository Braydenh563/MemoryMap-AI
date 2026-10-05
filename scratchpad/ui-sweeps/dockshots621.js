// INBOX 621: a strip screenshot of every tab and sub-tab dock, for looking at
// (the numbers are dockgrammar621.js). TAG names the set (before, after).
//   BASE=… SCRATCH=… TAG=before PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node dockshots621.js
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
const TAG = process.env.TAG || 'shot';
const STOPS = require('./dockstops621.js');
(async () => {
  const opts = { viewport: { width: W, height: W < 600 ? 844 : 900 } };
  if (W < 600) Object.assign(opts, { hasTouch: true, isMobile: true });
  const { browser, page, OUT } = await boot(opts);
  for (const [name, go, dock] of STOPS) {
    await go(page);
    const el = await page.$(dock);
    if (!el) { console.log(name, 'no dock'); continue; }
    const b = await el.boundingBox();
    if (!b || !b.height) { console.log(name, 'hidden'); continue; }
    await page.screenshot({ path: `${OUT}/${TAG}-${W}-${name}.png`, clip: { x: Math.max(0, b.x - 8), y: Math.max(0, b.y - 8), width: Math.min(W, b.width + 16), height: b.height + 16 } });
    console.log(name, Math.round(b.width) + 'x' + Math.round(b.height));
  }
  await browser.close();
})();
