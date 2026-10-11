// Each chat message shows when it was written (INBOX 868, Brief 103). Seeds a
// chat whose messages span today, yesterday, this week, this year and an older
// year (plus one saved before stamps existed), opens it, and measures: the
// label of each message, that the time sits in the meta row, that nothing
// overflows the bubble or the page, and a screenshot.
//
//   BASE=... W=390 THEME=dark node chattime.js
const { boot, OUT } = require('./lib.js');

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByRole('button', { name: 'Skip for now' }).click({ timeout: 2000 }).catch(() => {});
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1500);
  const id = await page.evaluate(async () => {
    const ago = (days, hh, mm) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(hh, mm, 0, 0); return d.toISOString(); };
    const stats = { model: 'llama3.2', prompt_tokens: 1200, output_tokens: 80, context_tokens: 8192, round: 1 };
    const pair = (n, at, withStats) => [
      { role: 'user', content: `Question ${n}: what did I write about trips?`, at },
      { role: 'assistant', content: `Answer ${n}. Some **markdown**.`, thinking: null, at, ...(withStats ? { stats, elapsed_ms: 3200 } : {}) },
    ];
    const old = [{ role: 'user', content: 'An old question with no stamp' }, { role: 'assistant', content: 'An old answer.' }];
    const messages = [
      ...old,
      ...pair(1, ago(400, 9, 30), true), ...pair(2, ago(20, 9, 30), true), ...pair(3, ago(3, 14, 5), true),
      ...pair(4, ago(1, 14, 5), false), ...pair(5, ago(0, 8, 5), true),
    ];
    const made = await apiJson('/conversations/restore', { method: 'POST', body: JSON.stringify({ id: 9000 + Math.floor(Math.random() * 90000), title: 'Times', messages: JSON.stringify(messages) }) });
    return made.id;
  });
  await page.evaluate(() => newChatConversation());
  await page.waitForTimeout(500);
  await page.evaluate((convId) => openConversation(convId), id);
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => {
    const pane = document.getElementById('chat-messages');
    const bubbles = [...pane.querySelectorAll('.msg.user, .msg.assistant')];
    const rows = bubbles.map((b) => {
      const t = b.querySelector('.msg-meta-when');
      const box = b.getBoundingClientRect();
      const tb = t ? t.getBoundingClientRect() : null;
      return { role: b.classList.contains('user') ? 'u' : 'a', text: t ? t.textContent : null, title: t ? t.title : null,
        inMeta: !!t && t.parentElement.classList.contains('msg-meta'), solo: !!t && t.parentElement.classList.contains('msg-meta-solo'),
        within: tb ? tb.left >= box.left - 1 && tb.right <= box.right + 1 : null,
        color: t ? getComputedStyle(t).color : null, size: t ? getComputedStyle(t).fontSize : null, h: Math.round(box.height) };
    });
    return { rows, pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      paneOverflow: pane.scrollWidth > pane.clientWidth };
  });
  console.log(JSON.stringify(r, null, 1));
  const tag = `${W}-${process.env.THEME || 'light'}`;
  await page.screenshot({ path: `${OUT}/chattime-${tag}.png` });
  // The live path: a question and an answer typed into the pane the way the
  // streaming code adds them.
  const live = await page.evaluate(async () => {
    const q = addBubble('user', 'A live question');
    const a = addAssistantBubble(null).bubble;
    await new Promise((res) => setTimeout(res, 300));
    const before = a.querySelector('.msg-meta-when') ? 'early' : 'none';
    a.appendChild(messageMetaLine({ model: 'llama3.2', elapsedMs: 1200, stats: null, toolCount: 0, rounds: 0, usedTools: null }));
    await new Promise((res) => setTimeout(res, 100));
    return { q: q.querySelector('.msg-meta-when')?.textContent, answerBefore: before, answerAfter: a.querySelector('.msg-meta > .msg-meta-when')?.textContent };
  });
  console.log('live', JSON.stringify(live));
  const list = await page.evaluate(() => [...document.querySelectorAll('#conversation-list .conv-meta')].map((e) => e.textContent));
  console.log('list', JSON.stringify(list), 'errors', JSON.stringify(errors));
  await browser.close();
})();
