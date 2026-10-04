// A note card's text against its metadata (INBOX 505): the card's inset, the
// gaps, and each meta part's size, weight, ink and fill, at 1440, both themes.
const { boot } = require('./lib.js');
(async () => {
  for (const theme of ['dark', 'light']) {
    process.env.THEME = theme;
    const { browser, page } = await boot();
    await page.evaluate(() => switchTab('notes'));
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const li = [...document.querySelectorAll('#entry-list > li')].find((l) => l.querySelector('.entry-meta .chip.link, .note-links .chip.link')) || document.querySelector('#entry-list > li');
      if (!li) return null;
      const lb = li.getBoundingClientRect();
      const text = li.querySelector('.entry-content, .note-body, .entry-text, p');
      const tb = text.getBoundingClientRect(); const tcs = getComputedStyle(text);
      const meta = li.querySelector('.entry-meta'); const mb = meta.getBoundingClientRect();
      const part = (sel) => { const e = li.querySelector(sel); if (!e) return null; const c = getComputedStyle(e); return { fs: c.fontSize, fw: c.fontWeight, color: c.color, bg: c.backgroundColor, border: c.borderTopWidth + ' ' + c.borderTopColor, h: Math.round(e.getBoundingClientRect().height) }; };
      return { inset: Math.round(tb.left - lb.left), padR: getComputedStyle(li).paddingRight, text: { fs: tcs.fontSize, color: tcs.color }, gapTextMeta: Math.round(mb.top - tb.bottom),
        category: part('.entry-meta .chip.category, .entry-meta .category-chip, .entry-meta .chip.cat'), tag: part('.entry-meta .chip.hashtag, .entry-meta .tag'), when: part('.entry-meta .when'), link: part('.chip.link') };
    });
    console.log(theme, JSON.stringify(r));
    const li = page.locator('#entry-list > li').first();
    await li.screenshot({ path: `/tmp/claude-0/notecard-${theme}.png` });
    await browser.close();
  }
})();
