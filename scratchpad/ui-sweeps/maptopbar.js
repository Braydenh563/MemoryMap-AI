// MINDMAP_PLAN.md decision 16: the board's Insert and Arrange menus stay in
// the one top bar both kinds share, hidden on a map and found through their
// buttons.
//
// The tails list (scratchpad/wbmap-tails.md row 11) called their markup dead
// on a map. Measured on the base: it is the board's own, all 20 controls of it
// live on a board, so it is kept; what was wrong was the lookup. With Insert
// or Arrange open on a board (escaped to <body> at 1280x520) and a map opened
// without a click elsewhere, both toggles stayed drawn on the map. This sweep
// holds the hide on a map, the show on a board, the escaped case, and that
// the board's Insert still places a tool.
//
//   BASE=http://127.0.0.1:8857 SCRATCH=/tmp/x THEME=light \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/maptopbar.js
const { boot } = require("./lib.js");

let pass = 0;
let fail = 0;
function ok(label, good, detail) {
  if (good) pass += 1;
  else fail += 1;
  console.log(`${good ? "OK  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 520 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  const [boardId, mapId] = await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Top bar board" }) });
    const m = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Top bar map", type: "map" }) });
    return [b.id, m.id];
  });
  const shown = () =>
    page.evaluate(() => {
      const out = {};
      for (const id of ["wb-insert-menu", "wb-arrange-menu"]) {
        const t = document.querySelector(`.wb-topbar [aria-controls="${id}"]`);
        out[id] = Boolean(t && t.getClientRects().length && !t.closest("[hidden]"));
      }
      return out;
    });
  const open = async (id) => {
    await page.evaluate((bid) => openWhiteboardBoard(bid), id);
    await page.waitForTimeout(1400);
    await page.keyboard.press("Escape");
  };

  await open(mapId);
  let s = await shown();
  ok("a map draws neither Insert nor Arrange", !s["wb-insert-menu"] && !s["wb-arrange-menu"], JSON.stringify(s));
  await open(boardId);
  s = await shown();
  ok("a board draws both", s["wb-insert-menu"] && s["wb-arrange-menu"], JSON.stringify(s));

  for (const which of ["wb-insert-menu", "wb-arrange-menu"]) {
    await page.evaluate((w) => document.querySelector(`.wb-topbar [aria-controls="${w}"]`).click(), which);
    await page.waitForTimeout(300);
    const r = await page.evaluate(async (args) => {
      const [w, id] = args;
      const menu = document.getElementById(w);
      const escaped = menu.parentElement === document.body;
      await openWhiteboardBoard(id);
      await new Promise((res) => setTimeout(res, 1200));
      const t = document.querySelector(`.wb-topbar [aria-controls="${w}"]`);
      return {
        escaped,
        toggle: Boolean(t && t.getClientRects().length && !t.closest("[hidden]")),
        home: Boolean(menu.closest(".wb-board-menu-wrap")),
        closed: menu.classList.contains("hidden"),
      };
    }, [which, mapId]);
    ok(`${which} open on a board (escaped ${r.escaped}), then a map: its toggle is not drawn`, !r.toggle, JSON.stringify(r));
    ok(`and the menu is closed and back in its wrap`, r.closed && r.home, JSON.stringify(r));
    await open(boardId);
  }

  // The board's Insert still works after a map has hidden it twice.
  await page.evaluate(() => document.querySelector('.wb-topbar [aria-controls="wb-insert-menu"]').click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#wb-insert-menu [data-wb-insert="rect"]').click());
  await page.waitForTimeout(300);
  const tool = await page.evaluate(() => document.querySelector('#wb-tool-group [data-tool="rect"]')?.classList.contains("active") || wbState.tool);
  ok("the board's Insert still picks a tool", tool === true || tool === "rect", String(tool));

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`${pass} ok, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
