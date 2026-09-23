// CHAT_PLAN Phase 1's last line: a reopened chat keeps the low-support notice.
// Saves a turn whose answer the notes back one sentence in three, reopens the
// conversation the way the sidebar does, and measures the notice above it.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8801';
const {boot} = require('./lib.js');
(async () => {
  const {browser, page} = await boot();
  let fails = 0;
  const check = (name, ok, got) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${got}`); if (!ok) fails++; };
  const THIN = 'The sourdough starter needs feeding every day with flour and water. ' +
    'Bananas are grown in tropical countries a very long way from here. ' +
    'Most commercial yeast is produced in enormous industrial fermenters.';
  const id = await page.evaluate(async (answer) => {
    const note = await apiJson('/entries', {method: 'POST', body: JSON.stringify({
      content: 'The sourdough starter needs feeding every day with flour and water before you bake.'})});
    const conv = await apiJson('/conversations', {method: 'POST', body: JSON.stringify({
      question: 'how do I keep a starter', answer,
      raw_results: [note], search_mode: 'keyword',
      sentence_grounding: [{note_id: note.id, sentence: 'The sourdough starter needs feeding every day with flour and water.'}],
    })});
    return conv.id;
  }, THIN);
  await page.click('[data-tab="chat"]');
  await page.waitForTimeout(800);
  await page.evaluate((cid) => openConversation(cid), id);
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const notices = [...document.querySelectorAll('#chat-log .answer-support, .answer-support')]
      .filter((n) => n.getBoundingClientRect().height > 0);
    const n = notices[0];
    return {count: notices.length, text: n ? n.textContent.trim() : '',
      above: n ? n.nextElementSibling?.classList.contains('bubble-answer') : false,
      h: n ? Math.round(n.getBoundingClientRect().height * 10) / 10 : 0};
  });
  check('notice drawn on the reopened turn', r.count === 1, JSON.stringify(r));
  check('says one of three', /Only 1 of 3 sentences/.test(r.text), r.text);
  check('placed above the answer', r.above === true, r.above);
  console.log(`findings: ${fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
