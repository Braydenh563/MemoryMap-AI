// INBOX 110/111: the suggested-links panel's spacing and padding, as numbers.
const { boot, OUT } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 950 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(1200);
  const opened = await page.evaluate(async () => {
    const btn = document.getElementById('link-suggest-btn');
    if (!btn) return 'no button';
    btn.click();
    return 'pressed';
  });
  await page.waitForTimeout(3000);
  const out = await page.evaluate(() => {
    const box = document.getElementById('link-suggestions');
    if (!box) return { box: null };
    const rows = [...box.querySelectorAll('.link-suggestion')];
    const h = (el) => (el ? +el.getBoundingClientRect().height.toFixed(1) : null);
    const first = rows[0];
    return {
      text: (box.textContent || '').slice(0, 90),
      rows: rows.length,
      rowHeights: rows.slice(0, 6).map(h),
      panel: h(box),
      controls: first ? [...first.querySelectorAll('button, input, select, .chip')].map((el) => ({
        what: el.tagName.toLowerCase() + '.' + (typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : ''),
        h: h(el),
      })) : [],
      pads: first ? (() => { const cs = getComputedStyle(first); return { padding: cs.padding, gap: cs.gap, radius: cs.borderRadius }; })() : null,
      headGap: (() => { const head = box.querySelector('.link-suggest-head'); return head ? getComputedStyle(head).gap : null; })(),
      scroller: (() => {
        const w = box.querySelector('.link-suggest-rows');
        if (!w) return null;
        return { max: getComputedStyle(w).maxHeight, scrollH: w.scrollHeight, clientH: w.clientHeight };
      })(),
    };
  });
  console.log(opened, JSON.stringify(out, null, 1));
  await page.screenshot({ path: `${OUT}/linksuggest-${process.env.THEME || 'light'}.png` });
  console.log(`${OUT}/linksuggest-${process.env.THEME || 'light'}.png`);
  await browser.close();
})();
