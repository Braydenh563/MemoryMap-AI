// Brief 95: the background cards in Settings, Appearance. Counts the cards,
// reads each one's tier and cost, checks its preview was drawn (opaque
// pixels in the canvas), its box, and that pressing one turns the art on
// with that style. Console errors are counted.
//   BASE=http://127.0.0.1:8793 [THEME=dark] [WIDTH=390] node scratchpad/ui-sweeps/bgcards95.js
const {boot} = require('./lib.js');
(async () => {
  const W = Number(process.env.WIDTH || 1440);
  const {browser, page} = await boot({viewport: {width: W, height: W < 600 ? 844 : 900}});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.evaluate(() => openSettingsModal('appearance'));
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const d = document.getElementById('bg-art-style').closest('details');
    d.open = true;
  });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const grid = document.getElementById('bg-art-style');
    const cards = [...grid.children].map((c) => {
      const cv = c.querySelector('canvas');
      const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let opaque = 0; for (let i = 3; i < px.length; i += 4) if (px[i] > 8) opaque++;
      const b = c.getBoundingClientRect();
      return {style: c.dataset.bgStyle, chip: c.querySelector('.chip')?.textContent, note: c.querySelector('.theme-note').textContent,
        drawn: (opaque / (px.length / 4)).toFixed(2), w: Math.round(b.width), h: Math.round(b.height),
        overflow: c.scrollWidth > c.clientWidth + 1};
    });
    return {cards, gridW: Math.round(grid.getBoundingClientRect().width)};
  });
  console.log('grid width', r.gridW, 'cards', r.cards.length);
  for (const c of r.cards) console.log(c.style, c.chip, `drawn ${c.drawn}`, `${c.w}x${c.h}`, c.overflow ? 'OVERFLOW' : '', '|', c.note);
  await page.click('#bg-art-style [data-bg-style="rain"]');
  await page.waitForTimeout(800);
  const after = await page.evaluate(() => ({on: localStorage.getItem('bgArt'), style: localStorage.getItem('bg-style'),
    pressed: document.querySelector('#bg-art-style [aria-pressed="true"]')?.dataset.bgStyle,
    canvas: !!document.getElementById('bg-art-canvas') || !!document.getElementById('bg-art-still')}));
  console.log('after press', JSON.stringify(after));
  console.log('errors', errors.length, errors.slice(0, 5).join(' | '));
  await browser.close();
})();
