// Brief 95: every accent preset in both modes, the button words against
// the fill they sit on (`--on-accent` on `--accent-surface`), measured from
// computed colours; then the custom picker's refusal: a pale pick in light
// and a dark pick in dark must be refused with an offer that reads.
//   BASE=http://127.0.0.1:8793 LOOK=study node scratchpad/ui-sweeps/accent95.js
const {boot} = require('./lib.js');
(async () => {
  const {browser, page} = await boot();
  const out = await page.evaluate(async () => {
    const lum = (c) => {
      const m = c.match(/[\d.]+/g).map(Number);
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => p - q); return (y + 0.05) / (x + 0.05); };
    const probe = document.createElement('div');
    probe.style.background = 'var(--accent-surface)';
    probe.style.color = 'var(--on-accent)';
    document.body.append(probe);
    const rows = [];
    for (const mode of ['light', 'dark']) {
      applyThemeChoice(mode);
      for (const a of ACCENTS) {
        applyAccent(a.name);
        const cs = getComputedStyle(probe);
        // color-mix surfaces compute to color(srgb r g b): scale 0..1 to 0..255
        const norm = (c) => c.startsWith('color(srgb') ? 'rgb(' + c.match(/[\d.]+/g).slice(0, 3).map((v) => Number(v) * 255).join(',') + ')' : c;
        rows.push([mode, a.name, ratio(norm(cs.backgroundColor), norm(cs.color)).toFixed(2)]);
      }
    }
    localStorage.removeItem('accent'); applyEffectiveAccent();
    // the refusal
    await openSettingsModal?.('appearance');
    const tries = [];
    for (const [mode, pick] of [['light', '#ffe066'], ['dark', '#1a237e'], ['light', '#1a237e']]) {
      applyThemeChoice(mode);
      const input = document.getElementById('accent-custom');
      input.value = pick; input.dispatchEvent(new Event('input'));
      const offer = document.getElementById('accent-offer');
      const shown = !offer.classList.contains('hidden');
      const label = document.getElementById('accent-offer-label').textContent;
      const stored = localStorage.getItem('accent-custom');
      if (shown) document.getElementById('accent-offer-use').click();
      tries.push({mode, pick, refused: shown, label: shown ? label : '', storedBefore: stored, storedAfter: localStorage.getItem('accent-custom')});
      localStorage.removeItem('accent-custom'); applyEffectiveAccent();
    }
    return {rows, tries};
  });
  const fails = out.rows.filter((r) => Number(r[2]) < 4.5);
  for (const r of out.rows) console.log(r.join(' '));
  console.log('presets under 4.5:', fails.length, 'of', out.rows.length);
  console.log(JSON.stringify(out.tries, null, 1));
  await browser.close();
})();
