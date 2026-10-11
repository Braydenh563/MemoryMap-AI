// "Summarise this" (CHAT_PLAN B10): adds three notes, opens one with
// flashEntry and asks the Ask box "Summarise this", then filters the
// sidebar to Travel and asks again, then clears both and asks once more.
// Reads each answer; the notes are deleted after.
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/opencontext.js
const { boot } = require('./lib.js');

const NOTES = [
  ['Trip planning: flights to Lisbon on 3 May, 240 pounds. Hotel near Alfama booked for four nights. Still need travel insurance.', 'Travel'],
  ['Packing list: adapter, sun cream, walking shoes.', 'Travel'],
  ['Gym: squats at 80 kg.', 'Health'],
];

(async () => {
  const { browser, page } = await boot();
  const ids = await page.evaluate(async (notes) => {
    const out = [];
    for (const [content, category] of notes) out.push((await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content, category }) })).id);
    return out;
  }, NOTES);
  await page.waitForTimeout(1500);
  const ask = async (shot, setup) => {
    await page.evaluate(setup, ids);
    await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('#ai-answer')?.replaceChildren());
    await page.fill('#question', 'Summarise this');
    await page.evaluate(() => askQuestion());
    await page.waitForFunction(() => (document.querySelector('#ai-answer')?.innerText || '').trim().length > 10, null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.locator('#ai-answer').screenshot({ path: `${process.env.SCRATCH}/shots/${shot}.png` });
    return page.evaluate(() => ({
      answer: document.querySelector('#ai-answer').innerText.slice(0, 400),
      marks: document.querySelectorAll('#ai-answer .answer-citation').length,
      items: document.querySelectorAll('#ai-answer li').length,
    }));
  };
  const out = {};
  out.note = await ask('open-note', (ids) => { lastOpenedEntryId = ids[0]; activeCategory = null; });
  out.category = await ask('open-category', () => { lastOpenedEntryId = null; activeCategory = 'Travel'; });
  out.nothing = await ask('open-nothing', () => { lastOpenedEntryId = null; activeCategory = null; });
  await page.evaluate(async (ids) => { for (const id of ids) await api(`/entries/${id}`, { method: 'DELETE' }); }, ids);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
