// What folding and unfolding a sidebar moves, and what it costs (INBOX 459
// (2); DESIGN.md "Motion"). Companion to glide.js.
//
// For the Notes and Chat sidebars, ROUNDS fold/unfold pairs through the
// sidebar's own toggle (a real click), and per change:
//
//   ran       the transitions that started on the sidebar's subtree, by
//             property, with their longest duration
//   layouts   Chrome's LayoutCount delta over WINDOW_MS (CDP)
//   p95       the 95th percentile frame time (rAF deltas)
//
// REDUCED=1 (the system hint) and APPEARANCE=1 (Appearance's own switch):
// nothing may run. Without either, only opacity, transform, translate,
// scale, colours and the rail's shadow may (the recipe), and something must.
//
//   BASE=http://127.0.0.1:8836 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/sidemotion.js     (exits 1 on a miss)
const { boot } = require('./lib.js');

const ROUNDS = Number(process.env.ROUNDS || 6);
const WINDOW_MS = 400;
const REDUCED = !!process.env.REDUCED;
const APPEARANCE = !!process.env.APPEARANCE;
// box-shadow: the folded rail's own (07-whiteboard-misc.css), a repaint, older than this pass.
const ALLOWED = new Set(['opacity', 'transform', 'translate', 'scale', 'color', 'background-color', 'box-shadow']);
const SIDEBARS = [['notes', 'sidebar'], ['chat', 'chat-sidebar']];

const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};

async function layouts(cdp) {
  const { metrics } = await cdp.send('Performance.getMetrics');
  return (metrics.find((m) => m.name === 'LayoutCount') || {}).value || 0;
}

async function change(page, cdp, id) {
  const before = await layouts(cdp);
  await page.evaluate((id) => {
    const aside = document.getElementById(id);
    const rec = { frames: [], runs: {}, on: true };
    window.__side = rec;
    let last = performance.now();
    const tick = (t) => { rec.frames.push(t - last); last = t; if (rec.on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    rec.listen = (e) => {
      const el = e.target;
      const cs = getComputedStyle(el, e.pseudoElement || null);
      const names = cs.transitionProperty.split(',').map((x) => x.trim());
      const i = Math.max(0, names.indexOf(e.propertyName));
      const pick = (v) => { const xs = v.split(','); return xs[i % xs.length].trim(); };
      const ms = (v) => parseFloat(v) * (v.endsWith('ms') ? 1 : 1000);
      const total = ms(pick(cs.transitionDuration)) + ms(pick(cs.transitionDelay));
      rec.runs[e.propertyName] = Math.max(rec.runs[e.propertyName] || 0, total);
    };
    aside.addEventListener('transitionrun', rec.listen);
  }, id);
  await page.click(`#${id} > .sidebar-collapse-toggle`);
  // Off the sidebar, so the hover-peek does not open what was just folded.
  await page.mouse.move(1200, 600);
  const read = await page.evaluate(async ({ id, WINDOW_MS }) => {
    await new Promise((r) => setTimeout(r, WINDOW_MS));
    const rec = window.__side;
    rec.on = false;
    document.getElementById(id).removeEventListener('transitionrun', rec.listen);
    return { runs: rec.runs, frames: rec.frames.slice(1), folded: document.getElementById(id).classList.contains('sidebar-collapsed') };
  }, { id, WINDOW_MS });
  return { ...read, layouts: (await layouts(cdp)) - before };
}

(async () => {
  let misses = 0;
  const { browser, page } = await boot(REDUCED ? { reducedMotion: 'reduce' } : {});
  if (APPEARANCE) await page.evaluate(() => { document.documentElement.dataset.motion = 'reduced'; });
  // NOBUDDY=1 hides the companion first (Ctrl+Shift+Y): its follow loop reads
  // rects while anything near it moves, which shows up in LayoutCount.
  if (process.env.NOBUDDY) { await page.keyboard.press('Control+Shift+Y'); await page.waitForTimeout(400); }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  for (const [tab, id] of SIDEBARS) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(700);
    // Start unfolded.
    if (await page.evaluate((id) => document.getElementById(id).classList.contains('sidebar-collapsed'), id)) {
      await page.click(`#${id} > .sidebar-collapse-toggle`);
      await page.waitForTimeout(500);
    }
    for (const label of ['fold', 'unfold']) {
      const rows = [];
      for (let i = 0; i < ROUNDS; i++) {
        const r = await change(page, cdp, id);
        if ((label === 'fold') !== r.folded) {
          // Keep the pair in step: this round measured the other direction.
          await change(page, cdp, id);
        }
        rows.push(r);
        // And back, unmeasured, for the next round of the same direction.
        await page.click(`#${id} > .sidebar-collapse-toggle`);
        await page.mouse.move(1200, 600);
        await page.waitForTimeout(450);
      }
      const runs = {};
      for (const r of rows) for (const [k, v] of Object.entries(r.runs)) runs[k] = Math.max(runs[k] || 0, v);
      const props = Object.keys(runs).sort();
      const bad = props.filter((p) => !ALLOWED.has(p));
      const lay = rows.map((r) => r.layouts);
      let line = `${id.padEnd(13)} ${label.padEnd(6)} ran ${props.map((p) => `${p} ${runs[p]}ms`).join(', ') || 'nothing'}  layouts med ${pct(lay, 0.5)} max ${Math.max(...lay)}  p95 ${pct(rows.flatMap((r) => r.frames), 0.95).toFixed(1)}ms`;
      if (REDUCED || APPEARANCE ? props.length : (bad.length || !props.length)) { misses++; line += '  MISS'; }
      console.log(line);
    }
  }
  await browser.close();
  process.exit(misses ? 1 : 0);
})();
