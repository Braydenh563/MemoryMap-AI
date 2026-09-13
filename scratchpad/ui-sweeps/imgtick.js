// INBOX 174, last line: the tick at rest, on hover, on focus, when checked,
// and while a selection is running. Opacity is the whole question.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 950 } });
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button')].find((e) => /image/i.test(e.textContent || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(2200);
  const at = async (label) => {
    const rows = await page.evaluate(() => {
      const ticks = [...document.querySelectorAll('.library-image-tile:has(> .library-image-frame) > .library-tile-tick')];
      return ticks.slice(0, 3).map((t) => ({
        o: +getComputedStyle(t).opacity,
        checked: t.checked,
        w: +t.getBoundingClientRect().width.toFixed(1),
      }));
    });
    console.log(label, JSON.stringify(rows));
    return rows;
  };
  let fail = 0;
  const rest = await at('rest      ');
  if (rest.some((r) => r.o > 0.01)) fail++;
  await page.hover('.library-image-tile:has(> .library-image-frame)');
  await page.waitForTimeout(300);
  const hover = await at('hover     ');
  if (!(hover[0].o > 0.99)) fail++;
  // Keyboard: focus the first tick itself, which is inside the tile.
  await page.evaluate(() => document.querySelector('.library-image-tile:has(> .library-image-frame) > .library-tile-tick').focus());
  await page.mouse.move(1400, 900);
  await page.waitForTimeout(300);
  const focus = await at('focus     ');
  if (!(focus[0].o > 0.99)) fail++;
  // Checked, and the select bar out of hidden: every tick in the grid stays.
  await page.evaluate(() => document.querySelector('.library-image-tile:has(> .library-image-frame) > .library-tile-tick').click());
  await page.mouse.move(1400, 900);
  await page.waitForTimeout(400);
  const selecting = await at('selecting ');
  if (selecting.some((r) => r.o < 0.99)) fail++;
  console.log(fail ? `FAIL ${fail}` : 'ok, 4 states');
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
