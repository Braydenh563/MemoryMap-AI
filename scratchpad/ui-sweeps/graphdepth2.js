// graph view sweeps: one measure each, consolidated: one async function per case.
// Run one case by name, or every case in order with no argument:
//   node scratchpad/ui-sweeps/graphdepth2.js graphcorner

// The graph's bottom corner on a phone: the zoom stack, the legend and the
// floating New note, and whether any two of them overlap (INBOX 479).
//   BASE=... W=390 node graphdepth2.js graphcorner
async function graphcorner() {
  const { boot } = require('./lib.js');
  const W = Number(process.env.W || 390);
    const phone = W < 600;
    const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, hasTouch: phone || undefined, isMobile: phone || undefined });
    await page.click('[data-tab="graph"]').catch(() => {});
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const box = (sel) => { const e = document.querySelector(sel); if (!e || !e.checkVisibility()) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), r: Math.round(b.right), b: Math.round(b.bottom) }; };
      const parts = { zoom: box('#graph-zoom'), legend: box('.graph-legend:not(.hidden), #graph-legend'), fab: box('.dock-fab'), minimap: box('#graph-minimap, .graph-minimap') };
      const names = Object.keys(parts).filter((k) => parts[k]);
      const overlaps = [];
      for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
        const a = parts[names[i]], b = parts[names[j]];
        const w = Math.min(a.r, b.r) - Math.max(a.x, b.x), h = Math.min(a.b, b.b) - Math.max(a.y, b.y);
        if (w > 0 && h > 0) overlaps.push(`${names[i]}/${names[j]} ${w}x${h}`);
      }
      return { parts, overlaps };
    });
    console.log(W, JSON.stringify(r));
    await browser.close();
}

// INBOX 738: the first visible frame's scale against the fitted scale.
//   BASE=... START=force|tree|radial|arc node scratchpad/ui-sweeps/graphdepth2.js graphfirstframe
// Prints the settled k, the first visible frame [ms, k, opacity] and how many
// visible frames were more than 10% off the settled k (want 0).
async function graphfirstframe() {
  const { boot } = require('./lib.js');
    const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
    await page.evaluate((l) => { localStorage.setItem('graph-layout', l); }, process.env.START || 'force');
    await page.evaluate(() => {
      window.__frames = [];
      const t0 = performance.now();
      const loop = () => {
        const c = document.getElementById('graph-canvas');
        if (c && typeof gcTab !== 'undefined' && gcTab.transform && gcTab.nodes.length) {
          const op = +getComputedStyle(c).opacity;
          window.__frames.push([Math.round(performance.now() - t0), +gcTab.transform.k.toFixed(3), +op.toFixed(2)]);
        }
        if (performance.now() - t0 < 9000) requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    await page.click('[data-tab="graph"]');
    await page.waitForTimeout(9500);
    const f = await page.evaluate(() => window.__frames);
    const finalK = f[f.length - 1][1];
    const visible = f.filter((x) => x[2] > 0.05);
    const first = visible[0];
    const worst = visible.reduce((a, b) => (Math.abs(b[1] / finalK - 1) > Math.abs(a[1] / finalK - 1) ? b : a), first);
    console.log(JSON.stringify({ finalK, firstVisible: first, worstVisible: worst, visibleOffBy10pct: visible.filter((x) => Math.abs(x[1] / finalK - 1) > 0.1).length, frames: f.length }));
    await browser.close();
}

// Label backgrounds on and off, counted where the canvas draws them.
//   BASE=http://127.0.0.1:8807 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/graphdepth2.js graphplates (THEME=dark)
// Seed with graphlook.js first. Prints plates (roundRect) and halos
// (strokeText) in one frame, with the switch on, off, and after a reload.
async function graphplates() {
  const { boot, OUT } = require('./lib.js');
    const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
    await page.click('[data-tab="graph"]');
    await page.waitForTimeout(6000);
    const count = () => page.evaluate(async () => {
      const ctx = document.getElementById('graph-canvas').getContext('2d');
      const n = { plates: 0, halos: 0 };
      const rr = ctx.roundRect, st = ctx.strokeText;
      ctx.roundRect = function (...a) { n.plates++; return rr.apply(this, a); };
      ctx.strokeText = function (...a) { n.halos++; return st.apply(this, a); };
      gcRequestDraw();
      await new Promise((r) => setTimeout(r, 300));
      ctx.roundRect = rr; ctx.strokeText = st;
      return { ...n, stored: localStorage.getItem('graph-label-plates'), checked: document.getElementById('graph-label-plates').checked };
    });
    console.log('on:', JSON.stringify(await count()));
    await page.click('#graph-options-toggle');
    await page.waitForTimeout(300);
    await page.click('#graph-display > summary');
    await page.waitForTimeout(200);
    await page.click('label:has(#graph-label-plates)');
    await page.waitForTimeout(400);
    console.log('off:', JSON.stringify(await count()));
    await page.click('#graph-options-toggle');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/graphplates-off-${process.env.THEME || 'light'}.png` });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    if (await page.isVisible('#lock-password')) { await page.fill('#lock-password', 'testpassword123'); await page.click('#lock-submit'); await page.waitForTimeout(1500); }
    await page.click('[data-tab="graph"]');
    await page.waitForTimeout(6000);
    console.log('after reload:', JSON.stringify(await count()));
    await browser.close();
}

// The owner, 2026-10-10: "I went onto the radial view and it put me on a random
// corner". Opens the Graph, waits WAIT ms (5000 lands in the force cooling
// window where the race was), switches through SEQ by the picker and prints
// the layout box centre against the view centre (off, px) and the scale.
//   BASE=... SEQ=radial,tree WAIT=5000 node scratchpad/ui-sweeps/graphdepth2.js graphviewswitch
async function graphviewswitch() {
  const { boot } = require('./lib.js');
  const measure = () => {
    const s = gcTab, t = s.transform, W = s.dims.w, H = s.dims.h;
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const n of s.nodes) { const x = n.x * t.k + t.x, y = n.y * t.k + t.y; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    return { layout: s.layoutKind, k: +t.k.toFixed(3), off: [Math.round((minX + maxX) / 2 - W / 2), Math.round((minY + maxY) / 2 - H / 2)], W, H, op: s.canvas.style.opacity };
  };
    const vp = (process.env.VP || '1440x900').split('x').map(Number);
    const { browser, page } = await boot({ viewport: { width: vp[0], height: vp[1] } });
    await page.evaluate((l) => { localStorage.setItem('graph-layout', l); }, process.env.START || 'force');
    await page.click('[data-tab="graph"]');
    await page.waitForTimeout(+(process.env.WAIT || 800));
    console.log('start', JSON.stringify(await page.evaluate(measure)));
    for (const lay of (process.env.SEQ || 'radial,tree').split(',')) {
      if (!(await page.isVisible('#graph-layout'))) await page.click('#graph-options-toggle');
      await page.waitForTimeout(200);
      await page.selectOption('#graph-layout', lay);
      for (const ms of [700, 3000]) { await page.waitForTimeout(ms); console.log(lay, ms, JSON.stringify(await page.evaluate(measure))); }
    }
    await page.screenshot({ path: process.env.SCRATCH + '/shots/viewswitch3.png' });
    await browser.close();
}

const CASES = {
  graphcorner,
  graphfirstframe,
  graphplates,
  graphviewswitch,
};
const names = process.argv.slice(2);
const unknown = names.filter((n) => !Object.prototype.hasOwnProperty.call(CASES, n));
if (unknown.length) {
  console.error(`unknown case: ${unknown.join(", ")}`);
  console.error(`cases: ${Object.keys(CASES).join(", ")}`);
  process.exit(2);
}
(async () => {
  for (const name of names.length ? names : Object.keys(CASES)) await CASES[name]();
})();
