// CHAT_PLAN, INBOX 63's Ask decisions, read against an answered question
// (scratchpad/fake_answer_server.py as the model): the answer and the
// matching records as two columns (their tops, heights, own scroll), the
// answer box's frame, the follow-up chips' row, and the sources foot.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.waitForTimeout(2500);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);
  await page.evaluate(() => [...document.querySelectorAll('#tab-notes button')].find((x) => x.textContent.trim() === 'Ask' && x.offsetParent)?.click());
  await page.waitForTimeout(800);
  //: BEFORE=1 takes the fix's marker off, to measure what it changed.
  if (process.env.BEFORE) await page.evaluate(() => { delete document.getElementById('question').dataset.query; });
  await page.fill('#question', 'what do I need from the shops for the week?');
  await page.press('#question', 'Enter');
  await page.waitForFunction(() => !document.getElementById('question').disabled, null, { timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el || !el.offsetParent) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), overflowY: cs.overflowY, border: cs.borderTopWidth, bg: cs.backgroundColor, scrolls: el.scrollHeight > el.clientHeight + 1 };
    };
    const ids = [...document.querySelectorAll('#chat-results [id], #chat-results [class]')].filter((e) => e.offsetParent).slice(0, 40).map((e) => e.id || e.className.toString().split(' ')[0]);
    const popup = document.querySelector('.selection-popup');
    return {
      // The selection menu must not open on the question an answer selects.
      selectionMenuShown: !!popup && !popup.classList.contains('hidden') && popup.getBoundingClientRect().width > 0,
      questionSelected: (() => { const q = document.getElementById('question'); return q.selectionEnd - q.selectionStart; })(),
      results: box('#chat-results'), answer: box('#chat-answer, .ask-answer, #answer'), records: box('#raw-results, .ask-records, #chat-raw-results'), ids: [...new Set(ids)].slice(0, 30) };
  });
  console.log(W, JSON.stringify(out));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
