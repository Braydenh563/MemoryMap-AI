// INBOX 279 (2): "the timeline table view shrinks horizontally when opening a
// note row."
//
// The detail is already a `<tr>` inside the table (`openTimelineTableDetail`
// in app.js), so the reflow is not a sibling pane taking the width. What this
// measures is where the width actually goes: the card, the scroller, the
// table, and every column head, with the detail closed and then open, at the
// two widths the report's screenshots were taken at.
//
//   BASE=http://127.0.0.1:8991 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules SCRATCH=/tmp/claude-0 \
//     timeout 115 node timelinetablewidth.js
const { boot } = require('./lib.js');

let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`);
};

const shape = () => {
  const round = (n) => Math.round(n * 10) / 10;
  const table = document.getElementById('timeline-table');
  const scroll = document.getElementById('timeline-scroll');
  const card = table.closest('.card') || scroll.parentElement;
  const heads = [...table.querySelectorAll('thead th')].map((th) =>
    round(th.getBoundingClientRect().width)
  );
  const titleHead = table.querySelector('thead th:nth-child(3)');
  return {
    card: round(card.getBoundingClientRect().width),
    scroll: round(scroll.getBoundingClientRect().width),
    scrollClient: scroll.clientWidth,
    table: round(table.getBoundingClientRect().width),
    title: round(titleHead.getBoundingClientRect().width),
    heads,
    detailRows: table.querySelectorAll('.timeline-detail-row').length,
    scrollH: scroll.scrollHeight,
    clientH: scroll.clientHeight,
  };
};

(async () => {
  const { browser, page } = await boot();
  await page.click('[data-tab="timeline"]');
  await page.waitForTimeout(1200);
  await page.click('#timeline-view-table');
  await page.waitForTimeout(800);

  for (const width of [1930, 1600, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(500);
    const before = await page.evaluate(shape);
    await page.click('#timeline-table-body tr.timeline-trow:nth-child(2) td:nth-child(3)');
    await page.waitForTimeout(500);
    const after = await page.evaluate(shape);
    console.log(
      `${width}  closed: card ${before.card} scroll ${before.scroll} table ${before.table} title ${before.title}`
    );
    console.log(
      `${width}  open:   card ${after.card} scroll ${after.scroll} table ${after.table} title ${after.title}  detail rows ${after.detailRows}`
    );
    console.log(`${width}  heads closed ${before.heads.join('/')}`);
    console.log(`${width}  heads open   ${after.heads.join('/')}`);
    check(
      `${width}: the table keeps its width when a row opens`,
      Math.abs(after.table - before.table) < 1,
      `${before.table} -> ${after.table}`
    );
    check(
      `${width}: the detail is a row of the table, not a sibling`,
      after.detailRows === 1,
      `${after.detailRows} detail row(s)`
    );
    check(
      `${width}: the title column keeps its width`,
      Math.abs(after.title - before.title) < 1,
      `${before.title} -> ${after.title}`
    );
    // Close it again so the next width starts from the same state.
    await page.click('#timeline-table-body tr.timeline-trow:nth-child(2) td:nth-child(3)');
    await page.waitForTimeout(300);
  }

  // The span itself, against the columns the table is really drawing. This is
  // the number the report was about: one more than this invents an auto-width
  // column for the Title column to halve its share with, and one less leaves
  // the last column uncovered. The tick column is off here because a row
  // cannot be opened while the selection mode is on (a click selects it
  // instead), which is also why the mode has no case of its own below.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(400);
  await page.click('#timeline-table-body tr.timeline-trow:nth-child(2) td:nth-child(3)');
  await page.waitForTimeout(500);
  const span = await page.evaluate(() => ({
    colSpan: document.querySelector('.timeline-detail-row > td').colSpan,
    columns: [...document.querySelectorAll('#timeline-table thead th')].filter(
      (th) => getComputedStyle(th).display !== 'none'
    ).length,
    cells: document.querySelector('#timeline-table tbody tr.timeline-trow').cells.length,
  }));
  check(
    '1440: the detail spans every drawn column and no more',
    span.colSpan === span.columns,
    `colSpan ${span.colSpan}, ${span.columns} drawn heads, ${span.cells} cells in a row`
  );

  console.log(failures ? `FAILURES ${failures}` : 'all checks passed');
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
