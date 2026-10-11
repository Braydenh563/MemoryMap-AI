// One clarifying chip on a tie (CHAT_PLAN B9): adds four "python" notes,
// two in Coding and two in Pets, asks the Ask box "what have I saved about
// python?" with no model, reads the answer and the Ask next chips, presses
// the one chip and reads that answer. The notes are deleted after.
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/tiechip.js
const { boot } = require('./lib.js');

const NOTES = [
  ['Python: list comprehensions are neat.', 'Coding'],
  ['Python decorators wrap a function.', 'Coding'],
  ['Fed the python two mice on Sunday.', 'Pets'],
  ['The python shed its skin.', 'Pets'],
];

(async () => {
  const { browser, page } = await boot();
  const ids = await page.evaluate(async (notes) => {
    const out = [];
    for (const [content, category] of notes) out.push((await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, category }) })).id);
    return out;
  }, NOTES);
  await page.waitForTimeout(1500);
  const read = async (shot) => {
    await page.waitForFunction(() => (document.querySelector('#ai-answer')?.innerText || '').trim().length > 10, null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const got = await page.evaluate(() => ({
      answer: document.querySelector('#ai-answer').innerText.slice(0, 400),
      chips: [...document.querySelectorAll('#ask-followups .chip')].map((b) => b.innerText.trim()),
    }));
    await page.locator('#ai-answer').screenshot({ path: `${process.env.SCRATCH}/shots/${shot}.png` });
    return got;
  };
  await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
  await page.waitForTimeout(500);
  await page.fill('#question', 'what have I saved about python?');
  await page.evaluate(() => askQuestion());
  const first = await read('tie-chip');
  const chip = page.locator('#ask-followups .chip').first();
  let second = null;
  if (await chip.count()) {
    await page.evaluate(() => { document.querySelector('#ai-answer').replaceChildren(); });
    await chip.click();
    second = await read('tie-chip-pressed');
  }
  await page.evaluate(async (ids) => { for (const id of ids) await api(`/entries/${id}`, { method: 'DELETE' }); }, ids);
  console.log(JSON.stringify({ first, second }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
