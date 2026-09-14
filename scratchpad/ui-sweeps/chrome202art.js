// INBOX 202, the other half of the switch: what it costs with the generative
// background on, which is the state the report is most likely to be in.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({});
  await page.evaluate(() => {
    try { localStorage.setItem('bgArt', 'on'); } catch (e) { /* private mode */ }
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);
  const state = await page.evaluate(() => ({
    p5: typeof p5 !== 'undefined',
    artOn: localStorage.getItem('bgArt'),
    canvas: !!document.getElementById('bg-art-canvas'),
  }));
  console.log('202 art state:', JSON.stringify(state));
  //: The Dashboard is the worst case and the likeliest one: its constellation
  //: is a second p5 sketch, rebuilt from scratch on every theme change.
  await page.click('#tab-bar button[data-tab="dashboard"]');
  await page.waitForTimeout(2500);

  const cost = await page.evaluate(async () => {
    const runs = [];
    for (let i = 0; i < 6; i += 1) {
      const t0 = performance.now();
      document.getElementById('theme-btn').click();
      document.body.getBoundingClientRect();
      getComputedStyle(document.body).backgroundColor;
      const sync = performance.now() - t0;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      runs.push({ sync: Math.round(sync * 100) / 100, toSecondFrame: Math.round((performance.now() - t0) * 100) / 100 });
      await new Promise((r) => setTimeout(r, 700));
    }
    const med = (key) => {
      const xs = runs.map((r) => r[key]).sort((a, b) => a - b);
      return xs[Math.floor(xs.length / 2)];
    };
    return { runs, medianSync: med('sync'), medianToFrame: med('toSecondFrame') };
  });
  console.log('202 cost with art on:', JSON.stringify(cost));

  //: The switch still switches, and the deferred rebuild still happens: the
  //: mode flips, the suppression class is gone again, and the art canvas is
  //: back after the frame the colours painted in.
  const after = await page.evaluate(async () => {
    const before = document.documentElement.dataset.mode;
    document.getElementById('theme-btn').click();
    const mid = document.documentElement.classList.contains('theme-switching');
    await new Promise((r) => setTimeout(r, 600));
    return {
      before,
      afterMode: document.documentElement.dataset.mode,
      suppressedDuringClick: mid,
      suppressionCleared: !document.documentElement.classList.contains('theme-switching'),
      canvas: !!document.getElementById('bg-art-canvas'),
    };
  });
  console.log('202 still works:', JSON.stringify(after));
  await browser.close();
})();
