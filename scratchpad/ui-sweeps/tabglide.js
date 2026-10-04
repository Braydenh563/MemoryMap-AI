// The top bar's tab glide (the owner, 2026-10-04: "a slight css sliding
// animation for the active tab on the menubar tabs ... cheap but looks
// professional"). Clicks between top tabs ROUNDS times, then moves by the
// keyboard and resizes the window, and reads:
//
//   ms        how long the box was in motion after a click (rAF samples)
//   frames    frames with the box between the two tabs (0 = it jumped)
//   props     what the running animation moves (transform only)
//   layouts   Chrome's LayoutCount per click, against REDUCED=1's (no glide)
//   lands     the box against the active tab once settled (px)
//   keys      ArrowRight moves .active and the box lands on it
//   resize    after a resize the box sits on the active tab (px)
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/tabglide.js      (REDUCED=1, W=1024)
const { boot } = require('./lib.js');

const ROUNDS = Number(process.env.ROUNDS || 8);
const REDUCED = !!process.env.REDUCED;

(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 }, ...(REDUCED ? { reducedMotion: 'reduce' } : {}) });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const layouts = async () => (await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'LayoutCount').value;
  await page.waitForTimeout(1200);
  const off = () => page.evaluate(() => {
    const box = document.querySelector('#tab-bar > .tab-glide');
    const tab = document.querySelector('#tab-bar > button.active');
    if (!box || !tab) return null;
    const a = box.getBoundingClientRect();
    const b = tab.getBoundingClientRect();
    return +Math.max(Math.abs(a.left - b.left), Math.abs(a.width - b.width), Math.abs(a.top - b.top), Math.abs(a.height - b.height)).toFixed(1);
  });
  const tabs = ['#tab-btn-chat', '#tab-btn-library', '#tab-btn-notes', '#tab-btn-timeline'];
  const rows = [];
  for (let i = 0; i < ROUNDS; i++) {
    const sel = tabs[i % tabs.length];
    const before = await layouts();
    // Timed from the moment `.active` moves, not from the click: a tab
    // switch renders its page first, and that time is the page's.
    const probe = page.evaluate(() => new Promise((resolve) => {
      const bar = document.getElementById('tab-bar');
      const box = bar.querySelector(':scope > .tab-glide');
      const was = bar.querySelector(':scope > button.active');
      const xs = [];
      const props = new Set();
      let t0 = null;
      const tick = () => {
        const r = box.getBoundingClientRect();
        if (t0 === null && bar.querySelector(':scope > button.active') !== was) t0 = performance.now();
        if (t0 !== null) xs.push([performance.now() - t0, r.left, r.width]);
        for (const anim of box.getAnimations()) for (const k of anim.effect.getKeyframes()) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) props.add(p);
        if (t0 === null || performance.now() - t0 < 400) requestAnimationFrame(tick);
        else Promise.all(box.getAnimations().map((a) => a.finished)).then(() => resolve({ xs, props: [...props] }));
      };
      requestAnimationFrame(tick);
    }));
    await page.click(sel);
    const { xs, props } = await probe;
    const end = xs[xs.length - 1];
    const start = xs[0];
    const moving = xs.filter((s) => Math.abs(s[1] - end[1]) > 0.5 || Math.abs(s[2] - end[2]) > 0.5);
    const between = moving.filter((s) => Math.abs(s[1] - start[1]) > 0.5);
    rows.push({ to: sel, ms: moving.length ? Math.round(moving[moving.length - 1][0]) : 0, frames: between.length, props, layouts: (await layouts()) - before, lands: await off() });
    await page.waitForTimeout(150);
  }
  const med = (k) => rows.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
  console.log(JSON.stringify({ reduced: REDUCED, msMed: med('ms'), framesMed: med('frames'), props: [...new Set(rows.flatMap((r) => r.props))], layoutsMed: med('layouts'), landsMax: Math.max(...rows.map((r) => r.lands)) }));
  await page.focus('#tab-bar > button.active');
  const was = await page.evaluate(() => document.querySelector('#tab-bar > button.active').id);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(450);
  const now = await page.evaluate(() => document.querySelector('#tab-bar > button.active').id);
  console.log(JSON.stringify({ keys: `${was} -> ${now}`, lands: await off() }));
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.waitForTimeout(500);
  console.log(JSON.stringify({ resize: await off() }));
  await browser.close();
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
