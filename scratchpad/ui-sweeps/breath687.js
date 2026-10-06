// INBOX 687 (the owner: "does the companion or at least atlas have a subtle
// breathing look??"). Samples, every frame for 10 s at rest, the screen box of
// the torso, the head and the whole figure for: the companion as Atlas (both
// looks), the companion as a generated face, Atlas's large view, and a small
// Atlas mark. Reports each part's swing (max minus min) in px and as a share
// of its size, and the largest step in a frame. A breath shows as the torso's
// size swinging a few percent while the head's size does not.
//   BASE=... CASES=buddy-m,buddy-f,face,viewer-m,viewer-f,mark SECS=10 node breath687.js
// MOTION=off|reduced|actions-off runs the same with that switch: nothing may
// breathe under `off`; reduced motion keeps what the stylesheet keeps.
const { boot } = require('./lib.js');
const ALL = ['buddy-m', 'buddy-f', 'face', 'viewer-m', 'viewer-f', 'mark'];
const SECS = Number(process.env.SECS || 10);

async function openCase(c) {
  const opts = { viewport: { width: 1280, height: 800 } };
  if (process.env.MOTION === 'reduced') opts.reducedMotion = 'reduce';
  const { browser, page } = await boot(opts);
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  const look = c.endsWith('-f') ? 'feminine' : 'masculine';
  await page.evaluate(({ look, buddy }) => {
    localStorage.setItem('atlas-look', look);
    localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy');
    b.value = buddy;
    b.dispatchEvent(new Event('change', { bubbles: true }));
  }, { look, buddy: c === 'face' ? 'me' : c === 'mark' ? 'off' : 'atlas' });
  // A small mark: the dashboard's own, set to Atlas.
  if (c === 'mark') await page.evaluate(() => { const s = document.getElementById('dash-mark'); s.value = 'atlas'; s.dispatchEvent(new Event('change', { bubbles: true })); switchTab('dashboard'); });
  if (process.env.MOTION === 'off') await page.evaluate(() => { const s = document.getElementById('avatar-motion'); s.value = 'off'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  if (process.env.MOTION === 'actions-off') await page.evaluate(() => { const s = document.getElementById('avatar-buddy-actions'); s.value = 'off'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(3500);
  if (c.startsWith('viewer')) {
    await page.evaluate(() => openNameMarkViewer('Atlas'));
    await page.waitForTimeout(1500);
  }
  // Rest: no act, no walk, no mood for the sample's length.
  await page.evaluate(() => { if (typeof nmb !== 'undefined') { nmb.nextActAt = Infinity; } });
  return { browser, page, errs };
}

async function sample(page, c) {
  return page.evaluate(({ c, secs }) => new Promise((done) => {
    const root = c.startsWith('viewer') ? document.querySelector('.nm-viewer .nm-viewer-figure')
      : c === 'mark' ? [...document.querySelectorAll('.nm-atlas')].find((el) => !el.closest('#nm-buddy, .nm-viewer') && el.getBoundingClientRect().width > 8)
        : document.getElementById('nm-buddy');
    if (!root) { done({ missing: true }); return; }
    const pick = (sels) => { for (const s of sels) { const el = root.querySelector(s); if (el) return el; } return null; };
    const parts = {
      torso: pick(['.atl-layer-body .atl-fills .nmb-torso', '.nmb-torso', '.nm-body']),
      head: pick(['.atl-layer-body .nm-buddy-head', '.nm-buddy-head', '.atl-head', '.nm-face', '.nm-eyes']),
      figure: root,
    };
    const rows = [];
    const t0 = performance.now();
    // COST=1: count frames only, so the measure's own reads (a layout per
    // part per frame) do not sit on top of the cost being measured.
    const bare = !!window.__costOnly;
    const tick = (now) => {
      const row = { t: now - t0 };
      if (bare) { rows.push(row); if (now - t0 < secs * 1000) requestAnimationFrame(tick); else done({ rows, which: {} }); return; }
      for (const [k, el] of Object.entries(parts)) {
        if (!el) continue;
        // An SVG part by its screen matrix: its scale along its own axes
        // (a sway's turn does not read as a change of size) and where its
        // own middle is. An HTML box by its rect.
        if (el.getScreenCTM && el.getBBox) {
          const m = el.getScreenCTM();
          let bb; try { bb = el.getBBox(); } catch (e) { bb = { x: 0, y: 0, width: 0, height: 0 }; }
          const p = new DOMPoint(bb.x + bb.width / 2, bb.y + bb.height / 2).matrixTransform(m);
          row[k] = [p.x, p.y, Math.hypot(m.a, m.b) * bb.width, Math.hypot(m.c, m.d) * bb.height];
        } else {
          const b = el.getBoundingClientRect();
          row[k] = [b.left + b.width / 2, b.top + b.height / 2, b.width, b.height];
        }
      }
      rows.push(row);
      if (now - t0 < secs * 1000) requestAnimationFrame(tick);
      else done({ rows, which: Object.fromEntries(Object.entries(parts).map(([k, el]) => [k, el ? (el.getAttribute('class') || el.tagName).split(' ').slice(0, 2).join(' ') : null])) });
    };
    requestAnimationFrame(tick);
  }), { c, secs: SECS });
}

function analyse(rows) {
  const out = {};
  for (const k of ['torso', 'head', 'figure']) {
    const v = rows.filter((r) => r[k]).map((r) => r[k]);
    if (!v.length) continue;
    const span = (i) => Math.max(...v.map((x) => x[i])) - Math.min(...v.map((x) => x[i]));
    const mean = (i) => v.reduce((s, x) => s + x[i], 0) / v.length;
    let step = 0;
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1][k]; const b = rows[i][k]; if (!a || !b) continue;
      const s = 16.67 / Math.max(4, rows[i].t - rows[i - 1].t);
      step = Math.max(step, Math.max(Math.hypot(b[0] - a[0], b[1] - a[1]), Math.abs(b[2] - a[2]), Math.abs(b[3] - a[3])) * s);
    }
    out[k] = {
      size: [+mean(2).toFixed(1), +mean(3).toFixed(1)],
      swingW: `${span(2).toFixed(2)}px ${((100 * span(2)) / mean(2)).toFixed(2)}%`,
      swingH: `${span(3).toFixed(2)}px ${((100 * span(3)) / mean(3)).toFixed(2)}%`,
      travel: +Math.hypot(span(0), span(1)).toFixed(2),
      maxStepPx: +step.toFixed(2),
    };
  }
  return out;
}

(async () => {
  const table = {};
  for (const c of (process.env.CASES || ALL.join(',')).split(',')) {
    const { browser, page, errs } = await openCase(c);
    // The main thread's cost of the rest, from the browser's own counters.
    if (process.env.COST) await page.evaluate(() => { window.__costOnly = true; });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const res = await sample(page, c);
    const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    res.cost = { taskMsPerSec: +((1000 * (m1.TaskDuration - m0.TaskDuration)) / SECS).toFixed(1), styleMsPerSec: +((1000 * (m1.RecalcStyleDuration - m0.RecalcStyleDuration)) / SECS).toFixed(1), layoutsPerSec: +((m1.LayoutCount - m0.LayoutCount) / SECS).toFixed(1) };
    table[c] = res.missing ? 'missing' : { frames: res.rows.length, cost: res.cost, which: res.which, ...analyse(res.rows), errs };
    console.log(c, JSON.stringify(table[c]));
    await browser.close();
  }
})();
