// **The map's View menu, measured** (MINDMAP_PLAN.md, the professional
// refinement row in agent-remaining/OPEN.md: "the map's View menu is 714px
// tall"). DESIGN.md's recipe index: a menu past five rows is grouped by a
// hairline, not by a printed heading over every group, because the headings
// are what make a ten-row menu seventeen rows tall. This opens View on a map
// and on a board, and asserts the height fits the window with room to spare,
// no printed group headings, a hairline between groups, and no row that is
// only a second copy of a control already on screen.
//
//   BASE=http://127.0.0.1:8795 SCRATCH=/tmp/mm-agentM \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapviewmenu.js
const { boot, OUT } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}
//: Half the 900px window: a menu taller than that covers most of the canvas
//: it is a view of, which is the complaint.
const CEILING = 450;

(async () => {
  const { browser, page } = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
  });
  await page.waitForTimeout(400);

  const measure = async () => {
    await page.click('[aria-controls="wb-view-menu"]');
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const menu = document.getElementById("wb-view-menu");
      const b = menu.getBoundingClientRect();
      const shown = (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
      const headings = [...menu.querySelectorAll(".wb-panel-group-label")].filter(shown).length;
      const rows = [...menu.querySelectorAll(".wb-menu-item, .wb-menu-row")].filter(shown);
      const sections = [...menu.querySelectorAll(".wb-menu-section")].filter(shown);
      // The group at the head of the second column (Panels) starts a column,
      // not a run, so it carries no rule; every other group after the first does.
      const ruled = sections.slice(1).filter((s) => s.getAttribute("aria-label") !== "Panels");
      const hairlines = ruled.filter((s) => parseFloat(getComputedStyle(s).borderTopWidth) > 0).length;
      const expected = ruled.length;
      return {
        height: Math.round(b.height), scroll: menu.scrollHeight > menu.clientHeight + 1,
        headings, rows: rows.length, sections: sections.length, hairlines, expected,
        texts: rows.map((r) => r.textContent.trim().replace(/\s+/g, " ")),
      };
    });
    if (process.env.SHOT) {
      const clip = await page.evaluate(() => {
        const r = document.getElementById("wb-view-menu").getBoundingClientRect();
        return { x: r.left - 8, y: r.top - 8, width: r.width + 16, height: r.height + 16 };
      });
      await page.screenshot({ path: `${OUT}/viewmenu-${Date.now()}.png`, clip });
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    return m;
  };

  await page.evaluate(async () => {
    const content = ["# View", "- Trunk", "  - A", "  - B"];
    const board = await apiJson("/whiteboard/boards/import", {
      method: "POST", body: JSON.stringify({ format: "markdown", content: content.join("\n"), name: "View" }),
    });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1200));
  });
  // The gesture strip: never over a map (the ring and the ? say the same).
  const strip = () => page.evaluate(() => {
    const s = document.getElementById("wb-gestures");
    const b = s.getBoundingClientRect();
    return { shown: !s.classList.contains("hidden") && b.width > 0, box: [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] };
  });
  await page.evaluate(() => { try { localStorage.removeItem("wbGesturesDismissed"); } catch {} wbGesturesDismissed = false; clearWbSelection(); });
  await page.waitForTimeout(300);
  const onMap = await strip();
  await page.evaluate(() => selectWbItem("object", wbMapIndex().roots[0].id));
  await page.waitForTimeout(500);
  const onMapSelected = await strip();
  const caption = await page.evaluate(() => document.querySelector(".wb-map-radial-caption")?.dataset.rest || "");
  check("no gesture strip over a map, selected topic or not", !onMap.shown && !onMapSelected.shown, JSON.stringify([onMap, onMapSelected]));
  check("the selected topic's ring names the keys instead", /Tab/.test(caption) && /Enter/.test(caption), caption);
  await page.evaluate(() => clearWbSelection());

  const map = await measure();
  console.log("    " + JSON.stringify(map));
  check(`the map's View menu is under ${CEILING}px`, map.height > 0 && map.height <= CEILING && !map.scroll, `${map.height}px, ${map.rows} rows`);
  check("its groups are hairlines, not printed headings", map.headings === 0 && map.hairlines === map.expected,
    `${map.headings} headings, ${map.hairlines} hairlines over ${map.sections} groups`);
  check("no zoom row that the zoom bar already shows", !map.texts.some((t) => /^Zoom in|^Zoom out/.test(t)), map.texts.filter((t) => /Zoom/.test(t)).join(" | "));

  await page.evaluate(async () => {
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `view ${Date.now()}`, type: "board" }) });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 900));
  });
  // On a board: only while a single note card is selected, and not over it.
  const cardId = await page.evaluate(async () => {
    const e = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "Hint card", category: "General" }) });
    const n = await apiJson("/whiteboard/nodes", { method: "POST", body: JSON.stringify({ entry_id: e.id, board_id: window.currentBoardId, x: 200, y: 200, z: 1 }) });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    clearWbSelection();
    return n.id;
  });
  await page.waitForTimeout(400);
  const idle = await strip();
  await page.evaluate((id) => selectWbItem("node", id), cardId);
  await page.waitForTimeout(500);
  const withCard = await strip();
  const cardBox = await page.evaluate((id) => {
    const b = document.querySelector(`.node-card[data-id="${id}"]`).getBoundingClientRect();
    return [b.left, b.top, b.right, b.bottom];
  }, cardId);
  const [sx, sy, sw, sh] = withCard.box;
  const overlaps = sx < cardBox[2] && sx + sw > cardBox[0] && sy < cardBox[3] && sy + sh > cardBox[1];
  check("on a board the strip waits for a selected card", !idle.shown && withCard.shown, JSON.stringify([idle, withCard]));
  check("and does not cover the card it is about", !overlaps, `strip ${withCard.box}, card ${cardBox.map(Math.round)}`);
  await page.evaluate(() => clearWbSelection());

  const board = await measure();
  console.log("    " + JSON.stringify(board));
  check(`a board's View menu is under ${CEILING}px too`, board.height > 0 && board.height <= CEILING && !board.scroll, `${board.height}px, ${board.rows} rows`);

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
