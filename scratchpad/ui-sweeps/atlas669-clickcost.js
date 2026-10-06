// INBOX 669: the main thread a click on Atlas costs in its own large view
// (the longest frame after each of 8 clicks, and setAtlasMood's own time).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
  await page.evaluate((look) => { localStorage.setItem('atlas-look', look); document.documentElement.dataset.avatarMotion = 'always'; }, process.env.LOOK || 'masculine');
  await page.evaluate(() => openNameMarkViewer('Atlas'));
  await page.waitForTimeout(2500);
  const res = [];
  for (let i = 0; i < 8; i += 1) {
    const [x, y] = await page.evaluate(() => { const b = document.querySelector('.nm-viewer-figure .atl-layer-body .nm-buddy-head').getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height * 0.45]; });
    await page.evaluate(() => {
      window.__f = [];
      let last = performance.now();
      const t0 = last;
      const f = (now) => { window.__f.push(now - last); last = now; if (now - t0 < 900) requestAnimationFrame(f); };
      requestAnimationFrame(f);
      if (!window.__wrapped) {
        window.__wrapped = true;
        const orig = setAtlasMood;
        window.__mood = [];
        // eslint-disable-next-line no-global-assign
        setAtlasMood = function (...a) { const t = performance.now(); const r = orig.apply(this, a); window.__mood.push(performance.now() - t); return r; };
      }
    });
    await page.mouse.click(x, y);
    await page.waitForTimeout(1500);
    res.push(await page.evaluate(() => ({ longest: Math.round(Math.max(...window.__f)), mood: window.__mood.slice(-1)[0] && Math.round(window.__mood.slice(-1)[0]) })));
  }
  console.log(JSON.stringify(res));
  await browser.close();
})();
