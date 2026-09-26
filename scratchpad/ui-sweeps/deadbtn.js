// Buttons that are drawn (visible, opaque, enabled) but cannot be pressed:
// computed pointer-events none, or another element on top at their centre.
// From the 2026-09-24 polish pass (uipolish-0924.md), kept here since.
//
// **What is not a control is not counted.** A proxy a menu row clicks (the
// chat's Export and Delete, `.visually-hidden` with `aria-hidden`) is clipped
// to nothing by design, so something else is always at its centre; the first
// version of this sweep reported both on every run. Skipped: anything under
// `aria-hidden="true"`, and anything whose `clip-path` is set, which is how
// `.visually-hidden` takes a control out of sight.
//
//   BASE=http://127.0.0.1:8810 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/deadbtn.js
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: 900 }, ...(W < 600 ? { hasTouch: true, isMobile: true } : {}) });
  let total = 0;
  for (const tab of ['dashboard', 'notes', 'chat', 'graph', 'library', 'timeline', 'reminders']) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(2200);
    const r = await page.evaluate(() => {
      const out = { pe: [], covered: [] };
      for (const b of document.querySelectorAll('button, a[href], [role=button], summary, input, select')) {
        if (!b.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        if (b.disabled) continue;
        if (b.closest('[aria-hidden="true"]')) continue;
        const c = getComputedStyle(b);
        if (c.clipPath && c.clipPath !== 'none') continue;
        const r = b.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
        if (parseFloat(c.opacity) < 0.2) continue;
        const name = (b.id ? '#' + b.id : '') + '.' + String(b.className).split(' ').slice(0, 2).join('.') + ' ' + (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 24);
        if (c.pointerEvents === 'none') { out.pe.push(name); continue; }
        const t = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
        if (t && t !== b && !b.contains(t) && !t.contains(b) && !(t.closest('label') && t.closest('label').contains(b))) out.covered.push(name + ' <- ' + t.tagName + '.' + String(t.className).split(' ')[0]);
      }
      return out;
    });
    total += r.pe.length + r.covered.length;
    console.log(tab.padEnd(10), 'pe-none:', r.pe.length, JSON.stringify(r.pe.slice(0, 8)), '| covered:', r.covered.length, JSON.stringify(r.covered.slice(0, 8)));
  }
  console.log(`== ${W}: ${total} findings`);
  await browser.close();
})();
