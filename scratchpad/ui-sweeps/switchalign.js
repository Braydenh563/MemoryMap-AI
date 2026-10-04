// For every Settings section: each visible switch row's switch left edge
// against its group's content edge (the group's padding box), and the same
// for the group head. Reports the distribution of offsets.
//   BASE=... W=1440 node switchalign.js
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
const SECTIONS = 'general,preferences,appearance,account,privacy,capture,ask,browse,list,outline,models,tools,skills,personas,templates,memory,learned,tasks,writing-room,websearch,searchindex,extras,data,logs,about'.split(',');
(async () => {
  const touch = W < 600 ? { hasTouch: true, isMobile: true } : {};
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...touch });
  const dist = {};
  const samples = {};
  for (const s of SECTIONS) {
    await page.evaluate((x) => openSettingsModal(x), s);
    await page.waitForTimeout(700);
    const rows = await page.evaluate(() => {
      const out = [];
      for (const inp of document.querySelectorAll('#settings-modal .settings-section:not(.hidden) input[type="checkbox"]')) {
        if (!inp.offsetParent) continue;
        const row = inp.closest('label');
        const g = inp.closest('.settings-group, details.settings-fold');
        if (!row || !g) continue;
        const gr = g.getBoundingClientRect();
        const gs = getComputedStyle(g);
        const edge = gr.left + parseFloat(gs.borderLeftWidth) + parseFloat(gs.paddingLeft);
        const ir = inp.getBoundingClientRect();
        if (ir.width < 20) continue;
        out.push({ off: Math.round(ir.left - edge), cls: row.className.split(' ').slice(0, 2).join('.'), pad: getComputedStyle(row).paddingLeft });
      }
      return out;
    });
    for (const r of rows) {
      const k = `${r.off}px ${r.cls} pad=${r.pad}`;
      dist[k] = (dist[k] || 0) + 1;
      (samples[k] = samples[k] || new Set()).add(s);
    }
  }
  for (const [k, n] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4), k, '  in', [...samples[k]].slice(0, 8).join(','));
  await browser.close();
})();
