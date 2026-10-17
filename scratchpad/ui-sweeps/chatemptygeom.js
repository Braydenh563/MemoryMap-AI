// The settled new-chat card's geometry (the starters' box, label and chips), so
// the skeleton that stands in for them can reserve exactly that room.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ serviceWorkers: 'block', viewport: { width: Number(process.env.W || 1440), height: 900 } });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => newChatConversation());
  await page.waitForTimeout(2500);
  console.log(JSON.stringify(await page.evaluate(() => {
    const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { top: +b.top.toFixed(1), left: +b.left.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), mt: cs.marginTop, radius: cs.borderRadius }; };
    const card = document.querySelector('.chat-empty');
    const suggest = document.getElementById('chat-suggest');
    return {
      card: r(card), link: r(card.querySelector('.help-atlas')), suggest: r(suggest),
      label: r(suggest.querySelector('.muted')), chips: [...suggest.querySelectorAll('.chip')].map(r),
    };
  }), null, 1));
  await browser.close();
})();
