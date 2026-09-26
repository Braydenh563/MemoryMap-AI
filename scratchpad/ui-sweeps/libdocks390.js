// Library docks at a phone width: the height of each sub-tab's dock and the
// row each of its visible controls lands on. The Boards & maps dock was
// 198px at 390 (four rows) while every other Library dock was 114px
// (docs/roadmap/agent-remaining/pass2.md, Remaining 1).
//
//   BASE=http://127.0.0.1:8796 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node libdocks390.js
// WIDTH=... to measure another width. Fails when any Library dock is taller
// than the All sub-tab's.
const { boot } = require('./lib.js');

const WIDTH = Number(process.env.WIDTH || 390);

(async () => {
  const { page, browser } = await boot({ viewport: { width: WIDTH, height: 844 }, hasTouch: true, isMobile: true });
  await page.waitForTimeout(3000);
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(800);
  const tabs = await page.$$eval('#library-subtabs [role="tab"]', (els) => els.map((e) => e.textContent.trim()));
  const out = [];
  for (let i = 0; i < tabs.length; i += 1) {
    await page.evaluate((k) => document.querySelectorAll('#library-subtabs [role="tab"]')[k].click(), i);
    await page.waitForTimeout(700);
    const m = await page.evaluate(() => {
      const docks = [...document.querySelectorAll('#tab-library .dock')].filter((d) => d.checkVisibility());
      return docks.map((dock) => {
        const box = dock.getBoundingClientRect();
        const rows = new Map();
        for (const el of dock.querySelectorAll('h2, input:not([type="file"]):not(.hidden), select, button, summary')) {
          if (!el.checkVisibility() || el.closest('.dock-menu-list')) continue;
          const r = el.getBoundingClientRect();
          if (!r.width) continue;
          const top = Math.round(r.top - box.top);
          const label = (el.id || el.getAttribute('aria-label') || el.textContent.trim()).slice(0, 18);
          rows.set(top, [...(rows.get(top) || []), label]);
        }
        return { name: dock.dataset.dockName, h: Math.round(box.height), rows: [...rows.entries()].sort((a, b) => a[0] - b[0]) };
      });
    });
    out.push({ tab: tabs[i], docks: m });
  }
  const findings = [];
  const allH = out[0]?.docks[0]?.h || 0;
  for (const t of out) {
    for (const d of t.docks) {
      console.log(`${t.tab.padEnd(14)} ${d.name.padEnd(18)} ${d.h}px`);
      for (const [top, labels] of d.rows) console.log(`    +${top}: ${labels.join(' | ')}`);
      if (allH && d.h > allH + 1) findings.push(`${t.tab}: ${d.name} is ${d.h}px, All is ${allH}px`);
    }
  }
  for (const f of findings) console.log('    ' + f);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
