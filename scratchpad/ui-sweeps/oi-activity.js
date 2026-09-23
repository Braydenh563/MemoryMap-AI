// The Recent activity widget (WORLD_CLASS_PLAN B1's strip over GET /events):
// off by default, drawn once added, reads the newest rows first and then only
// what came after its cursor, and a row names the actor when it was not you.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8801';
const {boot} = require('./lib.js');
(async () => {
  const {browser, page} = await boot();
  let fails = 0;
  const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${got}`); if (!ok) fails++; };
  const requests = [];
  page.on('request', (r) => { if (r.url().includes('/events')) requests.push(r.url().replace(/^.*\/events/, '/events')); });
  await page.click('[data-tab="dashboard"]').catch(() => {});
  await page.waitForTimeout(1200);
  const hiddenByDefault = await page.evaluate(() => dashLayout().hidden.includes('activity') && !document.querySelector('[data-widget="activity"]'));
  check('off on a dashboard that never saw it', hiddenByDefault, hiddenByDefault);
  await page.evaluate(async () => {
    await apiJson('/entries', {method: 'POST', body: JSON.stringify({content: 'Harbour tide tables\nfor the weekend'})});
    await loadEntries?.();
    await toggleDashWidgetHidden('activity');
    await renderDashboard();
  });
  await page.waitForTimeout(1500);
  const read = () => page.evaluate(() => {
    const card = document.querySelector('[data-widget="activity"]');
    if (!card) return null;
    const rows = [...card.querySelectorAll('.dash-list li')];
    const r = card.getBoundingClientRect();
    return {w: Math.round(r.width), h: Math.round(r.height), rows: rows.length,
      first: rows[0] ? rows[0].innerText.replace(/\s+/g, ' ').trim() : '',
      buttons: rows.filter((li) => li.getAttribute('role') === 'button').length,
      overflow: card.scrollWidth > card.clientWidth + 1};
  });
  let s = await read();
  check('drawn once added', s && s.rows > 0, JSON.stringify(s));
  check('newest row names the note', s && /Harbour tide tables/.test(s.first), s && s.first);
  check('no sideways overflow', s && !s.overflow, s && s.overflow);
  await page.evaluate(async () => {
    await apiJson('/entries', {method: 'POST', body: JSON.stringify({content: 'Lighthouse keeper rota'})});
    await loadEntries?.();
    await renderDashboard();
  });
  await page.waitForTimeout(1500);
  s = await read();
  check('a later render picks up the new row', s && /Lighthouse keeper rota/.test(s.first), s && s.first);
  const tailReads = requests.filter((u) => u.includes('tail=')).length;
  const cursorReads = requests.filter((u) => u.includes('since=')).length;
  check('first read is a tail, later ones follow the cursor', tailReads === 1 && cursorReads >= 1, JSON.stringify(requests));
  // Leave the layout as the sweep found it.
  await page.evaluate(() => toggleDashWidgetHidden('activity'));
  console.log(`findings: ${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
