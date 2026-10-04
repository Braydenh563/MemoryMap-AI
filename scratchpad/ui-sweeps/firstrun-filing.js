// INBOX 472: with no AI, how long does a fresh note say "Filing…", in the
// card and in the status bar? Samples once a second for 40s after a save.
//   BASE=http://127.0.0.1:8865 node firstrun-filing.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({});
  await page.evaluate(() => { switchTab('notes'); showNotesSection('capture'); });
  await page.waitForTimeout(1200);
  const ed = await page.evaluate(() => { const el = [...document.querySelectorAll('#tab-notes textarea')].find((e) => e.getBoundingClientRect().height > 40); const r = el.getBoundingClientRect(); return [r.left + 40, r.top + 20]; });
  await page.mouse.click(ed[0], ed[1]);
  await page.keyboard.type(`Filing probe ${Date.now()}`);
  const t0 = Date.now();
  await page.keyboard.press('Control+Enter');
  await page.evaluate(() => showNotesSection('list'));
  let last = '';
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1000);
    const s = await page.evaluate(() => {
      const card = document.querySelector('#entry-list .entry-meta');
      const chip = card && card.querySelector('.filing, [class*="filing"]');
      const task = document.getElementById('status-task');
      return `card:${chip ? chip.innerText.trim() : '-'} | bar:${task && !task.classList.contains('hidden') ? task.innerText.replace(/\s+/g, ' ') : '-'} | save-status:${(document.getElementById('save-status') || {}).innerText || ''}`;
    });
    if (s !== last) { console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', s); last = s; }
  }
  await browser.close();
})();
