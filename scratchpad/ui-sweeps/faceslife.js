// The owner: "my popup character doesnt really have much expression, same
// with when it is a profile avatar". Opens Settings on Profile, lists the
// faces on screen by size, and over 14s counts the small acts played on the
// large ones (48px and over: `nameMarkIdleAct`, Web Animations on their
// parts) and on the small ones (which must stay still), then the same with
// Avatar animation off (none). Exits 1 when the large faces get no act, a
// small one gets any, or anything plays with animation off.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => {
    window.__acts = { big: 0, small: 0 };
    const orig = Element.prototype.animate;
    Element.prototype.animate = function (...args) {
      const face = this.closest?.('.name-mark[data-nm-size], .nm-viewer-figure');
      if (face && !this.closest('#nm-buddy')) {
        const size = Number(face.dataset.nmSize || face.getAttribute('width')) || 0;
        window.__acts[size >= 48 || face.matches('.nm-viewer-figure') ? 'big' : 'small'] += 1;
      }
      return orig.apply(this, args);
    };
    openSettingsModal('preferences');
  });
  await page.waitForTimeout(1500);
  const faces = await page.evaluate(() => [...document.querySelectorAll('.name-mark')].filter((f) => f.getBoundingClientRect().width).map((f) => Number(f.dataset.nmSize || f.getAttribute('width')) || 0));
  await page.waitForTimeout(14000);
  const on = await page.evaluate(() => ({ ...window.__acts }));
  await page.evaluate(() => { document.documentElement.dataset.avatarMotion = 'off'; window.__acts = { big: 0, small: 0 }; });
  await page.waitForTimeout(12000);
  const off = await page.evaluate(() => ({ ...window.__acts }));
  console.log(JSON.stringify({ faceSizes: faces, actsOn: on, actsWithAnimationOff: off }));
  await browser.close();
  process.exit(on.big > 0 && on.small === 0 && off.big === 0 && off.small === 0 ? 0 : 1);
})();
