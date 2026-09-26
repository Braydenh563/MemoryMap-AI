// `--accent-text` against every palette, accent preset and mode (INBOX 426,
// round 4): the contrast of the derived text colour on the lightest and the
// darkest ground each mode draws text on, and the raw `--accent` beside it
// for comparison. The grounds are measured from the app's own tokens where
// they are solid (`--modal-bg-opaque`, the page) and fixed greys for the
// tinted groups the contrast sweep reported (a settings group's 224 grey).
//
//   BASE=http://127.0.0.1:8793 node scratchpad/ui-sweeps/accenttext.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 800, height: 600 } });
  const r = await page.evaluate(() => {
    const root = document.documentElement;
    const names = (attr) => {
      const out = new Set();
      for (const sheet of document.styleSheets) {
        let rules; try { rules = sheet.cssRules; } catch { continue; }
        const walk = (list) => { for (const rule of list) {
          if (rule.cssRules && !rule.selectorText) { walk(rule.cssRules); continue; }
          for (const m of (rule.selectorText || '').matchAll(new RegExp(`\\[data-${attr}="([a-z-]+)"\\]`, 'g'))) out.add(m[1]);
        } };
        walk(rules);
      }
      return [...out];
    };
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rgb = (css) => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
    const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const probe = document.createElement('span');
    document.body.appendChild(probe);
    const read = (prop) => { probe.style.color = `var(${prop})`; return rgb(getComputedStyle(probe).color); };
    const saved = { palette: root.dataset.palette, accent: root.dataset.accent, mode: root.dataset.mode, theme: root.dataset.theme };
    // A picked accent is written inline on the root (settings.js) and would
    // stand over every preset; set aside while the presets are measured.
    const inlineAccent = root.style.getPropertyValue('--accent');
    root.style.removeProperty('--accent');
    const palettes = ['', ...names('palette')];
    const accents = ['', ...names('accent')];
    const rows = [];
    for (const mode of ['light', 'dark']) {
      root.dataset.mode = mode; root.dataset.theme = mode;
      const grounds = mode === 'light'
        ? { white: [255, 255, 255], paper: [250, 249, 246], group: [224, 224, 223] }
        : { modal: null, raised: [62, 64, 72] };
      for (const pal of palettes) {
        if (pal) root.dataset.palette = pal; else delete root.dataset.palette;
        for (const acc of accents) {
          if (acc) root.dataset.accent = acc; else delete root.dataset.accent;
          const g = { ...grounds };
          if (mode === 'dark') g.modal = read('--modal-bg-opaque');
          const text = read('--accent-text'), raw = read('--accent');
          const worst = Math.min(...Object.values(g).map((b) => ratio(text, b)));
          const rawWorst = Math.min(...Object.values(g).map((b) => ratio(raw, b)));
          rows.push({ mode, pal: pal || 'default', acc: acc || 'default', worst: Math.round(worst * 100) / 100, raw: Math.round(rawWorst * 100) / 100 });
        }
      }
    }
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete root.dataset[k]; else root.dataset[k] = v; }
    // And custom accents, the colours a person can pick: the extremes.
    for (const mode of ['light', 'dark']) {
      root.dataset.mode = mode; root.dataset.theme = mode;
      delete root.dataset.palette; delete root.dataset.accent;
      for (const hex of ['#ffff00', '#00ffff', '#ff00ff', '#ffffff', '#000000', '#7fff00', '#ff0000', '#0000ff', '#888888']) {
        root.style.setProperty('--accent', hex);
        const g = mode === 'light' ? { white: [255, 255, 255], group: [224, 224, 223] } : { modal: read('--modal-bg-opaque'), raised: [62, 64, 72] };
        const text = read('--accent-text');
        const worst = Math.min(...Object.values(g).map((b) => ratio(text, b)));
        rows.push({ mode, pal: 'custom', acc: hex, worst: Math.round(worst * 100) / 100, raw: 0 });
      }
    }
    root.style.removeProperty('--accent');
    if (inlineAccent) root.style.setProperty('--accent', inlineAccent);
    probe.remove();
    return rows;
  });
  const failing = r.filter((x) => x.worst < 4.5);
  const rawFailing = r.filter((x) => x.raw < 4.5);
  console.log(`${r.length} palette x accent x mode combinations; raw --accent under 4.5:1 on ${rawFailing.length}; --accent-text under 4.5:1 on ${failing.length}`);
  for (const x of failing.slice(0, 20)) console.log('  FAIL', JSON.stringify(x));
  const min = r.reduce((a, b) => (b.worst < a.worst ? b : a));
  console.log('  lowest --accent-text', JSON.stringify(min));
  await browser.close();
  process.exitCode = failing.length ? 1 : 0;
})();
