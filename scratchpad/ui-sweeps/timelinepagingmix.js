// The Timeline's cursor against the merge it actually pages: notes, boards,
// documents and reminders, in the thousands.
//
// Why this exists as well as `timelinepaging.js`: that sweep proves the cursor
// at scale over ONE table (2,000 notes), and the per-source cursor the merge
// needs (`_encode_marks` in `api/routes_timeline.py`) was proved only by
// `tests/test_timeline.py` at three rows, one per source. Three rows cannot
// show the fault this shape has: a page whose rows all come from one source
// leaves the other sources' marks where they were, and an off-by-one there
// repeats or drops a row only once every few hundred.
//
// Seed a data dir with both scripts and serve THAT dir:
//   .venv/bin/python scratchpad/ui-sweeps/seed-timeline-bulk.py /tmp/mm-mix/memorymap.db 2000
//   .venv/bin/python scratchpad/ui-sweeps/seed-timeline-mixed.py /tmp/mm-mix/memorymap.db 600 600 40
//   bash scratchpad/ui-sweeps/serve.sh 8946 /tmp/mm-mix
//   BASE=http://127.0.0.1:8946 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=/tmp/claude-0 timeout 110 node scratchpad/ui-sweeps/timelinepagingmix.js
const { boot } = require('./lib.js');

let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`);
};

(async () => {
  const { browser, page, OUT } = await boot();
  page.on('pageerror', (e) => { failures += 1; console.log('PAGEERROR', e.message); });

  // --- the endpoint, paged to exhaustion ------------------------------------
  // Inside the page so the auth header is the app's own, and `days=0` so the
  // range is the whole notebook rather than a year of it.
  const walk = await page.evaluate(async () => {
    const headers = { 'X-Auth-Token': localStorage.getItem('token') || '' };
    const pageOf = async (kind, cursor) => {
      const url = `/timeline?days=0&limit=300${kind ? `&kind=${kind}` : ''}` +
        (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error(`${url} -> ${r.status}`);
      return r.json();
    };
    const all = async (kind) => {
      const keys = [];
      const order = [];
      let cursor = null;
      let requests = 0;
      for (;;) {
        const body = await pageOf(kind, cursor);
        const rows = body.rows || body.notes;
        requests += 1;
        for (const row of rows) { keys.push(row.key); order.push(row.at); }
        cursor = body.has_more ? body.next_cursor : null;
        if (!cursor || requests > 40) break;
      }
      return { keys, order, requests };
    };
    const merged = await all(null);
    const perKind = {};
    for (const kind of ['note', 'board', 'document', 'reminder']) {
      perKind[kind] = (await all(kind)).keys;
    }
    return { merged, perKind };
  });

  const merged = walk.merged.keys;
  const unique = new Set(merged);
  check('no row is served twice across the pages of the merge',
    unique.size === merged.length,
    `${merged.length} rows, ${unique.size} distinct, ${walk.merged.requests} requests`);

  // The truth to compare against: each source paged on its own. A per-source
  // cursor that advances a mark it should not have touched loses rows from
  // exactly one source, which a total count alone can hide.
  const expected = [].concat(...Object.values(walk.perKind));
  const missing = expected.filter((key) => !unique.has(key));
  const extra = merged.filter((key) => !expected.includes(key));
  check('the merge loses nothing the single-kind feeds hold',
    missing.length === 0,
    `${expected.length} expected, ${missing.length} missing${missing.length ? ': ' + missing.slice(0, 5).join(', ') : ''}`);
  check('and invents nothing', extra.length === 0, `${extra.length} unexpected`);
  const counts = Object.entries(walk.perKind).map(([k, v]) => `${k} ${v.length}`).join(', ');
  check('every kind is in the feed in bulk',
    Object.values(walk.perKind).every((keys) => keys.length > 20), counts);

  // Newest first, across page boundaries: the merge sorts inside a page, and a
  // cursor that let a later page hold a newer row would read as a jumbled feed
  // rather than as an error.
  const order = walk.merged.order;
  let inversions = 0;
  for (let i = 1; i < order.length; i += 1) {
    if (new Date(order[i]) > new Date(order[i - 1])) inversions += 1;
  }
  check('the feed is newest first across page boundaries', inversions === 0,
    `${inversions} inversion(s) over ${order.length} rows`);

  // --- the same thing in the view -------------------------------------------
  await page.evaluate(() => localStorage.removeItem('timeline-kinds'));
  await page.click('[data-tab="timeline"]');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const days = document.getElementById('timeline-days');
    days.value = '0';
    days.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(2500);

  for (let i = 0; i < 5; i += 1) {
    await page.evaluate(() => {
      const box = document.getElementById('timeline-scroll');
      box.scrollTop = box.scrollHeight;
    });
    await page.waitForTimeout(1200);
  }
  const drawn = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#timeline-feed .timeline-row')];
    return {
      count: rows.length,
      distinct: new Set(rows.map((li) => li.dataset.key)).size,
      kinds: [...new Set(rows.map((li) => li.dataset.kind))].sort(),
      boardTitle: (rows.find((li) => li.dataset.kind === 'board')?.textContent || '').trim().slice(0, 40),
    };
  });
  check('the view pages the merge without drawing a row twice',
    drawn.count > 1200 && drawn.count === drawn.distinct,
    `${drawn.count} rows drawn, ${drawn.distinct} distinct`);
  check('a board is a rendered row, not only a test fixture',
    drawn.kinds.includes('board'), `kinds drawn: ${drawn.kinds.join(', ')}, first board "${drawn.boardTitle}"`);

  await page.screenshot({ path: `${OUT}/timeline-paging-mix.png` });
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
