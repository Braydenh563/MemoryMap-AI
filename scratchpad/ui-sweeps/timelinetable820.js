// TIMELINE_PLAN section 7's second measurement: "the table's column set on a
// tablet needs a measurement at 820". `timelinetable.js` measures 1440 and 390
// only, and the wide columns hide below 600px, so 820 draws all eight and
// nobody had judged whether eight columns at 820 are readable or only present.
//
//   BASE=http://127.0.0.1:8982 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules node scratchpad/ui-sweeps/timelinetable820.js
//
// Seed first (seed-timeline-bulk.py), because the question is about real
// titles: a table of empty cells is readable at any width.
//
// **What "readable" is measured as.** The title is the one column with no
// fixed width (`06-timeline-dialogs.css`): every other column is in rems, so
// the title gets whatever is left, and at some width that is nothing. So the
// numbers are the title column's own width, and how many of its cells are
// actually clipped (`scrollWidth > clientWidth` on the cell, which is what
// `text-overflow: ellipsis` is hiding), at each of the three widths.
const { boot } = require('./lib.js');

const WIDTHS = [1440, 1024, 820, 700, 600];

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };

  await page.click('[data-tab="timeline"]');
  await page.waitForTimeout(2000);
  await page.click('#timeline-view-table');
  await page.waitForTimeout(800);

  const rows = [];
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(700);
    rows.push(
      await page.evaluate((w) => {
        const table = document.getElementById('timeline-table');
        const scroll = document.getElementById('timeline-scroll');
        const heads = [...table.querySelectorAll('thead th')].filter(
          (th) => th.getBoundingClientRect().width > 0
        );
        const titleIndex = heads.findIndex((th) => /title/i.test(th.textContent));
        const cells = [...table.querySelectorAll('#timeline-table-body tr')]
          .map((tr) => [...tr.children].filter((td) => td.getBoundingClientRect().width > 0))
          .filter((cs) => cs.length === heads.length);
        const clipped = (index) =>
          cells.filter((cs) => cs[index] && cs[index].scrollWidth > cs[index].clientWidth + 1)
            .length;
        return {
          width: w,
          columns: heads.map((th) => th.textContent.trim()),
          widths: heads.map((th) => Math.round(th.getBoundingClientRect().width)),
          title: titleIndex >= 0 ? Math.round(heads[titleIndex].getBoundingClientRect().width) : 0,
          titleClipped: titleIndex >= 0 ? clipped(titleIndex) : 0,
          tagsClipped: clipped(heads.findIndex((th) => /tags/i.test(th.textContent))),
          rows: cells.length,
          overflowX: scroll.scrollWidth - scroll.clientWidth,
          docOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      }, width)
    );
  }

  console.log('');
  console.log('  width | cols | title col | titles clipped | tags clipped | overflow');
  for (const r of rows) {
    console.log(
      `  ${String(r.width).padStart(5)} | ${String(r.columns.length).padStart(4)} | ` +
        `${String(r.title).padStart(9)} | ${String(`${r.titleClipped}/${r.rows}`).padStart(14)} | ` +
        `${String(`${r.tagsClipped}/${r.rows}`).padStart(12)} | ${r.overflowX}px`
    );
    console.log(`        ${r.columns.join(', ')}`);
    console.log(`        ${r.widths.join(', ')}`);
  }

  const at820 = rows.find((r) => r.width === 820);
  const at1440 = rows.find((r) => r.width === 1440);
  check(
    '820 the title column is wide enough to read a title in',
    at820.title >= 160,
    `${at820.title}px at 820 against ${at1440.title}px at 1440`
  );
  check(
    '820 most titles are not cut off',
    at820.titleClipped <= at820.rows / 2,
    `${at820.titleClipped} of ${at820.rows} titles clipped`
  );
  const at700 = rows.find((r) => r.width === 700);
  check(
    '700 the title column survives the narrow half of the band too',
    at700.title >= 160 && at700.titleClipped <= at700.rows / 2,
    `${at700.title}px, ${at700.titleClipped} of ${at700.rows} clipped`
  );
  for (const r of rows) {
    check(
      `${r.width} no horizontal scroll`,
      r.overflowX <= 0 && r.docOverflowX <= 0,
      `box=${r.overflowX}px doc=${r.docOverflowX}px`
    );
  }
  console.log(fails.length ? `FAILED: ${fails.join(', ')}` : 'all checks passed');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
