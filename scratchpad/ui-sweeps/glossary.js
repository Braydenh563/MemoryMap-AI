// The person's own abbreviations (CHAT_PLAN B7): adds three notes, asks the
// Ask box "what does CC stand for?" and "when is CC due?" with no model, and
// reads the answers and the records each cites. The notes are deleted after.
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/glossary.js
const { boot } = require('./lib.js');

const NOTES = [
  'Intro to Cloud Computing: the assignment is due 20 October.',
  'CC lab: set up the virtual machine.',
  'Human Computer Interaction (HCI) lecture 2: affordances.',
];

(async () => {
  const { browser, page } = await boot();
  const ids = await page.evaluate(async (notes) => {
    const out = [];
    for (const content of notes) out.push((await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content }) })).id);
    return out;
  }, NOTES);
  await page.waitForTimeout(1500);
  const out = [];
  for (const [q, shot] of [['what does CC stand for?', 'glossary-cc'], ['when is CC due?', 'glossary-due'], ['what is HCI?', 'glossary-hci']]) {
    await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
    await page.waitForTimeout(500);
    await page.fill('#question', q);
    await page.evaluate(() => askQuestion());
    await page.waitForFunction(() => (document.querySelector('#ai-answer')?.innerText || '').trim().length > 10, null, { timeout: 15000 });
    await page.waitForTimeout(1200);
    out.push(await page.evaluate((q) => ({
      q,
      answer: document.querySelector('#ai-answer').innerText.slice(0, 300),
      marks: document.querySelectorAll('#ai-answer .answer-citation').length,
    }), q));
    await page.locator('#ai-answer').screenshot({ path: `${process.env.SCRATCH}/shots/${shot}.png` });
  }
  await page.evaluate(async (ids) => { for (const id of ids) await api(`/entries/${id}`, { method: 'DELETE' }); }, ids);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
