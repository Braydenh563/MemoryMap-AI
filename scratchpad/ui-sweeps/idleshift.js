// A page left alone mid-scroll must stay still (INBOX 426 u, "the dashboard
// now as well"). Scrolls a tab's page part-way, then sits for IDLE ms and
// records every layout shift (with the nodes that moved) and every change of
// any scroller's scrollTop.
//
//   BASE=http://127.0.0.1:8793 TAB=dashboard IDLE=45000 node scratchpad/ui-sweeps/idleshift.js
const { boot } = require('./lib.js');
const TAB = process.env.TAB || 'dashboard';
const IDLE = Number(process.env.IDLE || 30000);
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 900) } });
  await page.evaluate((t) => switchTab(t), TAB);
  await page.waitForTimeout(2500);
  await page.mouse.move(720, 500);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(120); }
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const rec = (window.__is = { shifts: [], scrolls: [] });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        rec.shifts.push({ t: Math.round(e.startTime), v: Math.round(e.value * 1000) / 1000, who: e.sources.map((s) => s.node ? (s.node.id || s.node.className || s.node.nodeName).toString().slice(0, 40) + ` ${Math.round(s.previousRect.y)}->${Math.round(s.currentRect.y)}` : '?').slice(0, 4) });
      }
    }).observe({ type: 'layout-shift', buffered: false });
    const tops = new Map();
    document.addEventListener('scroll', (ev) => {
      const el = ev.target === document ? document.scrollingElement : ev.target;
      const was = tops.get(el) ?? null;
      tops.set(el, el.scrollTop);
      rec.scrolls.push({ t: Math.round(performance.now()), el: (el.id || el.className || el.tagName).toString().slice(0, 30), from: was === null ? '?' : Math.round(was), to: Math.round(el.scrollTop) });
    }, true);
  });
  await page.waitForTimeout(IDLE);
  const r = await page.evaluate(() => window.__is);
  console.log(`${TAB}: ${r.shifts.length} layout shifts, ${r.scrolls.length} scroll events in ${IDLE}ms idle`);
  for (const s of r.shifts.slice(0, 15)) console.log('  shift', JSON.stringify(s));
  for (const s of r.scrolls.slice(0, 15)) console.log('  scroll', JSON.stringify(s));
  await browser.close();
})();
