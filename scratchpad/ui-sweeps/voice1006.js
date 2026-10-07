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
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const sel = document.getElementById('pref-voice');
    const style = document.getElementById('pref-style');
    const row = sel.closest('.row');
    const r = sel.getBoundingClientRect(), s = style.getBoundingClientRect(), rr = row.getBoundingClientRect();
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
  const saved = await page.evaluate(async () => (await (await fetch('/preferences')).json()).composer_voice);
  console.log('saved', saved);
  await page.screenshot({ path: (process.env.SCRATCH || '.') + `/shots/voice1006-${W}.png` });
  console.log('errors', errors);
  await browser.close();
})();
