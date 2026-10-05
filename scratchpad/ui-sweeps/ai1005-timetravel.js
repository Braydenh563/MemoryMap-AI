// WORLD_CLASS_PLAN row 23 (I5): time travel on Ask and Then and now in a
// note's History. Needs a note (NOTE, default 25) whose text changed after
// AS_OF (default 2026-03-15) and the model pointed at
// scratchpad/fake_answer_server.py (which answers from the notes it is sent).
// Measures: the clock button and the "as of" line in the Ask box (on one row,
// inside the composer's width, no page scroll), the records and the answer
// coming from the text as it was, then the Then and now block under a
// History row: its kinds and sentences, inside the sheet.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const NOTE = Number(process.env.NOTE || 25);
  const AS_OF = process.env.AS_OF || '2026-03-15';
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.waitForTimeout(2500);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);
  await page.evaluate(() => [...document.querySelectorAll('#tab-notes button')].find((x) => x.textContent.trim() === 'Ask' && x.offsetParent)?.click());
  await page.waitForTimeout(800);
  await page.click('#ask-time-travel');
  await page.waitForTimeout(200);
  await page.fill('#ask-as-of', AS_OF);
  const line = await page.evaluate(() => {
    const row = document.getElementById('ask-as-of-row');
    const r = row.getBoundingClientRect();
    const composer = document.getElementById('question').closest('.ask-composer').getBoundingClientRect();
    const button = document.getElementById('ask-time-travel');
    //: Rows by vertical centre, so a taller control is not a second row.
    const kids = [...row.children].map((k) => { const b = k.getBoundingClientRect(); return Math.round((b.top + b.bottom) / 8); });
    return {
      shown: !row.classList.contains('hidden'),
      pressed: button.getAttribute('aria-pressed'),
      rows: new Set(kids).size,
      lineBox: [Math.round(r.left), Math.round(r.right)],
      composerBox: [Math.round(composer.left), Math.round(composer.right)],
      insideComposerWidth: r.right <= composer.right + 1,
      buttonH: Math.round(button.getBoundingClientRect().height),
      composerRows: new Set([...document.getElementById('question').closest('.ask-composer').children].filter((k) => k.offsetParent).map((k) => Math.round(k.getBoundingClientRect().top / 10))).size,
      pageScrollX: document.documentElement.scrollWidth > innerWidth,
    };
  });
  console.log(W, 'line', JSON.stringify(line));
  if (process.env.SHOT_LINE) await page.screenshot({ path: process.env.SHOT_LINE });
  await page.fill('#question', 'what batch size do I use?');
  await page.press('#question', 'Enter');
  await page.waitForFunction(() => !document.getElementById('question').disabled, null, { timeout: 60000 }).catch(() => null);
  await page.waitForTimeout(2500);
  const answered = await page.evaluate(() => {
    const records = [...document.querySelectorAll('#chat-results .entry-content, #chat-results .note-text, #chat-results .entry-item')].map((e) => e.textContent.trim()).join(' | ');
    const answer = document.querySelector('#ai-answer, .ai-answer')?.textContent || '';
    return { recordSays32: /stay at 32/.test(records), recordSays64: /64 after/.test(records), answerSays32: /32/.test(answer), answerSays64: /64/.test(answer) };
  });
  console.log(W, 'asked', JSON.stringify(answered));
  // Back to now closes the line and the next answer is today's.
  await page.click('#ask-as-of-clear');
  const cleared = await page.evaluate(() => ({ hidden: document.getElementById('ask-as-of-row').classList.contains('hidden'), value: document.getElementById('ask-as-of').value, asOf: askAsOf() }));
  console.log(W, 'cleared', JSON.stringify(cleared));
  // History, Then and now (the block, for a day before the edit).
  await page.evaluate(async (id) => {
    const entry = (await apiJson(`/entries/${id}`));
    await openEntryHistory(entry);
  }, NOTE);
  await page.waitForTimeout(1200);
  const button = await page.$('#history-list button:has-text("Then and now")');
  if (button) await button.click();
  await page.waitForTimeout(1200);
  const hist = await page.evaluate(() => {
    const block = document.querySelector('#history-list .then-now');
    if (!block) return { button: false };
    const sheet = block.closest('[role=dialog], .modal-card, .sheet-card') || document.getElementById('history-overlay');
    const b = block.getBoundingClientRect();
    const s = sheet.getBoundingClientRect();
    return {
      button: true,
      kinds: [...block.querySelectorAll('.chip')].map((c) => c.textContent),
      lines: [...block.querySelectorAll('p')].map((p) => p.textContent.slice(0, 40)),
      inside: b.left >= s.left && b.right <= s.right + 1,
      thenColor: getComputedStyle(block.querySelector('.then-now-then') || block).color,
    };
  });
  console.log(W, 'history', JSON.stringify(hist));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
