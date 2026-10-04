// What the selection glide costs, and that reduced motion turns it off
// (INBOX 459 (2)). DESIGN.md "Motion", the recipe row "A selection that
// moves between options".
//
// For each strip that carries the glide, it clicks between options ROUNDS
// times and reads, per click, over the WINDOW_MS after it:
//
//   ms        the indicator's own transition duration (0 when none ran)
//   props     what it transitioned (the recipe allows the four insets only)
//   layouts   Chrome's LayoutCount delta (CDP Performance.getMetrics), with
//             a CONTROL pass that switches the indicator's transition off:
//             the difference is what the glide itself costs
//   p95       the 95th percentile frame time (rAF deltas), glide and control
//   lands     the indicator's box against the active option's box once it
//             has settled (px; 0 means it sits exactly on it)
//
// REDUCED=1 runs the same with `prefers-reduced-motion: reduce`, and
// APPEARANCE=1 with Appearance's own switch (`data-motion="reduced"`): in
// both, `ms` must be 0 on every click and `lands` 0 straight after it.
//
//   BASE=http://127.0.0.1:8836 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/glide.js      (exits 1 on a miss)
//   ROUNDS=20 (default)  ONLY='tab bar,chat mode'  VERBOSE=1 prints each click's ms
const { boot } = require('./lib.js');

const ROUNDS = Number(process.env.ROUNDS || 20);
const WINDOW_MS = 320;
const REDUCED = !!process.env.REDUCED;
const APPEARANCE = !!process.env.APPEARANCE;

const STRIPS = [
  { name: 'tab bar', tab: 'notes', strip: '#tab-bar', options: ['#tab-btn-notes', '#tab-btn-chat', '#tab-btn-library', '#tab-btn-timeline'] },
  { name: 'notes sub-tabs', tab: 'notes', strip: '#notes-subtabs', options: ['#notes-subtabs > button:nth-child(1)', '#notes-subtabs > button:nth-child(2)'] },
  { name: 'notes view', tab: 'notes', strip: '.notes-view-toggle', options: ['.notes-view-toggle > button:nth-child(2)', '.notes-view-toggle > button:nth-child(1)'] },
  { name: 'library sub-tabs', tab: 'library', strip: '#library-subtabs', options: ['#library-subtabs > button:nth-child(2)', '#library-subtabs > button:nth-child(1)'] },
  { name: 'chat mode', tab: 'chat', strip: '#chat-mode-seg', options: ['#chat-mode-seg > button:nth-child(2)', '#chat-mode-seg > button:nth-child(1)'] },
  { name: 'settings nav', tab: 'notes', settings: true, strip: '#settings-nav', options: ['#settings-nav [data-section="appearance"]', '#settings-nav [data-section="models"]'] },
];

const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};

async function metrics(cdp) {
  const { metrics: m } = await cdp.send('Performance.getMetrics');
  const get = (n) => (m.find((x) => x.name === n) || {}).value || 0;
  return { layouts: get('LayoutCount'), layoutMs: get('LayoutDuration') * 1000 };
}

// The click is a real pointer click (`page.click`), not `element.click()`:
// a real click moves focus to the option first, and Chromium starts no
// transition on an anchored box when the switch takes `tabIndex` off a
// button that still has focus (measured: revealTab's roving tabindex with
// focus left on the old tab, the glide skipped every time; with focus on
// the new one, as a pointer or the arrow keys leave it, never).
async function clickAndWatch(page, cdp, strip, sel) {
  const before = await metrics(cdp);
  await page.evaluate((strip) => {
    const host = document.querySelector(strip);
    const rec = { frames: [], runs: [], on: true };
    window.__glide = rec;
    let last = performance.now();
    const tick = (t) => { rec.frames.push(t - last); last = t; if (rec.on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    rec.listen = (e) => {
      if (e.pseudoElement !== '::before' || e.target !== host) return;
      const d = getComputedStyle(host, '::before').transitionDuration.split(',')
        .map((x) => parseFloat(x) * (x.trim().endsWith('ms') ? 1 : 1000));
      rec.runs.push({ prop: e.propertyName, ms: Math.max(...d) });
    };
    host.addEventListener('transitionrun', rec.listen);
  }, strip);
  await page.click(sel);
  const read = await page.evaluate(async ({ strip, WINDOW_MS }) => {
    const host = document.querySelector(strip);
    const rec = window.__glide;
    const box = () => {
      const on = host.querySelector('.active');
      if (!on) return null;
      const a = on.getBoundingClientRect();
      // The pseudo-element has no rect of its own; its resolved insets
      // against the host's padding box are what it draws.
      const cs = getComputedStyle(host, '::before');
      if (cs.content === 'none' || cs.display === 'none') return { none: true };
      const h = host.getBoundingClientRect();
      const bl = parseFloat(getComputedStyle(host).borderLeftWidth) || 0;
      const bt = parseFloat(getComputedStyle(host).borderTopWidth) || 0;
      const left = h.left + bl + parseFloat(cs.left) - host.scrollLeft;
      const top = h.top + bt + parseFloat(cs.top) - host.scrollTop;
      return { dx: Math.abs(left - a.left), dy: Math.abs(top - a.top), dw: Math.abs(parseFloat(cs.width) - a.width), dh: Math.abs(parseFloat(cs.height) - a.height) };
    };
    const first = box();
    await new Promise((r) => setTimeout(r, WINDOW_MS));
    rec.on = false;
    host.removeEventListener('transitionrun', rec.listen);
    const settled = box();
    const ms = rec.runs.length ? Math.max(...rec.runs.map((r) => r.ms)) : 0;
    const props = [...new Set(rec.runs.map((r) => r.prop))].sort().join(',');
    return { ms, props, frames: rec.frames.slice(1), first, settled };
  }, { strip, WINDOW_MS });
  const after = await metrics(cdp);
  return { ...read, layouts: after.layouts - before.layouts, layoutMs: after.layoutMs - before.layoutMs };
}

async function run(page, cdp, s, control) {
  if (control) {
    // A constructed sheet: the CSP refuses an injected <style>.
    await page.evaluate((rule) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(rule);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }, `${s.strip}::before { transition: none !important; }`);
  }
  const rows = [];
  for (let i = 0; i < ROUNDS; i++) {
    rows.push(await clickAndWatch(page, cdp, s.strip, s.options[i % s.options.length]));
  }
  return rows;
}

(async () => {
  const opts = REDUCED ? { reducedMotion: 'reduce' } : {};
  let misses = 0;
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  for (const s of STRIPS.filter((x) => !only || only.includes(x.name))) {
    const out = {};
    for (const control of REDUCED || APPEARANCE ? [false] : [false, true]) {
      const { browser, page } = await boot(opts);
      if (APPEARANCE) await page.evaluate(() => { document.documentElement.dataset.motion = 'reduced'; });
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Performance.enable');
      await page.click('#tab-btn-' + s.tab);
      await page.waitForTimeout(600);
      if (s.settings) { await page.click('#settings-btn'); await page.waitForTimeout(800); }
      // One click first, so the strip has a resting indicator to move from.
      await clickAndWatch(page, cdp, s.strip, s.options[s.options.length - 1]);
      out[control ? 'control' : 'glide'] = await run(page, cdp, s, control);
      await browser.close();
    }
    const g = out.glide;
    const msSet = [...new Set(g.map((r) => r.ms))].join('/');
    const props = [...new Set(g.map((r) => r.props))].join(' | ');
    const lay = g.map((r) => r.layouts);
    const frames = g.flatMap((r) => r.frames);
    const off = (b) => (b && !b.none ? Math.max(b.dx, b.dy, b.dw, b.dh) : (b && b.none ? -1 : null));
    const lands = Math.max(...g.map((r) => off(r.settled) ?? 0));
    const firstOff = Math.max(...g.map((r) => off(r.first) ?? 0));
    const lms = g.map((r) => r.layoutMs);
    let line = `${s.name.padEnd(17)} ms ${msSet || 0}  props ${props || '-'}  layouts/click med ${pct(lay, 0.5)} max ${Math.max(...lay)} (${pct(lms, 0.5).toFixed(2)}ms)  p95 ${pct(frames, 0.95).toFixed(1)}ms  lands ${lands.toFixed(1)}px`;
    if (process.env.VERBOSE) console.log(g.map((r) => r.ms).join(' '));
    if (out.control) {
      const cl = out.control.map((r) => r.layouts);
      const cf = out.control.flatMap((r) => r.frames);
      const clms = out.control.map((r) => r.layoutMs);
      line += `  | control layouts med ${pct(cl, 0.5)} max ${Math.max(...cl)} (${pct(clms, 0.5).toFixed(2)}ms)  p95 ${pct(cf, 0.95).toFixed(1)}ms`;
    }
    if (REDUCED || APPEARANCE) {
      line += `  first ${firstOff.toFixed(1)}px`;
      if (g.some((r) => r.ms > 0) || firstOff > 0.5) { misses++; line += '  MISS'; }
    } else if (lands > 0.5) { misses++; line += '  MISS'; }
    console.log(line);
  }
  process.exit(misses ? 1 : 0);
})();
