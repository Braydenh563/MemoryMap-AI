// WORLD_CLASS_PLAN D6's key: Ctrl+D opens today's page or starts it, and
// steps aside where an editor already owns the chord (INBOX 321).
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8801';
const {boot} = require('./lib.js');
(async () => {
  const {browser, page} = await boot();
  let fails = 0;
  const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${got}`); if (!ok) fails++; };
  const today = await page.evaluate(() => timelineBucketKey(new Date(), 'day'));
  // Start clean: no page for today yet.
  await page.evaluate(async (key) => {
    const rows = (await apiJson('/timeline?scale=day&days=1&kind=note,document')).rows || [];
    for (const row of rows.map(timelineRow)) {
      if (row.title.trim() !== key) continue;
      const [kind, id] = row.key.split(':');
      await api(kind === 'document' ? `/documents/${id}` : `/entries/${id}`, {method: 'DELETE'}).catch(() => {});
    }
  }, today);
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(800);
  await page.keyboard.press('Control+d');
  await page.waitForTimeout(800);
  let s = await page.evaluate(() => ({tab: localStorage.getItem('activeTab'),
    title: document.getElementById('entry-title')?.value, focus: document.activeElement?.id}));
  check('no page yet: the composer opens with the day', s.tab === 'notes' && s.title === today, JSON.stringify(s));
  const id = await page.evaluate(async (key) => {
    const note = await apiJson('/entries', {method: 'POST', body: JSON.stringify({content: `# ${key}\nWrote the plan.`})});
    document.getElementById('entry-title').value = '';
    switchTab('dashboard');
    return note.id;
  }, today);
  await page.waitForTimeout(800);
  await page.keyboard.press('Control+d');
  await page.waitForTimeout(1200);
  s = await page.evaluate(() => ({tab: localStorage.getItem('activeTab'), opened: typeof lastOpenedEntryId === 'undefined' ? null : lastOpenedEntryId,
    title: document.getElementById('entry-title')?.value,
    flashed: [...document.querySelectorAll('.entry-item.flash, .flash')].map((el) => el.dataset.id || el.id).slice(0, 3)}));
  check('a page exists: it is opened, not started again', s.tab === 'notes' && !s.title && s.opened === id, JSON.stringify(s));
  const listed = await page.evaluate(() => [...document.querySelectorAll('#tab-shortcuts li, .shortcut-list li')]
    .some((li) => /today's note/i.test(li.textContent)));
  await page.evaluate(() => openShortcuts && openShortcuts());
  await page.waitForTimeout(400);
  const sheet = await page.evaluate(() => [...document.querySelectorAll('li, tr')]
    .some((el) => el.offsetParent && /Open today's note/.test(el.textContent)));
  check('listed in the shortcuts sheet', sheet || listed, sheet);
  console.log(`note id ${id}; findings: ${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
