// UX-10 (audit 2026-10-05): the notes list is one card's controls in the Tab
// order, not every card's.   BASE=... W=390 node ux1005-tabstops.js
const { boot } = require('./lib');

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...(W < 600 ? { isMobile: true, hasTouch: true } : {}) });
  await page.evaluate(async () => {
    const have = await apiJson('/entries?limit=50');
    const n = (have.items || have).length || 0;
    for (let i = n; i < 12; i++) {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Tab stop note ${i} #reading #later`, category: 'Reading' }) });
    }
  });
  await page.evaluate(async () => { await switchTab('notes'); showNotesSection('browse'); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  await page.evaluate(async () => { await switchTab('notes'); showNotesSection('browse'); });
  await page.waitForTimeout(1500);
  const count = () => page.evaluate(() => {
    const list = document.getElementById('entry-list');
    const all = [...list.querySelectorAll('button, a[href], input, select, textarea, summary, [tabindex]')]
      .filter((el) => el.tabIndex >= 0 && !el.disabled && el.offsetParent !== null);
    return { cards: list.querySelectorAll(':scope > li[data-id]').length, stops: all.length };
  });
  const before = await count();
  // Tab walk: from the first card, Tab until focus leaves the list.
  await page.focus('#entry-list > li[data-id]');
  let walked = 0;
  for (; walked < 60; walked++) {
    await page.keyboard.press('Tab');
    const inList = await page.evaluate(() => !!document.activeElement.closest('#entry-list'));
    if (!inList) break;
  }
  // ArrowDown moves the stop, and the second card's controls become the ones Tab walks.
  await page.focus('#entry-list > li[data-id]');
  await page.keyboard.press('ArrowDown');
  const after = await count();
  const second = await page.evaluate(() => {
    const items = [...document.querySelectorAll('#entry-list > li[data-id]')];
    return { stopIsSecond: items[1] && items[1].tabIndex === 0 && document.activeElement === items[1],
      secondControls: items[1] ? [...items[1].querySelectorAll('button')].filter((b) => b.tabIndex >= 0).length : 0,
      firstControls: [...items[0].querySelectorAll('button')].filter((b) => b.tabIndex >= 0).length };
  });
  console.log(JSON.stringify({ W, before, walkedToLeave: walked + 1, after, second }));
  const ok = before.stops < before.cards + 16 && walked < 20 && second.stopIsSecond && second.secondControls > 0 && second.firstControls === 0;
  console.log(ok ? 'ok' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
