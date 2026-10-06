// INBOX 669: does a script animation's implicit end keyframe ease toward a
// CSS animation running under it, or toward the element's static style?
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<style>@keyframes spin { to { rotate: 90deg; transform: translateX(90px); } } .on { animation: spin 1s linear; }</style><div id="d">x</div>`);
  const out = await page.evaluate(async () => {
    const d = document.getElementById('d');
    d.classList.add('on');
    getComputedStyle(d).rotate;
    d.animate([{ rotate: '0deg', transform: 'none', offset: 0 }], { duration: 500, easing: 'linear' });
    const at = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 700) {
      await new Promise((r) => requestAnimationFrame(r));
      const cs = getComputedStyle(d);
      at.push([Math.round(performance.now() - t0), cs.rotate, cs.transform]);
    }
    return at.filter((_, i) => i % 6 === 0);
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
