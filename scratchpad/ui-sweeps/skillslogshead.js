// INBOX 495: the Skill logs sidebar's head. Clear and the pin (collapse toggle)
// measured in three states: pinned open, collapsed then hover-peeked, and the
// same at 390 (where the sidebar is a sheet). Prints the gap between the two
// boxes and their vertical centres; exits 1 when they overlap, touch (gap
// under 4px), or sit on different centres.
//
//   BASE=http://127.0.0.1:8879 W=1440 node skillslogshead.js
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
(async () => {
  const mobile = W < 600;
  const { browser, page } = await boot({
    viewport: { width: W, height: mobile ? 844 : 900 },
    ...(mobile ? { hasTouch: true, isMobile: true } : {}),
  });
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-skills"]')?.click());
  await page.waitForTimeout(1800);
  let bad = 0;
  const read = async (label) => {
    const m = await page.evaluate(() => {
      const sb = document.getElementById('skills-sidebar');
      const clear = document.getElementById('skills-logs-clear');
      const pin = sb.querySelector('.sidebar-collapse-toggle');
      const box = (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, cy: (r.top + r.bottom) / 2, w: r.width, h: r.height }; };
      const h2 = document.getElementById('skills-logs-heading');
      return { sb: box(sb), clear: box(clear), pin: box(pin), h2: box(h2), cls: sb.className,
        pinVisible: getComputedStyle(pin).display !== 'none', clearOpacity: getComputedStyle(clear).opacity };
    });
    // The pin sits right of Clear in this right-hand sidebar? Either order: the gap is
    // the space between the two boxes on the x axis.
    const gap = Math.max(m.pin.l - m.clear.r, m.clear.l - m.pin.r);
    const dcy = Math.abs(m.pin.cy - m.clear.cy);
    const ok = gap >= 4 && dcy <= 1.5;
    if (!ok) bad = 1;
    console.log(`${label}: gap=${gap.toFixed(1)} dcy=${dcy.toFixed(1)} clear=${m.clear.l.toFixed(0)}..${m.clear.r.toFixed(0)}x${m.clear.h.toFixed(0)}@${m.clear.t.toFixed(0)} pin=${m.pin.l.toFixed(0)}..${m.pin.r.toFixed(0)}x${m.pin.h.toFixed(0)}@${m.pin.t.toFixed(0)} sb=${m.sb.l.toFixed(0)}..${m.sb.r.toFixed(0)} [${m.cls}] ${ok ? 'ok' : 'BAD'}`);
  };
  if (mobile) {
    await page.evaluate(() => document.querySelector('#skills-sidebar .sidebar-collapse-toggle')?.click());
    await page.waitForTimeout(600);
    await read('phone sheet open');
  } else {
    await read('pinned open');
    await page.evaluate(() => document.querySelector('#skills-sidebar .sidebar-collapse-toggle').click());
    await page.waitForTimeout(700);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    const box = await page.evaluate(() => { const r = document.getElementById('skills-sidebar').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 200 }; });
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(900);
    await read('collapsed, peeked (hover)');
    await page.mouse.move(100, 400);
    await page.waitForTimeout(700);
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(900);
    await read('collapsed, peeked again');
    await page.screenshot({ path: (process.env.SCRATCH || '.') + `/skillslogs-${W}.png`, clip: { x: Math.max(0, W - 460), y: 60, width: 460, height: 260 } });
  }
  await browser.close();
  process.exit(bad);
})();
