// A dock zone that wraps to a new line keeps the hairline that separates it
// from the zone before it (INBOX 479). At a tablet's width the hairline then
// stands at the start of a line with nothing to its left. This counts, on
// every dock of every tab and Library sub-tab, the zones that start a line
// and still draw a left border, and the dock's left content edge against
// the zone's, so a line that starts indented is visible too.
//   BASE=... WIDTHS=820,1024,1200 node dockseams.js
const { boot } = require('./lib.js');
const WIDTHS = (process.env.WIDTHS || '820,1024,1200').split(',').map(Number);
(async () => {
  for (const W of WIDTHS) {
    const { browser, page } = await boot({ viewport: { width: W, height: 900 }, hasTouch: W < 820 ? true : undefined });
    const scan = () => page.evaluate(() => {
      const out = [];
      for (const dock of document.querySelectorAll('.dock')) {
        if (!dock.checkVisibility()) continue;
        const kids = [...dock.children].filter((k) => k.checkVisibility() && k.getBoundingClientRect().width > 0);
        const ds = getComputedStyle(dock);
        const left = dock.getBoundingClientRect().left + parseFloat(ds.paddingLeft) + parseFloat(ds.borderLeftWidth);
        let prev = null;
        for (const k of kids) {
          const b = k.getBoundingClientRect();
          if (prev && b.top >= prev.bottom - 1) {
            const cs = getComputedStyle(k);
            const seam = parseFloat(cs.borderLeftWidth) > 0 && cs.borderLeftColor !== 'rgba(0, 0, 0, 0)' && cs.borderLeftStyle !== 'none';
            const zoneLeft = b.left + (seam ? 0 : 0);
            const contentLeft = b.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft);
            out.push({ dock: dock.dataset.dockName || dock.className, zone: k.className.split(' ').slice(0, 2).join('.'), seam, indent: Math.round(contentLeft - left), at: Math.round(zoneLeft) });
          }
          prev = b;
        }
      }
      return out;
    });
    const all = [];
    const tabs = ['dashboard', 'notes', 'chat', 'graph', 'timeline', 'reminders', 'library'];
    for (const t of tabs) {
      await page.click(`[data-tab="${t}"]`).catch(() => {}); await page.waitForTimeout(800);
      if (t === 'library') {
        const n = await page.$$eval('#library-subtabs [role=tab]', (b) => b.length);
        for (let i = 0; i < n; i++) {
          await page.evaluate((i) => document.querySelectorAll('#library-subtabs [role=tab]')[i].click(), i);
          await page.waitForTimeout(700);
          all.push(...(await scan()));
        }
      } else all.push(...(await scan()));
    }
    const uniq = [...new Map(all.map((r) => [r.dock + r.zone, r])).values()];
    console.log(`== ${W}: ${uniq.length} zones start a line, ${uniq.filter((r) => r.seam).length} with a seam, ${uniq.filter((r) => r.indent > 2 && !/actions/.test(r.zone)).length} indented`);
    for (const r of uniq) console.log(`  ${r.dock} ${r.zone} seam=${r.seam} indent=${r.indent}`);
    await browser.close();
  }
})();
