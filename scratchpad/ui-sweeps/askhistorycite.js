// INBOX 241: a turn reopened from the Ask history panel carries its numbered
// in-text references, its "grounded in" chips and its source cards, not just
// the prose. Seeded through the API (a note) plus one row written straight
// into ask_turns by the caller, since no model runs in the sandbox.
//
//   BASE=http://127.0.0.1:8802 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node askhistorycite.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
  const bad = [];
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);

  const turn = await page.evaluate(async () => {
    const list = await apiJson('/ask-history?limit=1');
    return list.turns[0] || null;
  });
  if (!turn) {
    console.log('no seeded turn on this server: run scratchpad/seed_ask_turn.py against its data dir first');
    await browser.close();
    process.exit(2);
  }

  await page.evaluate((id) => viewAskHistoryTurn(id), turn.id);
  await page.waitForTimeout(1200);

  const r = await page.evaluate(() => {
    const answer = document.getElementById('ai-answer');
    const grounding = document.getElementById('ai-answer-grounding');
    const sources = document.getElementById('ask-answer-sources');
    const foot = document.getElementById('ask-answer-foot');
    const marks = [...answer.querySelectorAll('.answer-citation')];
    const cards = sources.querySelectorAll('.chat-source, .source-card, li, button');
    return {
      answered: answer.textContent.trim().length,
      marks: marks.length,
      markText: marks.slice(0, 4).map((m) => m.textContent.trim()),
      groundingHidden: grounding.classList.contains('hidden'),
      groundingChips: grounding.querySelectorAll('button, a').length,
      footHidden: foot.classList.contains('hidden'),
      sourcesHidden: sources.classList.contains('hidden'),
      sourceNodes: cards.length,
    };
  });
  console.log(JSON.stringify(r, null, 1));
  if (!r.answered) bad.push('the reopened turn has no answer text');
  if (!r.marks) bad.push('no in-text numbered references');
  //: One per grounded sentence, not two: `renderAnswerGrounding` already
  //: places them, and the live path's extra `addInlineCitations` would double
  //: them here (INBOX 241).
  if (r.marks > r.groundingChips) bad.push(`${r.marks} markers for ${r.groundingChips} cited note(s)`);
  if (r.groundingHidden || !r.groundingChips) bad.push('no grounded-in chips');
  if (r.footHidden || r.sourcesHidden || !r.sourceNodes) bad.push('no sources panel');

  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
