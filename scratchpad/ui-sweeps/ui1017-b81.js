// INBOX 904 B81: the Japanese emoticons group in the emoji picker: searchable,
// and no wide tile overflows. Measured at the width given.
//   BASE=http://127.0.0.1:8786 W=1440 node ui1017-b81.js
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(() => ensureModule('iconPicker').then(() => openIconPicker({ title: 'Emoji and icons' })));
  await page.waitForSelector('.icon-picker', { timeout: 10000 });
  const probe = () => page.evaluate(() => {
    const panel = document.querySelector('.icon-picker');
    const p = panel.getBoundingClientRect();
    const tiles = [...panel.querySelectorAll('.icon-picker-tile-wide')];
    const over = tiles.filter((t) => {
      const g = t.firstElementChild;
      return t.scrollWidth > t.clientWidth + 0.5 || g.scrollWidth > g.clientWidth + 0.5 || t.getBoundingClientRect().right > p.right + 0.5;
    }).map((t) => [t.dataset.name, t.scrollWidth, t.clientWidth]);
    const ws = tiles.map((t) => Math.round(t.getBoundingClientRect().width));
    return { panel: [Math.round(p.width), Math.round(p.right)], tiles: tiles.length, over, w: [Math.min(...ws), Math.max(...ws)], h: tiles.length ? Math.round(tiles[0].getBoundingClientRect().height) : 0, scrollX: panel.querySelector('.icon-picker-list').scrollWidth - panel.querySelector('.icon-picker-list').clientWidth };
  });
  const out = {};
  // The group, expanded (browsing shows 48 a group; this one has fewer).
  await page.evaluate(() => { const l = document.querySelector('.icon-picker-list'); l.scrollTop = l.scrollHeight; });
  await page.waitForTimeout(300);
  out.browse = await probe();
  for (const q of ['shrug', 'table flip', 'happy', 'cry', 'angry']) {
    await page.fill('.icon-picker .search-field-input', q);
    await page.waitForTimeout(250);
    out[q] = await page.evaluate(() => [...document.querySelectorAll('.icon-picker-tile-wide')].map((t) => t.dataset.name).slice(0, 4));
  }
  await page.fill('.icon-picker .search-field-input', 'shrug');
  await page.waitForTimeout(250);
  out.picked = await page.evaluate(() => new Promise((res) => {
    window.__picked = null;
    const t = document.querySelector('.icon-picker-tile-wide');
    t.click();
    res(t.textContent);
  }));
  out.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(JSON.stringify(out));
  await browser.close();
})();
