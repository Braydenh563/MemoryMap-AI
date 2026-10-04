// Label backgrounds on and off, counted where the canvas draws them.
//   BASE=http://127.0.0.1:8807 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/graphplates.js (THEME=dark)
// Seed with graphlook.js first. Prints plates (roundRect) and halos
// (strokeText) in one frame, with the switch on, off, and after a reload.
const { boot, OUT } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(6000);
  const count = () => page.evaluate(async () => {
    const ctx = document.getElementById('graph-canvas').getContext('2d');
    const n = { plates: 0, halos: 0 };
    const rr = ctx.roundRect, st = ctx.strokeText;
    ctx.roundRect = function (...a) { n.plates++; return rr.apply(this, a); };
    ctx.strokeText = function (...a) { n.halos++; return st.apply(this, a); };
    gcRequestDraw();
    await new Promise((r) => setTimeout(r, 300));
    ctx.roundRect = rr; ctx.strokeText = st;
    return { ...n, stored: localStorage.getItem('graph-label-plates'), checked: document.getElementById('graph-label-plates').checked };
  });
  console.log('on:', JSON.stringify(await count()));
  await page.click('#graph-options-toggle');
  await page.waitForTimeout(300);
  await page.click('#graph-display > summary');
  await page.waitForTimeout(200);
  await page.click('label:has(#graph-label-plates)');
  await page.waitForTimeout(400);
  console.log('off:', JSON.stringify(await count()));
  await page.click('#graph-options-toggle');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/graphplates-off-${process.env.THEME || 'light'}.png` });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (await page.isVisible('#lock-password')) { await page.fill('#lock-password', 'testpassword123'); await page.click('#lock-submit'); await page.waitForTimeout(1500); }
  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(6000);
  console.log('after reload:', JSON.stringify(await count()));
  await browser.close();
})();
