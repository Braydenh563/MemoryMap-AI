// Settings, What it learned: tick rows, the selection bar appears with the
// count, Delete asks once and removes them in one request (POST /learned/bulk).
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8801';
const {boot} = require('./lib.js');
(async () => {
  const {browser, page} = await boot();
  let fails = 0;
  const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${got}`); if (!ok) fails++; };
  const bulkCalls = [];
  page.on('request', (r) => { if (r.url().includes('/learned/bulk')) bulkCalls.push(r.postData()); });
  const seeded = await page.evaluate(async () => {
    for (const text of ['The batch size should stay at 32 for the next run.',
      'The learning rate should stay at 0.001 until the loss settles.',
      'The warm-up should last five hundred steps on the small model.']) {
      await apiJson('/entries', {method: 'POST', body: JSON.stringify({content: text})});
    }
    await apiJson('/learned/switches', {method: 'PUT', body: JSON.stringify({paused: false, night_shift: true})}).catch(() => null);
    await apiJson('/night/run', {method: 'POST', body: JSON.stringify({budget: 1000, force: true})}).catch(() => null);
    return (await apiJson('/learned')).total;
  });
  check('facts to work with', seeded >= 2, seeded);
  await page.evaluate(() => openSettingsModal('learned'));
  await page.waitForTimeout(1500);
  const state = () => page.evaluate(() => {
    const bar = document.getElementById('learned-selectbar');
    const r = bar.getBoundingClientRect();
    return {rows: document.querySelectorAll('#learned-list .learned-row').length,
      boxes: document.querySelectorAll('#learned-list .learned-select').length,
      bar: !bar.classList.contains('hidden') && r.height > 0, barH: Math.round(r.height),
      count: document.getElementById('learned-selected-count').textContent,
      reset: !document.getElementById('learned-bulk-reset').classList.contains('hidden'),
      position: getComputedStyle(bar).position};
  });
  let s = await state();
  check('a box on every row, no bar yet', s.boxes === s.rows && s.rows >= 2 && !s.bar, JSON.stringify(s));
  const boxes = await page.$$('#learned-list .learned-select');
  await boxes[0].click();
  await boxes[1].click();
  await page.waitForTimeout(300);
  s = await state();
  check('bar shows the count', s.bar && s.count === '2 selected', JSON.stringify(s));
  check('bar is the sticky recipe', s.position === 'sticky', s.position);
  check('no Reset over rows nobody edited', !s.reset, s.reset);
  const before = s.rows;
  await page.click('#learned-bulk-delete');
  await page.waitForSelector('.confirm-overlay .confirm-actions button', {timeout: 5000});
  const buttons = await page.$$('.confirm-overlay .confirm-actions button');
  for (const b of buttons) { if ((await b.innerText()).trim() === 'Delete') { await b.click(); break; } }
  await page.waitForTimeout(1500);
  s = await state();
  check('two rows gone, bar gone', s.rows === before - 2 && !s.bar, JSON.stringify(s));
  check('one request for both', bulkCalls.length === 1 && JSON.parse(bulkCalls[0]).ids.length === 2, JSON.stringify(bulkCalls));
  console.log(`findings: ${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
