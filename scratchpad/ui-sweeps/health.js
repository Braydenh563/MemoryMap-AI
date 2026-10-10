// Rule 14 (WORLD_CLASS_PLAN 28.1): Settings, About, Health shows every field,
// each present and dated, and Check now runs the integrity check in one click.
// BASE=http://127.0.0.1:PORT node scratchpad/ui-sweeps/health.js
const {boot, OUT} = require('./lib.js');
(async () => {
  const out = {};
  for (const width of [1440, 390]) {
    const {browser, page} = await boot({viewport: {width, height: width > 600 ? 900 : 844}});
    await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
    await page.evaluate(() => openSettingsModal('about'));
    await page.waitForTimeout(2500);
    await page.click('#health-integrity-check');
    await page.waitForTimeout(1500);
    const fields = await page.evaluate(() => {
      const dated = (t) => /\d{1,2}:\d{2}|ago|just now/i.test(t);
      return Object.fromEntries(['health-checked', 'health-last-backup', 'health-data-dir', 'health-jobs', 'health-last-error', 'health-integrity']
        .map((id) => { const t = (document.getElementById(id)?.textContent || '').trim(); return [id, {present: t.length > 2 && t !== ',', dated: dated(t), text: t.slice(0, 90)}]; }));
    });
    const geo = await page.evaluate(() => {
      const g = document.getElementById('health-group');
      return {groupScrollX: g.scrollWidth - g.clientWidth, button: Math.round(document.getElementById('health-integrity-check').getBoundingClientRect().height)};
    });
    const missing = Object.entries(fields).filter(([, f]) => !f.present || !f.dated).map(([id]) => id);
    out[width] = {fields, geo, missing};
    await page.screenshot({path: `${OUT}/health-${width}.png`});
    await browser.close();
  }
  console.log(JSON.stringify(out, null, 1));
  const bad = Object.values(out).some((w) => w.missing.length);
  console.log(bad ? 'HEALTH: a field is missing or undated' : 'HEALTH: every field present and dated');
  process.exitCode = bad ? 1 : 0;
})();
