// Settings › Tools it can use: do the two columns' rows line up? Reported at
// the owner's scale: the left column's line 14px higher than the right's.
// Per grid row, the two cells' tops and bottoms (li and its label), and any
// visible horizontal line each cell draws (border, box-shadow, ::before or
// ::after), per device scale factor, in dark with real scrollbars.
//
//   BASE=... SCROLLBARS=1 THEME=dark DSFS=1,1.25,1.5 node toolgrid.js
//
// Exits 1 when two cells on one grid row differ by more than 1px anywhere.
const fs = require('fs');
const { boot, OUT } = require('./lib.js');
const DSFS = (process.env.DSFS || '1,1.25,1.5').split(',').map(Number);
const WIDTHS = (process.env.WIDTHS || '1440').split(',').map(Number);

(async () => {
  let worst = 0;
  const all = [];
  for (const width of WIDTHS) {
    for (const dsf of DSFS) {
      // The owner's scale is a zoom of the layout, so the viewport in CSS
      // pixels is the screen's width divided by the scale.
      const { browser, page } = await boot({ viewport: { width: Math.round(width / dsf), height: Math.round(900 / dsf) }, deviceScaleFactor: dsf });
      await page.click('#settings-btn').catch(() => {});
      await page.waitForTimeout(500);
      await page.click('#settings-modal [data-section="tools"]');
      await page.waitForTimeout(1200);
      const r = await page.evaluate(() => {
        const list = document.getElementById('tool-list');
        const lis = [...list.children].filter((li) => li.getClientRects().length);
        const lines = (el) => {
          const out = [];
          for (const pseudo of [null, '::before', '::after']) {
            const cs = getComputedStyle(el, pseudo);
            if (pseudo && (cs.content === 'none' || cs.display === 'none')) continue;
            if (parseFloat(cs.borderBottomWidth) > 0 && cs.borderBottomStyle !== 'none') out.push(`${pseudo || ''}border-bottom`);
            if (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none') out.push(`${pseudo || ''}border-top`);
            if (cs.boxShadow !== 'none') out.push(`${pseudo || ''}shadow:${cs.boxShadow.slice(0, 40)}`);
          }
          return out;
        };
        const rows = new Map();
        for (const li of lis) {
          const b = li.getBoundingClientRect();
          const label = li.querySelector('label') || li;
          const lb = label.getBoundingClientRect();
          const key = Math.round(b.top);
          const cell = { col: Math.round(b.left), top: +b.top.toFixed(2), bottom: +b.bottom.toFixed(2), ltop: +lb.top.toFixed(2), lbottom: +lb.bottom.toFixed(2), lines: [...lines(li), ...lines(label).map((x) => `label ${x}`)] };
          // Group by the grid row the li is placed in, not by its top, so
          // two cells that sit at different heights still pair up.
          const rowIndex = lis.filter((o) => o !== li && o.getBoundingClientRect().top < b.top - 1 && o.getBoundingClientRect().left === b.left).length;
          if (!rows.has(rowIndex)) rows.set(rowIndex, []);
          rows.get(rowIndex).push(cell);
          void key;
        }
        const cols = new Set(lis.map((li) => Math.round(li.getBoundingClientRect().left))).size;
        let worst = 0;
        let where = null;
        for (const [i, cells] of rows) {
          if (cells.length < 2) continue;
          for (const k of ['top', 'bottom', 'ltop', 'lbottom']) {
            const d = Math.max(...cells.map((c) => c[k])) - Math.min(...cells.map((c) => c[k]));
            if (d > worst) { worst = d; where = { row: i, k, cells }; }
          }
        }
        const gridCs = getComputedStyle(list);
        return { cols, rows: rows.size, worst: +worst.toFixed(2), where, sample: rows.get(0), gap: gridCs.rowGap, align: gridCs.alignItems, vw: document.documentElement.clientWidth, scrollbar: window.innerWidth - document.documentElement.clientWidth };
      });
      r.width = width; r.dsf = dsf;
      all.push(r);
      worst = Math.max(worst, r.worst);
      console.log(`${width}@${dsf}: ${r.cols} columns, ${r.rows} rows, worst offset ${r.worst}px ${r.where ? `(row ${r.where.row}, ${r.where.k})` : ''}; lines ${JSON.stringify((r.sample || [])[0]?.lines || [])}; vw ${r.vw}, scrollbar ${r.scrollbar}`);
      await page.evaluate(() => document.getElementById('tool-list').children[6]?.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${OUT}/toolgrid-${width}-${dsf}.png` }).catch(() => {});
      await browser.close();
    }
  }
  fs.writeFileSync(`${OUT}/toolgrid.json`, JSON.stringify(all, null, 1));
  console.log(worst > 1 ? `FAIL: ${worst}px` : 'PASS');
  process.exitCode = worst > 1 ? 1 : 0;
})();
