// INBOX 548's second half: the script-built dialogs that opened on a bare
// `h3` or the confirm alert's `confirm-head` now open on `dialogHead`
// (selection.js). At 1440 and 390 (THEME=dark for dark), for each of How are
// these connected, Manage this connection, Manage groups, Review the map,
// Export this board and a map's facts: a 16px `.dialog-head-title`, the X
// last and named Close, the card inside the window, and the X closes it.
//
//   BASE=http://127.0.0.1:8810 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/dialogheads.js
const { boot } = require('./lib.js');

const OPEN = {
  'How are these connected?': () => askLinkDetails({ preview: 'One note' }, { preview: 'Another note' }),
  'Manage this connection': () => openGraphLinkPanel({ source: 1, target: 2, reason: 'Both about rent' }, [{ id: 1, title: 'One' }, { id: 2, title: 'Two' }]),
  'Manage groups': () => manageBookmarkGroups(),
  'Review the map before it is made': () => wbReviewMapProposal({ name: 'A map', outline: 'Root\n  Child', notes: 2, reason: 'model' }),
  'What this map is made of': () => wbInfoDialog('What this map is made of', Object.assign(document.createElement('p'), { textContent: 'Three topics.' })),
};

(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : JSON.stringify(detail));
  };
  const theme = process.env.THEME || 'light';
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const w = viewport.width;
    const { browser, page, OUT } = await boot({ viewport });
    await page.evaluate(() => Promise.race([Promise.all([ensureModule('graph'), ensureModule('library')]), new Promise((r) => setTimeout(r, 8000))]));
    await page.waitForTimeout(800);
    for (const [title, open] of Object.entries(OPEN)) {
      await page.evaluate(`void (${open})()`).catch((e) => console.log('open failed', title, e.message));
      await page.waitForTimeout(400);
      const m = await page.evaluate((t) => {
        const head = [...document.querySelectorAll('.modal-overlay .dialog-head')].find((h) => h.querySelector('.dialog-head-title')?.textContent === t);
        if (!head) return null;
        const card = head.closest('.modal-card');
        const r = card.getBoundingClientRect();
        const btns = [...head.querySelector('.dialog-head-actions').children];
        return {
          first: card.firstElementChild === head,
          size: getComputedStyle(head.querySelector('.dialog-head-title')).fontSize,
          x: btns[btns.length - 1]?.getAttribute('aria-label'),
          inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight + 1,
        };
      }, title);
      check(`${w} ${theme} ${title}: the head first, 16px, the X last, inside`, m && m.first && m.size === '16px' && m.x === 'Close' && m.inside, m);
      await page.screenshot({ path: `${OUT}/dialoghead-${title.split(' ')[1]}-${w}-${theme}.png` });
      await page.locator('.modal-overlay .dialog-head', { hasText: title }).locator('button[aria-label="Close"]').click({ timeout: 3000 }).catch((e) => console.log('click', e.message.split('\n')[0]));
      await page.waitForTimeout(300);
      const gone = await page.evaluate((t) => ![...document.querySelectorAll('.dialog-head-title')].some((e) => e.textContent === t), title);
      check(`${w} ${theme} ${title}: the X closes it`, gone, null);
    }
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
