// Which elements does one attribute change restyle? Tracing's UpdateLayoutTree
// elementCount (and SelectorStats-free). Env: BASE, ATTRS="k=v,k=v".
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => {
    localStorage.setItem('atlas-look', process_look()); localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true }));
    function process_look() { return 'masculine'; }
  });
  await page.waitForTimeout(3500);
  await page.evaluate(() => clearTimeout(nmb.timer));
  if (process.env.INJECT) await page.evaluate((css) => { const sh = new CSSStyleSheet(); sh.replaceSync(css); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh]; }, process.env.INJECT);
  await page.waitForTimeout(500);
  const attrs = (process.env.ATTRS || 'data-atlas-variant=x,data-atlas-variant=1,data-lean=x,data-lean=l,data-pose=float,data-gait=feminine').split(',');
  const cdp = await page.context().newCDPSession(page);
  for (const a of attrs) {
    const [k, v] = a.split('=');
    const events = [];
    cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
    await cdp.send('Tracing.start', { traceConfig: { includedCategories: ['devtools.timeline'] } });
    await page.evaluate(([k, v]) => { const b = document.getElementById('nm-buddy'); getComputedStyle(b).opacity; b.setAttribute(k, v); getComputedStyle(b).opacity; getComputedStyle(b.querySelector('.atl-layer-body')).opacity; b.removeAttribute(k); getComputedStyle(b).opacity; }, [k, v]);
    const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end'); await done;
    const u = events.filter((e) => e.name === 'UpdateLayoutTree' && e.ph === 'X');
    console.log(a.padEnd(28), u.map((e) => `${e.args?.elementCount ?? '?'}el/${(e.dur / 1000).toFixed(1)}ms`).join(' '));
    cdp.removeAllListeners('Tracing.dataCollected');
  }
  await browser.close();
})();
