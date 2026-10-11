// The digest's one offer pressed (CHAT_PLAN decision 70, B12): asks the Ask
// box a question per offer kind with no model, presses the offer line, and
// checks what it made (a note or a reminder), the line's new words, and that
// Undo in the toast takes it back. Run after gold.js has seeded the notes.
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/digestoffer.js
const { boot } = require('./lib.js');

const CASES = [
  { q: 'what did I think of Dune?', kind: 'note' },
  { q: 'how much did I spend on groceries?', kind: 'reminder' },
];

(async () => {
  const { browser, page } = await boot();
  const out = [];
  for (const c of CASES) {
    await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
    await page.waitForTimeout(600);
    await page.fill('#question', c.q);
    await page.evaluate(() => askQuestion());
    await page.waitForSelector('#ai-answer .digest-offer', { timeout: 15000 });
    const before = await page.evaluate(async () => ({
      notes: (await apiJson('/entries?limit=500')).length ?? null,
      reminders: (await apiJson('/reminders')).length ?? null,
      label: document.querySelector('#ai-answer .digest-offer').textContent,
      tier: getComputedStyle(document.querySelector('#ai-answer .digest-offer')).cursor,
    }));
    if (c.q.startsWith('how much')) await page.screenshot({ path: `${process.env.SCRATCH}/shots/digest-offer-before.png` });
    await page.click('#ai-answer .digest-offer');
    await page.waitForFunction(() => !document.querySelector('#ai-answer .digest-offer'), null, { timeout: 10000 });
    const after = await page.evaluate(async () => ({
      notes: (await apiJson('/entries?limit=500')).length ?? null,
      reminders: (await apiJson('/reminders')).length ?? null,
      line: [...document.querySelectorAll('#ai-answer p')].pop().textContent,
      toast: [...document.querySelectorAll('.toast')].map((t) => t.textContent).join(' | '),
    }));
    if (c.q.startsWith('how much')) await page.screenshot({ path: `${process.env.SCRATCH}/shots/digest-offer-after.png` });
    await page.locator('.toast button', { hasText: 'Undo' }).last().click();
    await page.waitForTimeout(1200);
    const undone = await page.evaluate(async () => ({
      notes: (await apiJson('/entries?limit=500')).length ?? null,
      reminders: (await apiJson('/reminders')).length ?? null,
      offerBack: !!document.querySelector('#ai-answer .digest-offer'),
    }));
    out.push({ ...c, before, after, undone });
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
