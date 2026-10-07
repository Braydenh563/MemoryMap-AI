// Composer voice setting (2026-10-06): Settings, Personas, "Wording when no model is
// running". Measures: the row sits in the Answer style group on the label-left,
// field-right grid, nothing overflows, the help '?' opens its popover, and a change
// is saved to /preferences as composer_voice.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.waitForTimeout(2500);
  await page.evaluate(() => openSettingsModal('personas'));
  console.log(await page.evaluate(() => { const e = document.getElementById('pref-voice'); let n = e, out = []; while (n && out.length < 6) { out.push((n.id || n.className || n.tagName).toString().slice(0, 30) + ':' + (n.getBoundingClientRect().width | 0)); n = n.parentElement; } return out.join(' < '); }));
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const sel = document.getElementById('pref-voice');
    const style = document.getElementById('pref-style');
    const row = sel.closest('.row');
    const r = sel.closest('.select-shell').getBoundingClientRect(), s = style.closest('.select-shell').getBoundingClientRect(), rr = row.getBoundingClientRect();
    const pane = row.closest('.settings-group').getBoundingClientRect();
    return {
      value: sel.value, options: [...sel.options].map((o) => o.value),
      selLeft: Math.round(r.left), styleLeft: Math.round(s.left), selW: Math.round(r.width), styleW: Math.round(s.width),
      rowOverflowsGroup: rr.right > pane.right + 1, rowH: Math.round(rr.height),
      scrollOverflow: row.scrollWidth > row.clientWidth + 1,
    };
  });
  console.log(JSON.stringify(m));
  await page.click('[data-help-for="composer-voice-help"]');
  await page.waitForTimeout(400);
  console.log('help visible', await page.evaluate(() => {
    const h = document.getElementById('composer-voice-help');
    const r = h.getBoundingClientRect();
    return { hidden: h.classList.contains('hidden'), w: Math.round(r.width), h: Math.round(r.height) };
  }));
  await page.selectOption('#pref-voice', 'professional');
  await page.waitForTimeout(800);
  const saved = await page.evaluate(async () => (typeof prefsCache === 'object' && prefsCache.composer_voice) + ' / selected ' + document.getElementById('pref-voice').value);
  console.log('saved', saved);
  await page.screenshot({ path: (process.env.SCRATCH || '.') + `/shots/voice1006-${W}.png` });
  console.log('errors', errors);
  await browser.close();
})();
