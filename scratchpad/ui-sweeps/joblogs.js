// Owner 2026-10-11: each Background jobs history row has its Logs button at one x (top-right), and
// Logs lands on that run's lines or on the empty state; no empty dark bar.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: +(process.env.W || 1440), height: 900 } });
  await page.evaluate(() => document.getElementById('recovery-key-dialog')?.close());
  await page.evaluate(async () => { for (let i = 0; i < 3; i++) { const zip = await (await api('/export/folder')).blob(); const fd = new FormData(); fd.append('files', zip, 'n.zip'); await api('/import/app?source=memorymap', { method: 'POST', body: fd }); } });
  await page.evaluate(() => document.getElementById('settings-btn').click());
  await page.waitForTimeout(800);
  await page.evaluate(() => { const sec = document.getElementById('task-history').closest('.settings-section').id.replace('settings-', ''); document.querySelector(`#settings-modal [data-section="${sec}"]`).click(); document.querySelectorAll('#settings-modal details').forEach((d) => d.open = true); });
  await page.waitForTimeout(3500);
  const rows = await page.evaluate(() => [...document.querySelectorAll('#task-history > li')].map((li) => {
    const b = [...li.querySelectorAll('button')].find((x) => /Logs/.test(x.textContent));
    const s = li.querySelector('strong').getBoundingClientRect(); const r = li.getBoundingClientRect(); const br = b?.getBoundingClientRect();
    return { right: br && Math.round(r.right - br.right), top: br && Math.round(br.top - r.top), titleMid: Math.round(s.top + s.height / 2 - r.top), btnMid: br && Math.round(br.top + br.height / 2 - r.top), x: br && Math.round(br.x) };
  }));
  console.log('rows', rows.length, JSON.stringify(rows.slice(0, 4)), 'distinct x', new Set(rows.map((r) => r.x)).size);
  await page.evaluate(() => [...document.querySelectorAll('#task-history button')].find((x) => /Logs/.test(x.textContent)).click());
  await page.waitForTimeout(2500);
  const st = await page.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); return !!e && e.offsetParent !== null; };
    const e = document.getElementById('logs-empty'); const r = e.getBoundingClientRect(); const i = e.querySelector('.empty-icon i')?.getBoundingClientRect();
    return { filter: document.getElementById('log-filter').value, rowsShown: document.querySelectorAll('#log-list > li').length, listVisible: vis('log-list'), termVisible: vis('log-terminal'), emptyVisible: vis('logs-empty'),
      title: e.querySelector('.empty-title')?.textContent, iconDx: i && +(i.x + i.width / 2 - (r.x + r.width / 2)).toFixed(1), clear: !!e.querySelector('button') && e.querySelector('button').offsetParent !== null };
  });
  console.log('after Logs', JSON.stringify(st));
  await page.evaluate(() => openTaskLog({ run_id: 'run-9999', label: 'Gone' }));
  await page.waitForTimeout(1200);
  const st2 = await page.evaluate(() => {
    const e = document.getElementById('logs-empty'); const r = e.getBoundingClientRect(); const i = e.querySelector('.empty-icon i').getBoundingClientRect();
    const vis = (id) => document.getElementById(id).offsetParent !== null;
    return { title: e.querySelector('.empty-title').textContent, iconDx: +(i.x + i.width / 2 - (r.x + r.width / 2)).toFixed(1), listBarVisible: vis('log-list'), termVisible: vis('log-terminal'), clearVisible: vis('logs-empty-clear') };
  });
  console.log('no lines', JSON.stringify(st2));
  await page.click('#logs-empty-clear'); await page.waitForTimeout(400);
  console.log('after clear: rows', await page.evaluate(() => document.querySelectorAll('#log-list > li').length), 'empty hidden', await page.evaluate(() => document.getElementById('logs-empty').classList.contains('hidden')));
  await browser.close();
})();
