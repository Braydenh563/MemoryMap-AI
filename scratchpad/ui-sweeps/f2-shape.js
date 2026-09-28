// The shape of a long list: the chain of elements from a container down to
// the repeated row, with counts, so a containment rule names the right one.
//   SEL='#timeline-scroll' TAB=timeline node scratchpad/ui-sweeps/f2-shape.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((x) => switchTab(x), process.env.TAB || 'timeline');
  await page.waitForTimeout(3000);
  if (process.env.SUB) { await page.click(process.env.SUB); await page.waitForTimeout(2000); }
  const r = await page.evaluate((sel) => {
    const lines = [];
    const walk = (el, depth) => {
      if (depth > 4) return;
      const kids = [...el.children];
      const byClass = {};
      for (const k of kids) {
        const key = k.tagName.toLowerCase() + (k.className && typeof k.className === 'string' ? '.' + k.className.trim().split(/\s+/).join('.') : '');
        byClass[key] = byClass[key] || [];
        byClass[key].push(k);
      }
      for (const [key, els] of Object.entries(byClass)) {
        const h = els[0].getBoundingClientRect().height;
        lines.push(`${'  '.repeat(depth)}${els.length}x ${key.slice(0, 80)} h=${h.toFixed(0)} desc=${els[0].querySelectorAll('*').length}`);
        walk(els[0], depth + 1);
      }
    };
    const root = document.querySelector(sel);
    if (!root) return 'missing';
    walk(root, 0);
    return lines.join('\n');
  }, process.env.SEL || '#timeline-scroll');
  console.log(r);
  await browser.close();
})();
