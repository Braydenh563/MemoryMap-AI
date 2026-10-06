const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab('chat')); await page.waitForTimeout(1200);
  await page.evaluate(() => { const box = document.getElementById('chat-messages'); for (let i = 0; i < 12; i++) { const m = document.createElement('div'); m.className = 'msg assistant'; const b = document.createElement('div'); b.className = 'msg-body'; b.textContent = 'x '.repeat(400); m.append(b); box.append(m); } box.scrollTop = 200; box.dispatchEvent(new Event('scroll')); });
  await page.waitForTimeout(400);
  const out = await page.evaluate(() => { const p = document.getElementById('chat-messages'); const s = getComputedStyle(p); return { mask: s.maskImage || s.webkitMaskImage, cls: p.className, sbw: s.scrollbarWidth, sbg: s.scrollbarGutter, padB: s.paddingBottom, clip: s.clipPath }; });
  console.log(JSON.stringify(out));
  await browser.close();
})();
