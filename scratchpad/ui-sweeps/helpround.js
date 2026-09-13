// INBOX 179: every icon-only '?' button is a circle, in every head that sets
// its own control height, and the boards dropdown says which rows are maps.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node helpround.js
const { boot } = require('./lib.js');
const scan = () => [...document.querySelectorAll('button')]
  .filter((b) => b.checkVisibility && b.checkVisibility() && b.querySelector('i.ph-question') && !b.textContent.trim())
  .map((b) => { const r = b.getBoundingClientRect(); return { id: b.id || b.className.slice(0, 30), w: +r.width.toFixed(1), h: +r.height.toFixed(1), oval: Math.abs(r.width - r.height) > 2, host: (b.parentElement.className || b.parentElement.id || '').toString().slice(0, 26) }; });

(async () => {
  const { page, browser } = await boot({});
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  const bad = [];
  const seen = [];
  const look = async (label) => { await page.waitForTimeout(600); for (const f of await page.evaluate(scan)) seen.push({ where: label, ...f }); };
  for (const tab of ['notes', 'chat', 'graph', 'library', 'timeline', 'dashboard', 'reminders']) {
    await page.evaluate((t) => switchTab(t), tab).catch(() => {});
    await look(tab);
  }
  for (const target of ['library-view-whiteboard', 'library-view-media', 'library-view-files']) {
    await page.evaluate(() => switchTab('library'));
    await page.click(`#library-subtabs [data-target="${target}"]`).catch(() => {});
    await look(target);
  }
  for (const section of ['browse', 'capture', 'writing-room', 'ask']) {
    await page.evaluate((s) => { switchTab('notes'); showNotesSection(s); }, section).catch(() => {});
    await look(`notes:${section}`);
  }
  for (const section of ['models', 'appearance', 'data', 'help']) {
    await page.evaluate((s) => openSettingsModal(s), section).catch(() => {});
    await look(`settings:${section}`);
    await page.evaluate(() => document.getElementById('settings-close')?.click());
  }
  const ovals = seen.filter((s) => s.oval);
  const sizes = [...new Set(seen.map((s) => `${s.w}x${s.h}`))];
  console.log(`179 help        ${seen.length} icon-only '?' buttons across ${new Set(seen.map((s) => s.where)).size} surfaces, ${ovals.length} oval, sizes ${sizes.join(', ')}`);
  for (const o of ovals) console.log(`   OVAL ${o.where} ${o.id} ${o.w}x${o.h} in ${o.host}`);
  if (ovals.length) bad.push(`${ovals.length} oval help button(s)`);

  await page.evaluate(() => switchTab('library'));
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]').catch(() => {});
  await page.waitForTimeout(1200);
  const boards = await page.evaluate(async () => {
    await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `probe map ${Date.now()}`, type: 'map' }) });
    await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `probe board ${Date.now()}`, type: 'board' }) });
    await refreshBoardList();
    const select = document.getElementById('wb-board-select');
    return [...select.querySelectorAll('option')].map((o) => o.textContent.trim());
  });
  const labelled = boards.every((t) => /^(Mind map|Board) · /.test(t));
  console.log(`179 boards      ${boards.length} option(s), every one names its kind ${labelled}: ${JSON.stringify(boards.slice(0, 4))}`);
  if (!labelled) bad.push('a board option does not say its kind');
  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
