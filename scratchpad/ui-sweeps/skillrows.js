// Settings > Skills (and Templates, the same row): how tall each row is and
// where its height goes (uipolish-0924 item 5: "the Skills list rows are
// ~78px each (20+ built-ins)").
//
//   BASE=http://127.0.0.1:8793 WIDTH=1440 node scratchpad/ui-sweeps/skillrows.js
const { boot } = require('./lib.js');

const WIDTH = Number(process.env.WIDTH || 1440);
const SHOTS = process.env.SHOTS || '';

(async () => {
  const touch = WIDTH < 500;
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: 900 }, hasTouch: touch, isMobile: touch });
  for (const section of ['skills', 'templates']) {
    await page.evaluate((s) => openSettingsModal(s), section);
    await page.waitForTimeout(1200);
    const r = await page.evaluate((s) => {
      const list = document.getElementById(s === 'skills' ? 'skill-list' : 'template-list');
      if (!list) return { missing: true };
      const lis = [...list.children];
      const hs = lis.map((li) => Math.round(li.getBoundingClientRect().height));
      const first = lis[0]?.querySelector('.skill-row');
      const parts = first ? [...first.children].map((c) => {
        const r = c.getBoundingClientRect();
        return { cls: c.className.slice(0, 30), top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width) };
      }) : [];
      const rowR = first?.getBoundingClientRect();
      const cs = first ? getComputedStyle(first) : null;
      const liCs = lis[0] ? getComputedStyle(lis[0]) : null;
      const blurbs = lis.map((li) => li.querySelector('.skill-blurb')).filter(Boolean);
      const blurbLines = blurbs.map((b) => Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight || 20)));
      return {
        rows: lis.length,
        min: Math.min(...hs), max: Math.max(...hs), avg: Math.round(hs.reduce((a, b) => a + b, 0) / (hs.length || 1)),
        total: Math.round(list.getBoundingClientRect().height),
        listGap: getComputedStyle(list).rowGap,
        row: rowR && { top: Math.round(rowR.top), h: Math.round(rowR.height), pad: cs.padding, gap: cs.gap, display: cs.display, wrap: cs.flexWrap },
        li: liCs && { pad: liCs.padding, margin: liCs.margin, border: liCs.borderBottomWidth },
        parts,
        blurbLines: [...new Set(blurbLines)],
        clamp: blurbs[0] ? getComputedStyle(blurbs[0]).webkitLineClamp : null,
      };
    }, section);
    console.log(section, WIDTH, JSON.stringify(r));
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${section}-${WIDTH}.png` });
    // The actions, pointed at: inside the row's card, not taller than it.
    const li = await page.$(`#${section === 'skills' ? 'skill' : 'template'}-list > li:has(.entry-actions)`);
    if (li) {
      await li.hover();
      await page.waitForTimeout(300);
      const a = await li.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const acts = [...el.querySelectorAll('.entry-actions button')].filter((b) => b.checkVisibility());
        return {
          li: Math.round(r.height),
          actions: acts.map((b) => { const q = b.getBoundingClientRect(); return { top: Math.round(q.top - r.top), bottom: Math.round(r.bottom - q.bottom), h: Math.round(q.height) }; }),
        };
      });
      console.log(section, WIDTH, 'hovered', JSON.stringify(a));
      if (SHOTS) {
        const box = await li.boundingBox();
        await page.screenshot({ path: `${SHOTS}/${section}-${WIDTH}-hover.png`, clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } });
      }
    }
  }
  await browser.close();
})();
