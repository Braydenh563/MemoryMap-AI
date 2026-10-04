// Find anything's head (INBOX 498): no line through the head's controls, and
// a gap between the head and the search field. Light and dark, 1440 and 390.
const { boot } = require('./lib.js');
(async () => {
  for (const [theme, vp] of [['dark', { width: 1440, height: 900 }], ['light', { width: 1440, height: 900 }], ['dark', { width: 390, height: 844 }]]) {
    process.env.THEME = theme;
    const { browser, page } = await boot({ viewport: vp });
    await page.keyboard.press('Control+p');
    await page.waitForTimeout(800);
    await page.keyboard.type(process.env.Q || 'note');
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const card = document.querySelector('#finder-overlay .finder-card');
      if (!card || card.offsetParent === null) return { open: false };
      const head = card.querySelector('.finder-head').getBoundingClientRect();
      const field = card.querySelector('input').closest('.search-field, .finder-search, label, div').getBoundingClientRect();
      const lines = [];
      for (const el of card.querySelectorAll('*')) {
        for (const pseudo of [null, '::before', '::after']) {
          const cs = getComputedStyle(el, pseudo);
          const b = el.getBoundingClientRect();
          if (cs.borderBottomWidth !== '0px' && cs.borderBottomStyle !== 'none' && !pseudo) {
            const y = b.bottom; if (y > head.top + 2 && y < head.bottom - 2) lines.push(['border-bottom', el.className, Math.round(y)]);
          }
          if (cs.borderTopWidth !== '0px' && cs.borderTopStyle !== 'none' && !pseudo) {
            const y = b.top; if (y > head.top + 2 && y < head.bottom - 2) lines.push(['border-top', el.className, Math.round(y)]);
          }
        }
      }
      const hs = getComputedStyle(card.querySelector('.finder-head'));
      return { shrink: hs.flexShrink, hb: hs.borderBottomWidth + ' ' + hs.borderBottomStyle, cardH: Math.round(card.getBoundingClientRect().height), head: [Math.round(head.top), Math.round(head.bottom)], fieldTop: Math.round(field.top), gap: Math.round(field.top - head.bottom), lines: lines.slice(0, 5) };
    });
    console.log(theme, vp.width, JSON.stringify(r));
    await page.locator('#finder-overlay .finder-card').screenshot({ path: `/tmp/claude-0/finder-${theme}-${vp.width}.png`, clip: undefined }).catch(() => {});
    await browser.close();
  }
})();
