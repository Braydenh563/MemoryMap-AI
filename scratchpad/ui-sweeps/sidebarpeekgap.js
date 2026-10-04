// INBOX 495 (follow-up): the peeked-open sidebars' toggle against the head's
// last button, pinned vs peeked, for Notes, Chat and Documents (Skill logs is
// skillslogshead.js). Prints the x gap between the toggle and the nearest
// visible control in the head, in both states.
//
//   BASE=http://127.0.0.1:8879 node sidebarpeekgap.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const cases = [
    ['notes', 'sidebar', 'notes'],
    ['chat', 'chat-sidebar', 'chat'],
    ['library', 'doc-sidebar', 'library'],
  ];
  for (const [tab, id, label] of cases) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(1200);
    if (id === 'doc-sidebar') {
      await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-documents"]')?.click());
      await page.waitForTimeout(1200);
    }
    const gap = () => page.evaluate((sid) => {
      const sb = document.getElementById(sid);
      if (!sb || !sb.getClientRects().length) return 'hidden';
      const pin = sb.querySelector('.sidebar-collapse-toggle').getBoundingClientRect();
      const ctl = [...sb.querySelectorAll('.sidebar-head button, .sidebar-head .ghost, .sidebar-head summary')]
        .filter((e) => e.getClientRects().length && !e.classList.contains('sidebar-collapse-toggle'));
      const edges = ctl.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && Math.abs((r.top + r.bottom) / 2 - (pin.top + pin.bottom) / 2) < 20);
      if (!edges.length) return 'no control in head';
      const gaps = edges.map((r) => Math.max(pin.left - r.right, r.left - pin.right));
      return Math.min(...gaps).toFixed(1);
    }, id);
    const pinned = await gap();
    await page.evaluate((sid) => document.getElementById(sid).querySelector('.sidebar-collapse-toggle').click(), id);
    await page.waitForTimeout(700);
    const r = await page.evaluate((sid) => { const b = document.getElementById(sid).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 200 }; }, id);
    await page.mouse.move(r.x, r.y);
    await page.waitForTimeout(900);
    const peeked = await gap();
    console.log(`${label}: pinned gap=${pinned} peeked gap=${peeked}`);
    await page.mouse.move(700, 450);
    await page.evaluate((sid) => document.getElementById(sid).querySelector('.sidebar-collapse-toggle').click(), id).catch(() => {});
  }
  await browser.close();
})();
