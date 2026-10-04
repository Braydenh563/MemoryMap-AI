// The top bar, item by item (INBOX 479 follow-up, the owner: "clean up the
// styling, spacing and alignment etc of the top bar"): each item's box,
// vertical centre, the gap to the next item, and each cluster's own face
// (background, border, radius, padding). W, THEME as usual.
//   BASE=... W=1440 node topbar479.js
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
(async () => {
  const phone = W < 600;
  const { browser, page, OUT } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, hasTouch: W < 820 ? true : undefined, isMobile: phone || undefined });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const vis = (e) => e && e.checkVisibility() && e.getBoundingClientRect().width > 0;
    const bar = document.getElementById('top-bar');
    const hb = bar.getBoundingClientRect();
    const sel = ['#brand-logo', '#top-bar > h1', '.space-switcher-btn', '#tab-bar', '#notif-btn', '#theme-btn', '#settings-btn', '#lock-btn', '#quit-btn', '#header-more', '.header-cluster-nav'];
    const items = [];
    for (const s of sel) {
      const e = document.querySelector(s);
      if (!vis(e)) continue;
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      items.push({ s, x: +b.left.toFixed(1), r: +b.right.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), cy: +(b.top + b.height / 2).toFixed(1), bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor, radius: cs.borderRadius, fw: cs.fontWeight });
    }
    items.sort((a, b) => a.x - b.x);
    for (let i = 0; i < items.length - 1; i++) items[i].gap = +(items[i + 1].x - items[i].r).toFixed(1);
    const clusters = [...document.querySelectorAll('#top-bar .header-cluster')].filter(vis).map((c) => { const b = c.getBoundingClientRect(); const cs = getComputedStyle(c); return { cls: c.className, x: Math.round(b.left), w: Math.round(b.width), h: Math.round(b.height), bg: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor, radius: cs.borderRadius, pad: cs.padding, gap: cs.gap }; });
    const hc = document.querySelector('.header-controls'); const hcs = getComputedStyle(hc);
    return { bar: { h: hb.height, pad: getComputedStyle(bar).padding, cy: hb.top + hb.height / 2 }, controls: { gap: hcs.gap }, items, clusters };
  });
  console.log(JSON.stringify(r, null, 1));
  await page.screenshot({ path: `${OUT}/topbar-${W}-${process.env.THEME || 'light'}.png`, clip: { x: 0, y: 0, width: W, height: 130 } });
  await browser.close();
})();
