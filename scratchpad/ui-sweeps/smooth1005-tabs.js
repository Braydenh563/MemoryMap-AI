// INBOX 580: every tab switch, the main popups and the heavy surfaces,
// recorded a frame at a time. For each step: frames until the surface is
// fully shown (the transition's real length), blank frames (the page drawn
// at under 15% or nothing of it under nine sample points), layout shifts
// after the step (with or without recent input: a shift you caused still
// reads as a jump), skeleton frames, the longest frame, and long tasks.
//   BASE=http://127.0.0.1:8860 node scratchpad/ui-sweeps/smooth1005-tabs.js
// GATE=1 exits 1 when any tab switch has a blank frame, or a tab or popup
// declares a transition outside the motion tokens (100 to 260ms; exactly 0
// under REDUCED=1). The measured fade is printed beside it: on a loaded
// machine its frames stretch it.
const { boot } = require('./lib.js');

const PROBE = () => {
  // Installed once: a frame sampler that a step starts and reads back.
  if (window.__tp) return;
  const tp = (window.__tp = { on: false, frames: [], shifts: [], long: [], sel: '' });
  new PerformanceObserver((l) => { if (tp.on) for (const e of l.getEntries()) tp.shifts.push({ t: e.startTime - tp.t0, v: e.value, input: e.hadRecentInput }); }).observe({ type: 'layout-shift' });
  try { new PerformanceObserver((l) => { if (tp.on) for (const e of l.getEntries()) tp.long.push(Math.round(e.duration)); }).observe({ type: 'longtask' }); } catch (e) {}
  const opacityOf = (el) => { let o = 1; for (let n = el; n && n !== document.documentElement; n = n.parentElement) o *= +getComputedStyle(n).opacity; return o; };
  const sample = (t) => {
    if (!tp.on) return;
    const el = tp.sel ? document.querySelector(tp.sel) : document.querySelector('.tab-page:not(.hidden)');
    let op = 0, hits = 0, r = null;
    if (el) {
      r = el.getBoundingClientRect();
      op = opacityOf(el);
      // Nine points over the surface's own box (inside its edges): a hit on
      // a descendant means something of the surface is drawn there.
      for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.15, 0.45, 0.75]) {
        const x = r.left + r.width * fx, y = r.top + Math.min(r.height, innerHeight - r.top) * fy;
        const hit = document.elementFromPoint(x, y);
        if (hit && hit !== el && el.contains(hit)) hits += 1;
      }
    }
    // A placeholder is drawn content even though it takes no pointer (hit
    // testing passes through it).
    if (el && el.querySelector(':scope > .tab-placeholder:not(.tab-placeholder-leaving)')) hits = Math.max(hits, 9);
    const sk = el ? el.querySelectorAll('.skeleton').length : 0;
    tp.frames.push({ t: t - tp.t0, id: el ? el.id || el.className.split(' ')[0] : '', op: +op.toFixed(3), hits, sk, h: r ? Math.round(r.height) : 0 });
    requestAnimationFrame(sample);
  };
  tp.start = (sel) => { tp.sel = sel || ''; tp.frames = []; tp.shifts = []; tp.long = []; tp.t0 = performance.now(); tp.on = true; requestAnimationFrame(sample); };
  // The transition the surface declares for its opacity, in ms: the frame
  // timing of a loaded machine stretches what is measured, this does not.
  const declared = () => {
    const el = tp.sel ? document.querySelector(tp.sel.replace(/ > \*$/, '')) : document.querySelector('.tab-page:not(.hidden)');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const props = cs.transitionProperty.split(',').map((x) => x.trim());
    const durs = cs.transitionDuration.split(',').map((x) => parseFloat(x) * (x.trim().endsWith('ms') ? 1 : 1000));
    const i = props.findIndex((p) => p === 'opacity' || p === 'all');
    return i < 0 ? 0 : Math.round(durs[i % durs.length]);
  };
  tp.stop = () => { tp.on = false; return { frames: tp.frames, shifts: tp.shifts, long: tp.long, declared: declared() }; };
};

function report(name, d, want) {
  // From the first frame that shows the surface asked for: the frames
  // before it are the old page, still up while the click is dispatched.
  const at = d.frames.findIndex((x) => (want ? x.id === want : x.h > 0));
  const f = at < 0 ? [] : d.frames.slice(at);
  const shown = f.findIndex((x) => x.op >= 0.99 && x.hits > 0);
  const blank = f.filter((x, i) => (shown < 0 || i <= shown) && (x.op < 0.15 || x.hits === 0)).length;
  const full = shown >= 0 ? Math.round(f[shown].t) : -1;
  const firstOp = f.length ? f[0].op : -1;
  // The fade's own length: from the first frame under 0.99 to the first at
  // or over it (0 when it was never under: no transition).
  const fadeStart = f.findIndex((x) => x.op < 0.99);
  const fadeEnd = fadeStart < 0 ? -1 : f.findIndex((x, i) => i > fadeStart && x.op >= 0.99);
  const fade = fadeStart < 0 ? 0 : fadeEnd < 0 ? -1 : Math.round(f[fadeEnd].t - f[fadeStart].t);
  const skFrames = f.filter((x) => x.sk > 0).length;
  const skGone = f.findIndex((x, i) => i && f[i - 1].sk > 0 && x.sk === 0);
  const cls = d.shifts.reduce((s, x) => s + x.v, 0);
  const gaps = f.map((x, i) => (i ? x.t - f[i - 1].t : 0));
  const heights = [...new Set(f.map((x) => x.h))];
  const row = { name, declaredMs: d.declared, firstOp, fadeMs: fade, fullAtMs: full, blank, skFrames, skeletonSwapAt: skGone > 0 ? Math.round(f[skGone].t) : null, shift: +cls.toFixed(4), maxFrame: Math.round(Math.max(0, ...gaps)), long: d.long.join(',') || '-', heights: heights.slice(0, 5).join('/') };
  console.log(JSON.stringify(row));
  return row;
}

(async () => {
  const opts = { viewport: { width: +(process.env.W || 1440), height: +(process.env.H || 900) } };
  if (process.env.REDUCED) opts.reducedMotion = 'reduce';
  const { browser, page } = await boot(opts);
  await page.evaluate(PROBE);
  const rows = [];
  const step = async (name, sel, act, wait = 900, want = null) => {
    await page.evaluate((s) => window.__tp.start(s), sel);
    await act();
    await page.waitForTimeout(wait);
    rows.push(report(name, await page.evaluate(() => window.__tp.stop()), want));
    await page.waitForTimeout(150);
  };
  const tabs = await page.$$eval('#tab-bar button[data-tab]', (b) => b.filter((x) => x.offsetParent).map((x) => x.dataset.tab));
  for (const pass of [1, 2]) {
    for (const tab of tabs) await step(`tab ${tab}${pass === 1 ? ' (first)' : ''}`, null, () => page.click(`#tab-bar button[data-tab="${tab}"]`), pass === 1 ? 1600 : 700, `tab-${tab}`);
  }
  await page.click('#tab-bar button[data-tab="dashboard"]'); await page.waitForTimeout(400);
  await step('settings open', '#settings-modal .modal-card, #settings-modal > *', () => page.evaluate(() => openSettingsModal()), 700);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await step('palette open', '#palette-overlay:not(.hidden) > *', () => page.evaluate(() => openPalette()), 600);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await step('finder open', '#finder-overlay:not(.hidden) > *', () => page.evaluate(() => openFinder()), 600);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await step('confirm dialog', '.confirm-overlay:last-of-type .modal-card, .confirm-overlay:last-of-type > *', () => page.evaluate(() => { window.__c = confirmDialog('Smoothness probe?', { confirmLabel: 'Yes' }); }), 600);
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  // Sub-tabs: every visible role=tab strip inside the Notes and Library pages.
  for (const tab of ['notes', 'library']) {
    await page.click(`#tab-bar button[data-tab="${tab}"]`); await page.waitForTimeout(700);
    const subs = await page.$$eval(`#tab-${tab} [role="tablist"] [role="tab"]`, (b) => b.filter((x) => x.offsetParent && !x.classList.contains('active') && x.getAttribute('aria-selected') !== 'true').slice(0, 4).map((x) => x.id || x.dataset.view || x.textContent.trim()));
    for (const s of subs) {
      await step(`${tab} sub ${s}`, null, () => page.evaluate(([t, s]) => { const b = [...document.querySelectorAll(`#tab-${t} [role="tablist"] [role="tab"]`)].find((x) => (x.id || x.dataset.view || x.textContent.trim()) === s); b && b.click(); }, [tab, s]), 800);
    }
  }
  await browser.close();
  const bad = rows.filter((r) => r.name.startsWith('tab ') && r.blank > 0);
  // Tabs and popups carry the recipe's transition; sub-tabs swap in place.
  const carried = rows.filter((r) => r.name.startsWith('tab ') || / open$| dialog$/.test(r.name));
  const off = carried.filter((r) => (process.env.REDUCED ? r.declaredMs !== 0 : r.declaredMs < 100 || r.declaredMs > 260));
  console.log(`tab switches with a blank frame: ${bad.length}/${rows.filter((r) => r.name.startsWith('tab ')).length}; transitions outside the tokens: ${off.length} (${off.map((r) => r.name + ' ' + r.declaredMs).join(', ')})`);
  if (process.env.GATE && (bad.length || off.length)) process.exit(1);
})();
