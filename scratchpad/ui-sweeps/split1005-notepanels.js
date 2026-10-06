// The note card's reminders panel after the panels moved to note-panels.js
// (2026-10-05); notepanels.js covers the other three. A reminder is made for
// the first note, its chip pressed, the list drawn, the chip pressed again.
//   BASE=http://127.0.0.1:8824 node scratchpad/ui-sweeps/split1005-notepanels.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.evaluate(() => { switchTab('notes'); showNotesSection('browse'); });
  await page.waitForSelector('#entry-list li[data-id]', { timeout: 20000 });
  const out = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const card = document.querySelector('#entry-list li[data-id]');
    const id = Number(card.dataset.id);
    const entry = allEntries.find((e) => e.id === id) || { id };
    const before = typeof toggleNotePanel;
    await apiJson('/reminders', { method: 'POST', body: JSON.stringify({ text: 'Split probe reminder', entry_id: id, due_at: new Date(Date.now() + 86400000).toISOString() }) }).catch((e) => String(e));
    await toggleNoteReminders(entry);
    await wait(1200);
    const rows = () => [...document.querySelectorAll(`#entry-list li[data-id="${id}"] .entry-links`)].map((r) => r.textContent.trim().slice(0, 80));
    const opened = rows();
    await toggleNoteReminders(entry);
    await wait(800);
    return { before, after: typeof toggleNotePanel, opened, closed: rows() };
  });
  console.log(JSON.stringify(out), 'errors:', JSON.stringify(errors));
  await browser.close();
})();
