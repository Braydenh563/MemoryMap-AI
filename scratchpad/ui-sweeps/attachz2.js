const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 700 } });
  await page.evaluate(() => switchTab('chat')); await page.waitForTimeout(1200);
  const out = await page.evaluate(() => {
    const d = (sel) => { const e = document.querySelector(sel); const out = []; let x = e; while (x && x !== document.body) { const s = getComputedStyle(x); out.push(`${x.id || x.className.toString().split(' ')[0]}|${s.position}|z${s.zIndex}${s.isolation === 'isolate' ? '|iso' : ''}${s.backdropFilter !== 'none' ? '|bf' : ''}${s.transform !== 'none' ? '|tf' : ''}${s.contain !== 'none' ? '|c:' + s.contain : ''}`); x = x.parentElement; } return out.slice(0, 6); };
    return { toolbar: d('.chat-toolbar'), dock: d('#note-picker-panel') };
  });
  console.log(JSON.stringify(out, null, 0));
  await browser.close();
})();
