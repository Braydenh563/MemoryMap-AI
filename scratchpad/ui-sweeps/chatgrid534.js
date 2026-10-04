// INBOX 534: across window sizes, the chat pane's bottom edge, its scrollbar
// track and the composer all sit inside the window, and a wheel over the pane
// reaches scrollTop = max. One page, resized, with synthetic long messages.
//   BASE=http://127.0.0.1:8823 SCROLLBARS=1 node chatgrid534.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 720 } });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    newChatConversation();
    const box = document.getElementById('chat-messages');
    for (let i = 0; i < 14; i++) {
      const m = document.createElement('div'); m.className = 'msg ' + (i % 2 ? 'assistant' : 'user');
      const b = document.createElement('div'); b.className = 'msg-body'; b.textContent = ('Line of a long answer ' + i + '. ').repeat(i % 2 ? 30 : 2);
      m.append(b); if (i % 2) m.append(assistantMessageActions({ bubble: m, text: 'x', question: 'q' })); box.append(m);
    }
  });
  const sizes = [[1920, 1080], [1600, 900], [1440, 900], [1366, 768], [1280, 800], [1280, 720], [1280, 600], [1152, 648], [1024, 768], [1024, 600], [960, 540], [900, 700], [800, 600], [700, 700], [600, 800], [500, 800], [390, 844]];
  let bad = 0;
  for (const [w, h] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    const g = await page.evaluate(() => {
      const p = document.getElementById('chat-messages');
      p.scrollTop = 0;
      const r = p.getBoundingClientRect();
      const dock = document.querySelector('.chat-dock').getBoundingClientRect();
      const doc = document.scrollingElement;
      return { paneTop: Math.round(r.top), paneBottom: Math.round(r.bottom), paneH: Math.round(r.height), dockTop: Math.round(dock.top), dockBottom: Math.round(dock.bottom), vh: innerHeight, pageScroll: doc.scrollHeight - doc.clientHeight, paneOverflowY: getComputedStyle(p).overflowY };
    });
    // Wheel at the pane's visible centre (clamped into the window).
    const cy = Math.min(Math.max((g.paneTop + Math.min(g.paneBottom, g.vh)) / 2, g.paneTop + 5), g.vh - 5);
    await page.mouse.move(w / 2 - 100, cy);
    for (let k = 0; k < 60; k++) { await page.mouse.wheel(0, 400); await page.waitForTimeout(15); }
    await page.waitForTimeout(300);
    const e = await page.evaluate(() => {
      const p = document.getElementById('chat-messages');
      const doc = document.scrollingElement;
      const kids = [...p.children];
      const last = kids[kids.length - 1].getBoundingClientRect();
      return { dist: Math.round(p.scrollHeight - p.scrollTop - p.clientHeight), pageTop: Math.round(doc.scrollTop), lastBottom: Math.round(last.bottom), dockTop: Math.round(document.querySelector('.chat-dock').getBoundingClientRect().top), vh: innerHeight };
    });
    const ok = e.dist <= 1 && g.paneBottom <= g.vh + 1 && g.dockBottom <= g.vh + 1 && e.lastBottom <= e.dockTop + 1;
    if (!ok) bad += 1;
    console.log(ok ? 'ok ' : 'BAD', `${w}x${h}`, JSON.stringify(g), JSON.stringify(e));
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
