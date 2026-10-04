// INBOX 534: the chat scrolls all the way to its last message.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 900) } });
  await page.evaluate(() => switchTab('chat')); await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const box = document.getElementById('chat-messages');
    for (let i = 0; i < 14; i++) {
      const m = document.createElement('div'); m.className = 'msg ' + (i % 2 ? 'assistant' : 'user');
      const b = document.createElement('div'); b.className = 'msg-body'; b.textContent = ('Line of a long answer ' + i + '. ').repeat(i % 2 ? 30 : 2);
      m.append(b); if (i % 2) m.append(assistantMessageActions({ bubble: m, text: 'x', question: 'q' })); box.append(m);
    }
  });
  await page.waitForTimeout(400);
  const box = await page.$('#chat-messages');
  const bb = await box.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 600); await page.waitForTimeout(30); }
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const box = document.getElementById('chat-messages');
    let sc = box; while (sc && !(sc.scrollHeight > sc.clientHeight + 2 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    sc = sc || document.scrollingElement;
    const last = box.lastElementChild.getBoundingClientRect();
    const dock = document.querySelector('.chat-dock').getBoundingClientRect();
    const view = sc.getBoundingClientRect();
    return { scroller: sc.id || sc.className.toString().slice(0, 30), top: Math.round(sc.scrollTop), max: sc.scrollHeight - sc.clientHeight, lastBottom: Math.round(last.bottom), dockTop: Math.round(dock.top), viewBottom: Math.round(view.bottom), hiddenUnderDock: Math.max(0, Math.round(last.bottom - dock.top)) };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
