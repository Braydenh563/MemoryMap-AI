// INBOX 669: prints the large view's figure tree (the companion visiting).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
  await page.evaluate(() => { localStorage.setItem('atlas-look', 'masculine'); document.documentElement.dataset.avatarMotion = 'always'; });
  await page.evaluate(() => { localStorage.removeItem('nm-buddy-spots'); const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.querySelector('#nm-buddy .nm-buddy-face').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
  await page.waitForTimeout(1000);
  const s = await page.evaluate(() => {
    const fig = document.querySelector('.nm-viewer .nm-viewer-figure');
    const skip = ['path', 'circle', 'ellipse', 'stop', 'defs', 'linearGradient', 'radialGradient', 'use', 'rect', 'polygon', 'line', 'text'];
    const walk = (el, d) => {
      if (d > 8) return '';
      const cs = getComputedStyle(el);
      let out = '  '.repeat(d) + el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + [...el.classList].join('.') + (el.dataset && el.dataset.atlasMood ? ' mood=' + el.dataset.atlasMood : '') + (cs.animationName !== 'none' ? ' anim=' + cs.animationName : '') + '\n';
      for (const c of el.children) if (!skip.includes(c.tagName)) out += walk(c, d + 1);
      return out;
    };
    return walk(fig, 0);
  });
  console.log(s.slice(0, 8000));
  await browser.close();
})();
