// The large view's ledge (the bar a sitting or hanging companion rests on or
// hangs from): for each pose the companion has when its view opens, the
// view's figure carries the same `data-pose`, the ledge's computed opacity is
// 1 for sit and hang and 0 otherwise, and a pose change while it is open
// follows. Env: BASE, KIND (atlas).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((k) => {
    localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true }));
  }, process.env.KIND || 'atlas');
  await page.waitForTimeout(3500);
  const out = [];
  for (const pose of ['stand', 'sit', 'hang', 'float']) {
    await page.evaluate((pose) => {
      clearTimeout(nmb.timer);
      document.getElementById('nm-buddy').dataset.pose = nmb.pose = pose;
    }, pose);
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector('#nm-buddy .nm-buddy-face').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const fig = document.querySelector('.nm-viewer-figure');
      const ledge = fig && fig.querySelector('.nm-viewer-ledge');
      return fig && { figPose: fig.dataset.pose, buddyPose: document.getElementById('nm-buddy').dataset.pose, opacity: ledge && getComputedStyle(ledge).opacity, top: ledge && getComputedStyle(ledge).top };
    });
    // A pose change while the view is open follows (a mutation observer).
    const live = await page.evaluate(async () => {
      const b = document.getElementById('nm-buddy'); const fig = document.querySelector('.nm-viewer-figure');
      b.dataset.pose = 'sit'; await new Promise((r) => setTimeout(r, 400));
      const a = { figPose: fig.dataset.pose, opacity: getComputedStyle(fig.querySelector('.nm-viewer-ledge')).opacity };
      b.dataset.pose = 'stand'; await new Promise((r) => setTimeout(r, 400));
      return { sit: a, stand: { figPose: fig.dataset.pose, opacity: getComputedStyle(fig.querySelector('.nm-viewer-ledge')).opacity } };
    });
    out.push({ pose, ...r, live });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
    out[out.length - 1].home = await page.evaluate(() => ({ visit: !!nmb.visit, inView: !!document.getElementById('nm-buddy').closest('.nm-viewer-figure') }));
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
