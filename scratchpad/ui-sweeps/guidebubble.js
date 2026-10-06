// The Guide's Atlas bubble holds its width while generating (INBOX 499).
const { boot } = require('./lib.js');
(async () => {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { browser, page } = await boot({ viewport: vp });
    await page.evaluate(() => openHelpChat());
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => {
      const list = document.getElementById('help-chat-messages');
      if (!list) return null;
      const b = document.createElement('div'); b.className = 'help-chat-msg is-assistant is-pending'; b.textContent = '...';
      list.appendChild(b);
      const w = b.getBoundingClientRect().width, col = list.getBoundingClientRect().width;
      b.remove();
      return { bubble: Math.round(w), column: Math.round(col), share: Math.round((w / col) * 100) };
    });
    console.log(vp.width, JSON.stringify(r));
    await browser.close();
  }
})();
