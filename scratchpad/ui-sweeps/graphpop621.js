// INBOX 621: the graph's display options popover, rebuilt to DESIGN.md's
// popover recipe. Measures, with every fold open: the distinct row heights,
// label font sizes, label left edges and control right edges per section,
// the section heads' styles, and the switch sizes; and screenshots it.
//   BASE=… SCRATCH=… TAG=before W=1440 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node graphpop621.js
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
const TAG = process.env.TAG || 'shot';
(async () => {
  const opts = { viewport: { width: W, height: W < 600 ? 844 : 900 } };
  if (W < 600) Object.assign(opts, { hasTouch: true, isMobile: true });
  const { browser, page, OUT } = await boot(opts);
  await page.evaluate(() => document.querySelector('[data-tab="graph"]')?.click());
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('graph-options-toggle')?.click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelectorAll('#graph-options details').forEach((d) => { d.open = true; }));
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const pop = document.getElementById('graph-options');
    if (!pop || pop.classList.contains('hidden')) return { open: false };
    const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const cs = (e) => getComputedStyle(e);
    const pb = pop.getBoundingClientRect();
    const rows = [...pop.querySelectorAll('.graph-option-row')].filter(vis);
    const heights = {};
    const labelSizes = {};
    const ctrlRights = {};
    const labelLefts = {};
    for (const row of rows) {
      const h = Math.round(row.getBoundingClientRect().height);
      heights[h] = (heights[h] || 0) + 1;
      const lab = row.querySelector('label, span');
      if (lab && lab !== row) {
        const fs = cs(lab).fontSize; labelSizes[fs] = (labelSizes[fs] || 0) + 1;
        const l = Math.round(lab.getBoundingClientRect().left - pb.left); labelLefts[l] = (labelLefts[l] || 0) + 1;
      }
      const ctrl = row.querySelector('input:not([type=hidden]), select:not(.select-native-hidden), .select-shell, .segmented-control, .seg');
      if (ctrl && vis(ctrl)) {
        const rr = Math.round(pb.right - ctrl.getBoundingClientRect().right); ctrlRights[rr] = (ctrlRights[rr] || 0) + 1;
      }
    }
    const heads = [...pop.querySelectorAll('.dock-menu-label, .graph-pop-head')].filter(vis).map((h) => {
      const s = cs(h); return `${h.textContent.trim().slice(0, 12)}:${s.fontSize}/${s.fontWeight}/${s.textTransform}`;
    });
    const headStyles = new Set(heads.map((h) => h.split(':')[1]));
    const switches = [...pop.querySelectorAll('input[type=checkbox]')].filter(vis).map((i) => `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`);
    const segs = [...pop.querySelectorAll('.segmented-control, .seg')].filter(vis).map((s) => `${s.id}:${Math.round(s.getBoundingClientRect().height)}`);
    const selects = [...pop.querySelectorAll('.select-shell, select')].filter(vis).map((s) => Math.round(s.getBoundingClientRect().width));
    return {
      open: true,
      box: `${Math.round(pb.width)}x${Math.round(pb.height)}`,
      scroll: `${pop.scrollHeight}/${pop.clientHeight}`,
      radius: cs(pop).borderRadius,
      rowHeights: heights, labelSizes, labelLefts, ctrlRights,
      headStyles: [...headStyles], heads,
      switches: [...new Set(switches)], segs, selectWidths: [...new Set(selects)],
      hscroll: pop.scrollWidth > pop.clientWidth + 1,
    };
  });
  console.log(TAG, W, process.env.THEME || 'light', JSON.stringify(r));
  const el = await page.$('#graph-options');
  if (el && r.open) await el.screenshot({ path: `${OUT}/${TAG}-${W}-${process.env.THEME || 'light'}-graphpop.png` });
  await browser.close();
})();
