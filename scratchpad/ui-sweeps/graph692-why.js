// Why a placed label still sits on a dot or a line (graph692.js's
// labelOnDot/labelOnLine): for each such label, its flags and which spot won.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  try {
    await page.evaluate(() => switchTab('graph'));
    for (let i = 0; i < 80; i++) {
      await page.waitForTimeout(250);
      if (await page.evaluate(() => gcTab.ticks > 5 && gcTab.alpha < 0.002)) break;
    }
    await page.waitForTimeout(1500);
    console.log(JSON.stringify(await page.evaluate(() => {
      const s = gcTab;
      const out = [];
      for (const b of s.labelBoxes || []) {
        const dots = s.nodes.filter((n) => n.id !== b.id && Number.isFinite(n.x)).filter((n) => {
          const nx = Math.max(b.left, Math.min(n.x, b.right));
          const ny = Math.max(b.top, Math.min(n.y, b.bottom));
          return (nx - n.x) ** 2 + (ny - n.y) ** 2 < n.r * n.r;
        }).map((n) => n.preview || n.id);
        const lines = s.lineGrid ? gcBoxLineCount(s.lineGrid, b) : -1;
        if (dots.length || lines) out.push({ text: b.text, landmark: b.landmark, force: b.force, rank: b.rank, dots, lines, alpha: s.alpha });
      }
      return out;
    }), null, 0));
  } finally {
    await browser.close();
  }
})();
