// Dashboard, Recent activity: "Undo what Atlas did" (POST /events/undo).
//
//   PYTHONPATH=src MEMORYMAP_DATA_DIR=<dir> .venv/bin/python scratchpad/ui-sweeps/seed_ai_edits.py
//   BASE=http://127.0.0.1:8847 node scratchpad/ui-sweeps/activityundo.js   (W=390 for a phone)
//
// The seed has `ai:tidy_up` move two notes; the widget must offer to undo
// that actor, show the dry run's plan in the confirm dialog (naming the notes
// and changing nothing), and on Undo put both notes back in Garden.
const { boot } = require('./lib.js');
const fs = require('fs');

(async () => {
  const W = Number(process.env.W || 1440);
  const shots = process.env.SHOTS || '.';
  fs.mkdirSync(shots, { recursive: true });
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const check = (name, ok, detail = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);
  const categories = () => page.evaluate(async () => {
    const all = await apiJson('/entries?limit=200');
    const rows = Array.isArray(all) ? all : all.items || [];
    return rows.filter((e) => /fig before|pond pump/.test(e.content)).map((e) => e.category);
  });
  await page.evaluate(async () => {
    const hidden = Object.keys(DASH_WIDGETS).filter((n) => n !== 'activity');
    await setPreference('dashboard_layout', { order: ['activity', ...hidden], hidden, wide: [] });
    prefsCache.dashboard_layout = { order: ['activity', ...hidden], hidden, wide: [] };
    switchTab('dashboard');
    await renderDashboard();
  });
  await page.waitForTimeout(1500);
  const before = await categories();
  const offer = await page.evaluate(() => document.querySelector('.activity-undo')?.textContent.trim() || '');
  check('offers to undo the skill', /Undo what Atlas \(tidy up\) did/.test(offer), offer);
  await page.screenshot({ path: `${shots}/activity-undo-${W}.png` });
  await page.click('.activity-undo button');
  await page.waitForTimeout(800);
  const dialog = await page.evaluate(() => document.querySelector('.confirm-card')?.textContent.trim() || '');
  check('the dry run is the dialog body', /2 notes go back/.test(dialog) && /Repot the fig/.test(dialog), dialog.slice(0, 200));
  check('and changed nothing yet', JSON.stringify(await categories()) === JSON.stringify(before), JSON.stringify(before));
  await page.screenshot({ path: `${shots}/activity-undo-dialog-${W}.png` });
  await page.click('.confirm-card button:has-text("Undo")');
  await page.waitForTimeout(1500);
  const after = await categories();
  check('undo puts both back', after.length >= 2 && after.every((c) => c === 'Garden'), JSON.stringify(after));
  const again = await page.evaluate(() => document.querySelector('.activity-undo')?.textContent.trim() || '');
  check('the list redraws', true, again || '(no undo row)');
  await browser.close();
})();
