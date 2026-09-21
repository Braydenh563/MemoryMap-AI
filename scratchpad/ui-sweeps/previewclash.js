// INBOX 263 (4): "the boards and maps previews are kinda a mess", with labels
// sitting over blocks and over each other and running past the paper.
//
// The existing boardpreview.js asks whether the picture is a picture of the
// board. This asks the other question: whether anything in it collides. For
// every label it measures the label's own painted box against
//   1. the blocks it does not belong to,
//   2. every other label,
//   3. the SVG's own viewBox,
// and reports overlaps in viewBox units, which are the units the renderer
// works in, so a finding points straight at the arithmetic.
const { boot } = require('./lib.js');

const BOARD = 'Preview clash board';
const MAP = 'Preview clash map';

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  await page.waitForTimeout(3500);

  const built = await page.evaluate(async ([boardName, mapName]) => {
    const made = {};
    // A board whose cards sit close together with long titles, which is the
    // shape the report's screenshot has: a real board is not a tidy grid.
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: boardName }) });
    const titles = [
      'Retry budget and backoff', 'Ingest pipeline rewrite', 'Open questions for review',
      'Cold start latency', 'Connection pool sizing', 'Weekly planning notes',
    ];
    const at = [[40, 40], [260, 60], [480, 40], [60, 200], [300, 210], [520, 190]];
    for (let i = 0; i < titles.length; i++) {
      const e = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ title: titles[i], content: 'body text', category: 'General' }) });
      await apiJson('/whiteboard/nodes', { method: 'POST', body: JSON.stringify({ entry_id: e.id, board_id: board.id, x: at[i][0], y: at[i][1], z: 1 }) });
    }
    made.board = board.id;
    const map = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: mapName, board_type: 'map' }) }).catch(() => null);
    if (map) {
      const topics = ['Architecture', 'Storage and retention', 'Search', 'Models', 'Onboarding'];
      for (let i = 0; i < topics.length; i++) {
        await apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ board_id: map.id, kind: 'map-topic', text: topics[i], x: 100 + (i % 3) * 230, y: 90 + Math.floor(i / 3) * 130, width: 200, height: 56 }) }).catch(() => null);
      }
      made.map = map.id;
    }
    return made;
  }, [BOARD, MAP]);
  console.log('built', JSON.stringify(built));

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]').catch(() => {});
  await page.waitForTimeout(700);
  await page.evaluate(() => { if (typeof wbShowBoardsView === 'function') wbShowBoardsView(); });
  await page.waitForTimeout(3000);

  const report = await page.evaluate(() => {
    const out = [];
    for (const svg of document.querySelectorAll('svg.board-minimap, .board-minimap svg, svg[class*="minimap"]')) {
      const vb = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
      if (vb.length !== 4) continue;
      const labels = [...svg.querySelectorAll('.board-minimap-label')];
      if (!labels.length) continue;
      const blocks = [...svg.querySelectorAll('rect.board-minimap-card, rect.board-minimap-object, rect.board-minimap-image')];
      // Painted boxes, in viewBox units: getBBox on an SVG text gives exactly
      // that, which is why this is a measurement and not a guess from
      // characters-times-width.
      const bb = (el) => { const b = el.getBBox(); return { x: b.x, y: b.y, w: b.width, h: b.height, el }; };
      const L = labels.map(bb), B = blocks.map(bb);
      const over = (a, b) => {
        const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        return w > 0.5 && h > 0.5 ? { w: +w.toFixed(1), h: +h.toFixed(1) } : null;
      };
      const findings = { onBlocks: [], onLabels: [], offPaper: [] };
      // The blocks themselves, which is the other half of the report: a card
      // drawn past the thumbnail's own edge is clipped mid-shape.
      for (const b of B) {
        const pad = 0.01;
        if (b.x < vb[0] - pad || b.y < vb[1] - pad
            || b.x + b.w > vb[0] + vb[2] + pad || b.y + b.h > vb[1] + vb[3] + pad) {
          findings.offPaper.push(`block at ${b.x.toFixed(1)},${b.y.toFixed(1)} ${b.w.toFixed(1)}x${b.h.toFixed(1)} leaves ${vb.join(' ')}`);
        }
      }
      for (const l of L) {
        // A label drawn *inside* its own block is the intended case.
        const inside = l.el.classList.contains('board-minimap-label-inside');
        if (!inside) {
          for (const b of B) {
            const o = over(l, b);
            if (o) findings.onBlocks.push(`"${l.el.textContent}" over a block by ${o.w}x${o.h}`);
          }
        }
        const pad = 0.01;
        if (l.x < vb[0] - pad || l.y < vb[1] - pad
            || l.x + l.w > vb[0] + vb[2] + pad || l.y + l.h > vb[1] + vb[3] + pad) {
          findings.offPaper.push(`"${l.el.textContent}" at ${l.x.toFixed(1)},${l.y.toFixed(1)} ${l.w.toFixed(1)}x${l.h.toFixed(1)} in ${vb.join(' ')}`);
        }
      }
      for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
        const o = over(L[i], L[j]);
        if (o) findings.onLabels.push(`"${L[i].el.textContent}" over "${L[j].el.textContent}" by ${o.w}x${o.h}`);
      }
      out.push({
        card: svg.closest('[data-board-id], .board-card, li')?.textContent?.trim().slice(0, 34) || '?',
        viewBox: vb.join(' '), labels: L.length, blocks: B.length, ...findings,
      });
    }
    return out;
  });

  let failures = 0;
  for (const r of report) {
    const n = r.onBlocks.length + r.onLabels.length + r.offPaper.length;
    failures += n;
    console.log(`\n== ${r.card} (viewBox ${r.viewBox}, ${r.labels} labels, ${r.blocks} blocks): ${n} finding(s)`);
    for (const line of [...r.onBlocks, ...r.onLabels, ...r.offPaper]) console.log('   ', line);
  }
  console.log(`\n${failures ? 'FAIL' : 'PASS'}: ${failures} finding(s) across ${report.length} preview(s)`);
  console.log('errors:', errs.length, errs.slice(0, 3));
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
