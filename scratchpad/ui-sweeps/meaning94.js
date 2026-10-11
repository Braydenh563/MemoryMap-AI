// Brief 94 (INBOX 857): the top-3 hit rate of tests/fixtures/meaning_queries_1011.json
// in the Settings search, the command palette and the Help topics search.
// BASE=http://127.0.0.1:PORT node meaning94.js [--misses]
const {boot} = require('./lib.js');
const fs = require('fs');
const path = require('path');
(async () => {
  const table = JSON.parse(fs.readFileSync(path.join(__dirname, '../../tests/fixtures/meaning_queries_1011.json'), 'utf8')).queries;
  const {browser, page} = await boot();
  await page.evaluate(() => Promise.all([ensureModule('settingsUi'), ensureModule('appPalette')]));
  await page.evaluate(() => openSettingsModal('help'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { findSettings('x'); paletteMatches('x'); });
  await page.waitForTimeout(2500);
  const rows = await page.evaluate((table) => table.map(({q, want}) => {
    const clean = (s) => String(s || '').replace(/(^|\s)ph:[\w-]+\s*/g, ' ').trim();
    helpApplySearch('');
    const settings = findSettings(q, 8).slice(0, 3).map((r) => r.text);
    const palette = paletteMatches(q).filter((r) => !r.handoff).slice(0, 3).map((r) => clean(r.label));
    helpApplySearch(q);
    const help = [...document.querySelectorAll('#help-topics details:not(.hidden) > summary')].slice(0, 3).map((s) => s.textContent.trim());
    const hit = (list) => list.some((t) => want.some((w) => t.toLowerCase().includes(w.toLowerCase())));
    return {q, settings, palette, help, s: hit(settings), p: hit(palette), h: hit(help)};
  }), table);
  const n = rows.length;
  const pct = (k) => `${rows.filter((r) => r[k]).length}/${n}`;
  console.log(`settings ${pct('s')}  palette ${pct('p')}  help ${pct('h')}  any ${rows.filter((r) => r.s || r.p).length}/${n}`);
  if (process.argv.includes('--misses')) {
    for (const r of rows) if (!r.s || !r.p || !r.h) console.log(`${r.s ? '.' : 'S'}${r.p ? '.' : 'P'}${r.h ? '.' : 'H'} ${r.q} | ${r.settings.join(' / ')} | ${r.palette.join(' / ')} | ${r.help.join(' / ')}`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
