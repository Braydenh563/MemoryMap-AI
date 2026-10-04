// The Thinking fold (INBOX 489): one panel when open, Markdown inside, the
// prompt's data fences gone. Light and dark, 4x for a look.
const { boot } = require('./lib.js');
(async () => {
  for (const theme of ['dark', 'light']) {
    process.env.THEME = theme;
    const { browser, page } = await boot({ deviceScaleFactor: 2 });
    await page.evaluate(() => switchTab('chat'));
    await page.waitForTimeout(1000);
    const r = await page.evaluate(async () => {
      const host = document.getElementById('chat-messages');
      const fold = thinkingFold(true);
      host.appendChild(fold);
      thinkingPaint(fold, 'Thinking process:\n\n1. **Identify the goal:** the user wants their saved *ideas*.\n2. **Locate notes:**\n   * Note 1: <<<data note>>> Some ideas for features <<<end data>>>\n');
      await new Promise((ok) => setTimeout(ok, 400));
      const body = fold.querySelector('.thinking');
      const cs = getComputedStyle(fold);
      return { html: body.innerHTML.slice(0, 160), strong: !!body.querySelector('strong'), fence: body.textContent.includes('<<<'),
        border: cs.borderTopWidth + ' ' + cs.borderTopStyle, bg: cs.backgroundColor, radius: cs.borderTopLeftRadius };
    });
    console.log(theme, JSON.stringify(r));
    await page.locator('#chat-messages .thinking-fold').last().screenshot({ path: `/tmp/claude-0/think-${theme}.png` });
    await browser.close();
  }
})();
