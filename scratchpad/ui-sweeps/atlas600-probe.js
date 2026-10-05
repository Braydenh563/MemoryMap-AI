// INBOX 600 probe: the plain ("You") companion visiting its large view:
// its tree (classes to depth 5) and the animations running on it over 6s.
//   BASE=... KIND=me node atlas600-probe.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
  await page.evaluate((k) => {
    document.documentElement.dataset.avatarMotion = 'always';
    localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy');
    b.value = k;
    b.dispatchEvent(new Event('change', { bubbles: true }));
  }, process.env.KIND || 'me');
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.querySelector('#nm-buddy .nm-buddy-face').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
  await page.waitForTimeout(800);
  const out = await page.evaluate(async () => {
    const b = document.getElementById('nm-buddy');
    const tree = [];
    const walk = (el, d) => { if (d > 5) return; tree.push(`${'  '.repeat(d)}${el.tagName.toLowerCase()}.${(el.getAttribute('class') || '').split(' ').join('.')}`); for (const c of el.children) if (!(c instanceof SVGElement) || d < 4) walk(c, d + 1); };
    walk(b, 0);
    const seen = {};
    for (let i = 0; i < 30; i += 1) {
      for (const a of b.getAnimations({ subtree: true })) {
        const k = `${a.animationName || a.id || 'anon'} @ ${(a.effect.target.getAttribute('class') || a.effect.target.tagName).split(' ')[0]}`;
        seen[k] = (seen[k] || 0) + 1;
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    return { cls: b.className, tree: tree.slice(0, 40), seen };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
