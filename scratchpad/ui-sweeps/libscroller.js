const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab('library')); await page.waitForTimeout(1500);
  await page.mouse.move(700, 500); await page.mouse.wheel(0, 1200); await page.waitForTimeout(600);
  const out = await page.evaluate(() => {
    const moved = [...document.querySelectorAll('*')].filter((e) => e.scrollTop > 0).map((e) => (e.id || e.className.toString().slice(0, 30)) + ':' + e.scrollTop);
    const s = document.getElementById('library-subtabs');
    return { moved, docTop: document.scrollingElement.scrollTop, scrolled: s.dataset.scrolled, bg: getComputedStyle(s).backgroundColor };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
