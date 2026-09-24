// Where the rendered elements are, per tab: the element count under each
// big container, and how many of them are off screen (INBOX 400 (1)).
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  for (const t of (process.env.TABS || 'notes,library,timeline,dashboard,chat').split(',')) {
    await page.evaluate((x) => switchTab(x), t);
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const rendered = (el) => el.getClientRects().length > 0;
      const all = [...document.querySelectorAll('*')].filter(rendered);
      // Group by the nearest ancestor that is a list-ish container.
      const groups = {};
      for (const el of all) {
        const c = el.closest('#entry-list, #library-grid, #timeline-scroll, #conversation-list, #chat-messages, .dash-body, #settings-modal, #top-bar, #tab-bar, .sidebar-panel, #sidebar, #capture');
        const k = c ? (c.id ? '#' + c.id : '.' + c.className.split(' ')[0]) : 'other';
        const off = el.getBoundingClientRect().top > innerHeight * 1.5;
        groups[k] = groups[k] || [0, 0];
        groups[k][0]++;
        if (off) groups[k][1]++;
      }
      const items = document.querySelectorAll('#entry-list > li').length;
      return { rendered: all.length, items, groups };
    });
    console.log(t, JSON.stringify(r));
  }
  await browser.close();
})();
