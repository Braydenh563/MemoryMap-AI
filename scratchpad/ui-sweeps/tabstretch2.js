// INBOX 522: where does the top bar's well fill the gap instead of hugging its tabs?
// A well wider than its tabs by more than their own 4px padding is the owner's
// "stretched". Sweeps widths and the three header modes (tabs-centred / neither / tabs-wrapped).
const { boot } = require('./lib.js');
(async () => {
  const widths = (process.env.WS || '1000,1100,1200,1240,1300,1366,1440,1500,1600,1920').split(',').map(Number);
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const h = document.getElementById('top-bar'), bar = document.getElementById('tab-bar');
      const bs = [...bar.querySelectorAll('button[data-tab]')].filter((x) => x.offsetParent);
      const b = bar.getBoundingClientRect();
      const f = bs[0].getBoundingClientRect(), l = bs[bs.length - 1].getBoundingClientRect();
      return { mode: ['tabs-centred', 'tabs-wrapped'].filter((c) => h.classList.contains(c)).join('') || 'NEITHER',
        barW: Math.round(b.width), tabsW: Math.round(l.right - f.left), slackL: Math.round(f.left - b.left), slackR: Math.round(b.right - l.right) };
    });
    console.log(w, JSON.stringify(r));
  }
  await page.screenshot({ path: (process.env.SCRATCH || '.') + '/shots/tabstretch2.png', clip: { x: 0, y: 0, width: 1000, height: 70 } });
  await browser.close();
})();
