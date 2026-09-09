// INBOX 105 retest: the whiteboard's View menu must use the room it has, and
// no row may be cut in half.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const out = {};
  for (const width of [1440, 820]) {
    await page.setViewportSize({ width, height: 900 });
    await page.click('[data-tab="whiteboard"]').catch(() => {});
    await page.waitForTimeout(2500);
    const opened = await page.evaluate(() => {
      const toggle = [...document.querySelectorAll('[data-wb-menu-toggle]')]
        .find((b) => /view/i.test(b.textContent || ''));
      if (!toggle) return 'no View toggle';
      toggle.click();
      return 'clicked';
    });
    await page.waitForTimeout(600);
    out[width] = await page.evaluate((opened) => {
      const menu = [...document.querySelectorAll('.wb-board-menu')].find(
        (m) => !m.classList.contains('hidden') && m.getBoundingClientRect().height > 0,
      );
      if (!menu) return { opened, visible: false };
      const box = menu.getBoundingClientRect();
      const rows = [...menu.children];
      const cut = rows.filter((r) => {
        const rb = r.getBoundingClientRect();
        return rb.height > 0 && rb.top < box.bottom && rb.bottom > box.bottom + 0.5;
      }).length;
      return {
        opened,
        visible: true,
        menuH: Math.round(box.height),
        contentH: menu.scrollHeight,
        windowH: window.innerHeight,
        scrollsInside: menu.scrollHeight > menu.clientHeight + 1,
        rowsCutInHalf: cut,
        fitsOnScreen: box.top >= -0.5 && box.bottom <= window.innerHeight + 0.5,
        maxHeight: getComputedStyle(menu).maxHeight,
      };
    }, opened);
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
