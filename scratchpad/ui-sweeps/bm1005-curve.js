// INBOX 609: "on longer mind map links, I can actually see the hard bends in
// the line and it isnt a smooth curve". Builds a map with long branches (a
// root and children 900 and 1400 units away) and measures the drawn ribbon's
// outline: walking it at 0.25 unit steps, the largest turn between two
// successive 1-unit chords on each side. A sampled polyline turns in steps
// (a corner every segment, several degrees at once); a true curve turns a
// fraction of a degree per unit. Also counts the L commands in the outline.
// Pass: max turn per unit under 1.5 degrees on every long branch.
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `curve ${Date.now()}`, type: 'map' }) });
    const mk = async (x, y, text, parent) => {
      const made = await apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ board_id: board.id, kind: 'topic', x, y, width: 170, height: 52, data: { content: text } }) });
      if (parent) await apiJson(`/whiteboard/boards/${board.id}/nodes/${made.id}/move`, { method: 'PUT', body: JSON.stringify({ parent_id: parent }) });
      return made;
    };
    const root = await mk(0, 800, 'Root');
    for (const [i, y] of [[1, -200], [2, 300], [3, 1300], [4, 1900]]) await mk(900 + (i % 2) * 500, y, `Far ${i}`, root.id);
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 900));
    const res = [];
    for (const e of document.querySelectorAll('.wb-map-edge')) {
      const d = e.getAttribute('d') || '';
      const total = e.getTotalLength();
      const sideMax = (from, to) => {
        let worst = 0;
        const pts = [];
        for (let s = from; s <= to; s += 0.25) pts.push(e.getPointAtLength(s));
        for (let i = 4; i + 4 < pts.length; i += 1) {
          const a = Math.atan2(pts[i].y - pts[i - 4].y, pts[i].x - pts[i - 4].x);
          const b = Math.atan2(pts[i + 4].y - pts[i].y, pts[i + 4].x - pts[i].x);
          let t = Math.abs(b - a) * 180 / Math.PI;
          if (t > 180) t = 360 - t;
          worst = Math.max(worst, t);
        }
        return +worst.toFixed(2);
      };
      // The first ~42% of the outline is the forward side (the parent end's
      // cap is at 0, the tip near 50%); keep clear of both.
      res.push({ len: Math.round(total), L: (d.match(/L/g) || []).length, C: (d.match(/C/g) || []).length, turn: sideMax(total * 0.04, total * 0.42) });
    }
    return res;
  });
  for (const r of out) console.log(`edge len ${r.len}: ${r.L} L, ${r.C} C, max turn per unit ${r.turn} deg ${r.turn < 1.5 ? 'PASS' : 'FAIL'}`);
  await browser.close();
})();
