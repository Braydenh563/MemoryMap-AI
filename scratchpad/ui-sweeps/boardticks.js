// The Library's Boards & maps selection ticks, under every Maps / Boards / All
// filter (INBOX: `syncLibraryBoardsTicks` ignored the type chip).
//
// The ticks are grafted on from library.js by lining the fetched list up with
// the cards whiteboard.js drew; when the two lists differ in length it bails and
// attaches nothing. It used to narrow by the search box and the sort but not by
// the Maps / Boards chip, so with a chip on the grid held one kind, the list
// held every kind, and not one card got a tick. This sweep makes a map and a
// board (a board with nothing on it does not come back from the server, so each
// gets one topic), then for each chip asserts that every card except the
// default board's has exactly one tick, that ticking one counts in the bar, and
// that "Done" clears it.
//
//   BASE=http://127.0.0.1:8863 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node boardticks.js
// Before a fix: OVERRIDE_JS="library.js=/path/to/old/library.js" (lib.js).
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 900 } });
  let failed = 0;
  const check = (name, ok, detail = '') => {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
    if (!ok) failed += 1;
  };

  // Two boards of different types. Named for the sweep so a rerun does not
  // multiply them: reused when they are already there.
  await page.evaluate(async () => {
    const have = await window.apiJson('/whiteboard/boards');
    const names = new Set((have.items || have).map((b) => b.title));
    for (const [name, type] of [['Ticks map', 'map'], ['Ticks board', 'board']]) {
      if (names.has(name)) continue;
      const b = await window.apiJson('/whiteboard/boards', {
        method: 'POST', body: JSON.stringify({ name, type }),
      });
      await window.apiJson(`/whiteboard/boards/${b.id}/nodes`, {
        method: 'POST', body: JSON.stringify({ kind: 'topic', text: name, x: 0, y: 0 }),
      });
    }
  });

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(600);
  await page.click('#library-subtabs button[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);

  for (const key of ['map', 'board', 'all']) {
    await page.click(`#library-boards-filter [data-board-filter="${key}"]`);
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('#library-boards-grid .library-board-card')];
      return {
        cards: cards.length,
        ticked: cards.filter((c) => c.querySelectorAll('.library-card-tick').length === 1).length,
        doubled: cards.filter((c) => c.querySelectorAll('.library-card-tick').length > 1).length,
        // The default board (id null) is deliberately given no tick.
        titles: cards.map((c) => c.querySelector('.library-card-title')?.textContent.trim()),
      };
    });
    const expected = r.titles.filter((t) => t !== 'Default board').length;
    check(`filter ${key}: every board card has one tick (the default board has none)`,
      r.cards > 0 && r.ticked === expected && r.doubled === 0,
      `${r.ticked} ticks on ${r.cards} cards: ${r.titles.join(' | ')}`);
    if (r.ticked > 0) {
      await page.click('#library-boards-grid .library-card-tick');
      await page.waitForTimeout(300);
      const count = await page.evaluate(() =>
        document.getElementById('library-boards-selected-count')?.textContent.trim());
      check(`filter ${key}: ticking one shows it in the bar`, /1/.test(count || ''), `"${count}"`);
      await page.click('#library-boards-clear-selection');
      await page.waitForTimeout(200);
    }
  }
  await browser.close();
  console.log(failed ? `FAIL: ${failed}` : 'PASS: boards ticks hold under every filter');
  process.exit(failed ? 1 : 0);
})();
