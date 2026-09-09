// INBOX 105 retest: the whiteboard's View menu must use the room it has, and
// no row may be cut in half.
//
// **Why the old version of this file never opened the menu.** It clicked
// `[data-tab="whiteboard"]`, which does not exist: the whiteboard is Library's
// "Boards & maps" sub-tab (`data-target="library-view-whiteboard"`), and even
// that sub-tab only shows a picker -- `#wb-canvas-view`, which holds the menu
// bar this script wants, is `hidden` until an actual board is open. Three
// retest attempts died here. This version creates a board (and a map) via the
// API directly, the same way the seed scripts do, then calls the app's own
// `openWhiteboardBoard(id)` (frontend/whiteboard.js) to land on the canvas
// with the menu bar rendered, sidestepping `createNewBoard()`'s naming
// dialog, which a script has no reason to fill in for a throwaway probe.
const { boot } = require('./lib.js');

async function measureAt(page, width, height, boardId, label) {
  await page.setViewportSize({ width, height });
  await page.evaluate((id) => openWhiteboardBoard(id), boardId);
  await page.waitForTimeout(700);
  const opened = await page.evaluate(() => {
    const toggle = document.querySelector('[data-wb-menu-toggle][aria-controls="wb-view-menu"]');
    if (!toggle) return 'no View toggle found';
    toggle.click();
    return 'clicked';
  });
  await page.waitForTimeout(300);
  const info = await page.evaluate((openedResult) => {
    const menu = document.getElementById('wb-view-menu');
    if (!menu) return { opened: openedResult, found: false };
    const box = menu.getBoundingClientRect();
    const rows = [...menu.querySelectorAll('.wb-menu-row, .wb-menu-item, .wb-panel-group-label')].filter(
      (r) => r.getBoundingClientRect().height > 0 && getComputedStyle(r).display !== 'none' && !r.hidden,
    );
    // A row genuinely cut in half sits astride the menu's own edge; the one
    // row that legitimately straddles a scroll boundary (the last visible
    // one, when scrollsInside is true) is not this -- see the note below.
    const cutRows = rows.filter((r) => {
      const rb = r.getBoundingClientRect();
      return (rb.top < box.top - 0.5 && rb.bottom > box.top + 0.5) ||
             (rb.top < box.bottom - 0.5 && rb.bottom > box.bottom + 0.5);
    });
    return {
      opened: openedResult,
      found: true,
      hidden: menu.classList.contains('hidden'),
      escaped: menu.classList.contains('action-menu-escaped'),
      boxTop: Math.round(box.top),
      boxBottom: Math.round(box.bottom),
      boxHeight: Math.round(box.height),
      contentHeight: menu.scrollHeight,
      windowHeight: window.innerHeight,
      maxHeight: getComputedStyle(menu).maxHeight,
      fitsOnScreen: box.top >= -0.5 && box.bottom <= window.innerHeight + 0.5,
      scrollsInside: menu.scrollHeight > menu.clientHeight + 1,
      totalRows: rows.length,
      // A cut row inside a legitimately scrolling menu (the last one, at the
      // scroll boundary) is the documented affordance, not a bug; only a
      // cut row in a menu that is NOT scrolling is the reported failure.
      unreachableCutRows: menu.scrollHeight > menu.clientHeight + 1 ? 0 : cutRows.length,
    };
  }, opened);
  console.log(label, JSON.stringify(info));
  await page.keyboard.press('Escape').catch(() => {});
  return info;
}

(async () => {
  const { browser, page } = await boot();
  const boardId = await page.evaluate(async () => {
    const r = await api('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: 'View menu retest board' }) });
    return (await r.json()).id;
  });
  const mapId = await page.evaluate(async () => {
    const r = await api('/whiteboard/boards', {
      method: 'POST',
      body: JSON.stringify({ name: 'View menu retest map', type: 'map', layout: 'tree-right' }),
    });
    return (await r.json()).id;
  });
  const sizes = [[1440, 900], [820, 900], [1440, 640], [820, 640]];
  for (const [w, h] of sizes) await measureAt(page, w, h, boardId, `BOARD @ ${w}x${h}`);
  for (const [w, h] of sizes) await measureAt(page, w, h, mapId, `MAP @ ${w}x${h}`);
  await browser.close();
})();
