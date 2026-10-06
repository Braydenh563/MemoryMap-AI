// CHAT_PLAN, the owner's 2026-09-09 evening batch: the chat dock's control
// strip at full width ("a long gap" between Skills, Web and Plan on the left
// and the mode pair and gear pinned right) and the Skills button beside the
// buttons around it. Measures the strip's groups at W (default 2000): their
// boxes, the widest gap between neighbours, and the button heights.
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.W || 2000);
  const { page, browser } = await boot({ viewport: { width, height: 900 } });
  await page.waitForTimeout(2500);
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(2000);
  const out = await page.evaluate(() => {
    const strip = document.querySelector('#chat-skills')?.parentElement;
    if (!strip) return { error: 'no strip' };
    const kids = [...strip.children].filter((el) => {
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.position !== 'fixed' && cs.position !== 'absolute' && el.getBoundingClientRect().width > 0;
    });
    const boxes = kids.map((el) => {
      const b = el.getBoundingClientRect();
      return { cls: (el.id || el.className || el.tagName).toString().slice(0, 40), x: Math.round(b.left), r: Math.round(b.right), top: Math.round(b.top), h: Math.round(b.height) };
    });
    const gaps = boxes.slice(1).map((b, i) => b.x - boxes[i].r);
    const sb = strip.getBoundingClientRect();
    const buttons = [...strip.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().width > 0);
    return {
      strip: [Math.round(sb.left), Math.round(sb.width)],
      boxes,
      gaps,
      widestGap: Math.max(0, ...gaps),
      rows: new Set(boxes.map((b) => b.top)).size,
      buttonHeights: [...new Set(buttons.map((b) => Math.round(b.getBoundingClientRect().height)))],
      chatMain: Math.round(document.getElementById('chat-main').getBoundingClientRect().width),
    };
  });
  console.log(width, JSON.stringify(out));
  await browser.close();
})();
