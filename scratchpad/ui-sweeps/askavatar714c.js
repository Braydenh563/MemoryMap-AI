// INBOX 714: the Chat bubble's head row with and without the avatar. Builds a
// real bubble through addAssistantBubble and puts a text line in it.
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width, height: 900 }, scale: 2 });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1500);
  const res = await page.evaluate(async () => {
    const parts = addAssistantBubble(null);
    const bubble = document.querySelector('#chat-messages .msg.assistant:last-child');
    const body = document.createElement('div');
    body.className = 'bubble-answer';
    body.textContent = 'Ship the mobile app to the public on the 14th of next month.';
    bubble.appendChild(body);
    await new Promise((r) => setTimeout(r, 400));
    const m = () => {
      const label = bubble.querySelector('.msg-role');
      const name = label.querySelector('span:not(.msg-avatar)');
      const av = label.querySelector('.msg-avatar');
      const range = document.createRange();
      range.selectNodeContents(body);
      const line = range.getClientRects()[0];
      const n = name.getBoundingClientRect();
      return { gap: +(line.top - n.bottom).toFixed(1), labelH: label.getBoundingClientRect().height, avH: av.getBoundingClientRect().height, avBottom: av.getBoundingClientRect().bottom, nameBottom: n.bottom, lineTop: line.top, avOverflow: getComputedStyle(av).overflow };
    };
    const on = m();
    bubble.querySelector('.msg-avatar').style.setProperty('display', 'none', 'important');
    const off = m();
    bubble.querySelector('.msg-avatar').style.removeProperty('display');
    return { on, off };
  });
  console.log(JSON.stringify(res));
  const b = await (await page.$('#chat-messages .msg.assistant:last-child')).boundingBox();
  await page.screenshot({ path: `${process.env.SCRATCH}/chat714-${width}.png`, clip: { x: b.x - 8, y: b.y - 8, width: Math.min(b.width + 16, 500), height: b.height + 16 } });
  await browser.close();
})();
