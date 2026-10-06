// INBOX 76 (CHAT_PLAN): the citation peek names the words a mark matched on,
// so a number on the wrong note reads as the wrong words. Answers one
// question through scratchpad/fake_answer_server.py (FAKE=port, default
// 8856) unless ASK=0, hovers (or taps, W < 600) the first mark, and measures
// the "Matched on" line: its words, one line, inside the card, its colour.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const touch = W < 600;
  const { browser, page } = await boot({ viewport: { width: W, height: touch ? 844 : 900 }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.waitForTimeout(2500);
  const fake = process.env.FAKE || '8856';
  await page.evaluate(async (port) => {
    await apiJson('/models/provider', { method: 'POST', body: JSON.stringify({ provider: 'openai', base_url: `http://127.0.0.1:${port}/v1` }) }).catch(() => null);
  }, fake);
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1500);
  if (process.env.ASK !== '0') {
    await page.evaluate(() => { if (typeof startNewChat === 'function') startNewChat(); });
    await page.fill('#chat-input', 'what do I need from the shops for the week?');
    await page.evaluate(() => { const b = document.querySelector('[data-chat-mode="ask"], #chat-mode-ask'); if (b) b.click(); });
    await page.click('#chat-send');
    await page.waitForFunction(() => document.querySelector('#chat-messages .answer-citation-link'), null, { timeout: 60000 }).catch(() => null);
    await page.waitForTimeout(1500);
  } else {
    await page.evaluate(async () => {
      const list = await apiJson('/conversations?limit=20');
      for (const conv of list.items || list) {
        await openConversation(conv.id);
        await new Promise((r) => setTimeout(r, 500));
        if (document.querySelector('#chat-messages .answer-citation-link')) return;
      }
    });
  }
  const marks = await page.$$('#chat-messages .answer-citation-link');
  if (!marks.length) {
    console.log('FAIL no citation mark drawn', errors);
    await browser.close();
    return;
  }
  await marks[0].scrollIntoViewIfNeeded();
  if (touch) await marks[0].tap(); else await marks[0].hover();
  await page.waitForTimeout(600);
  const out = await page.evaluate(() => {
    const p = document.getElementById('citation-peek');
    if (!p) return { open: false };
    const t = p.querySelector('.citation-peek-terms');
    if (!t) return { open: true, terms: null };
    const r = t.getBoundingClientRect();
    const pr = p.getBoundingClientRect();
    const cs = getComputedStyle(t);
    return {
      open: true,
      text: t.textContent,
      oneLine: r.height <= parseFloat(cs.lineHeight || '20') + 1 || r.height < 24,
      h: Math.round(r.height),
      inside: r.left >= pr.left && r.right <= pr.right + 0.5,
      ellipsis: cs.textOverflow,
      color: cs.color,
      fontSize: cs.fontSize,
      cardH: Math.round(pr.height),
    };
  });
  console.log(W, process.env.THEME || 'light', JSON.stringify(out));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
