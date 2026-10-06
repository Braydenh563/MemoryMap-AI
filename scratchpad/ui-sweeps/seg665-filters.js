// INBOX 665 (c) and the Questions addition: the two count filters in their
// docks, measured and cropped. Prints each segment's fill, radius, gap to the
// next and the well's own fill, so "reads as three pills" is a number.
//   BASE=... THEME=dark W=1440 OUT=<dir> node scratchpad/ui-sweeps/seg665-filters.js
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: 900 } });
  const shot = async (sel, name) => {
    const info = await page.evaluate((s) => {
      const g = document.querySelector(s);
      if (!g || !g.getClientRects().length) return null;
      const cs = getComputedStyle(g);
      const r = g.getBoundingClientRect();
      const kids = [...g.children].filter((k) => k.getClientRects().length);
      return {
        well: `${Math.round(r.width)}x${Math.round(r.height)} bg ${cs.backgroundColor} radius ${cs.borderTopLeftRadius} pad ${cs.padding} display ${cs.display}`,
        segs: kids.map((k, i) => {
          const kc = getComputedStyle(k);
          const kr = k.getBoundingClientRect();
          const next = kids[i + 1]?.getBoundingClientRect();
          return `${k.textContent.trim().replace(/\s+/g, ' ')}: ${Math.round(kr.width)}x${Math.round(kr.height)} bg ${kc.backgroundColor} radius ${kc.borderTopLeftRadius} border ${kc.borderTopWidth} ${kc.borderTopColor} gap ${next ? Math.round(next.left - kr.right) : '-'} pressed ${k.getAttribute('aria-pressed')}`;
        }),
        clip: { x: Math.max(0, r.left - 40), y: Math.max(0, r.top - 20), width: Math.min(r.width + 80, innerWidth - Math.max(0, r.left - 40)), height: r.height + 40 },
      };
    }, sel);
    console.log(name, JSON.stringify(info && { ...info, clip: undefined }, null, 1));
    if (info && process.env.OUT) await page.screenshot({ path: `${process.env.OUT}/${name}-${W}.png`, clip: info.clip });
  };
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => showNotesSection?.('questions'));
  await page.waitForTimeout(1200);
  await shot('.select-shell:has(> #questions-state)', 'questions');
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-skills"]')?.click());
  await page.waitForTimeout(1500);
  await shot('.select-shell:has(> #skills-kind)', 'skills');
  await browser.close();
})();
