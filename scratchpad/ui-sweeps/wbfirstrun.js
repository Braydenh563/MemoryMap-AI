// The owner, 2026-10-10: "also si there meant to be a default board??"; INBOX
// 739: "auto naming of the whiteboards, mindmaps ... like "untitled #" so the
// user isnt forced to name a new object". WHITEBOARD_PLAN decision 38. Run on
// a FRESH data dir: the Boards & maps tab is its empty state with New board
// and New mind map; New mind map opens the gallery on the map kind with
// "Untitled map 1" as the name's placeholder; Create with the name empty makes
// it; the next is "Untitled map 2"; the picker offers no empty Default board.
//   (fresh data dir) BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbfirstrun.js
const { boot } = require("./lib.js");
let fails = 0, passes = 0;
const check = (ok, what, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}${detail ? "  " + detail : ""}`); ok ? passes++ : fails++; };
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluate(() => document.getElementById("recovery-key-dialog")?.close());
  await page.waitForTimeout(300);
  await page.click('[data-tab="library"]'); await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1800);
  const before = await page.evaluate(async () => (await apiJson("/whiteboard/boards")).filter((b) => b.id != null).length);
  const empty = await page.evaluate(() => {
    const el = document.getElementById("library-boards-empty");
    const shown = el && !el.classList.contains("hidden") && el.offsetParent !== null;
    return { shown, actions: [...(el?.querySelectorAll("button") || [])].map((b) => b.textContent.trim()) };
  });
  check(before > 0 || (empty.shown && empty.actions.includes("New board") && empty.actions.includes("New mind map")), "an empty Boards & maps tab offers New board and New mind map", JSON.stringify({ before, ...empty }));
  const make = async (action) => {
    if (action === "new-map" && !(await page.evaluate(() => Boolean(document.querySelector("#library-boards-empty:not(.hidden) #library-boards-new-map"))))) {
      await page.evaluate(() => { createNewBoard("map", { reveal: true }); });
    } else if (action === "new-map") {
      await page.click("#library-boards-new-map");
    } else {
      await page.evaluate(() => { createNewBoard("board", { reveal: true }); });
    }
    await page.waitForTimeout(900);
    const dialog = await page.evaluate(() => {
      const d = document.getElementById("wb-template-dialog");
      const tab = d?.querySelector('#wb-template-kind [aria-selected="true"]')?.dataset.value;
      return { open: Boolean(d?.open), tab, placeholder: document.getElementById("wb-template-name")?.placeholder, value: document.getElementById("wb-template-name")?.value };
    });
    await page.evaluate(() => { const f = document.getElementById("wb-template-name"); f.focus(); });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1500);
    const made = await page.evaluate(() => (window.wbLastCreatedBoard || null) && { title: window.wbLastCreatedBoard.title, id: window.wbLastCreatedBoard.id, current: window.currentBoardId });
    return { dialog, made };
  };
  let r = await make("new-map");
  check(r.dialog.open && r.dialog.tab === "map" && /^Untitled map \d+$/.test(r.dialog.placeholder), "New mind map opens the gallery on Mind map, the name to be shown as its placeholder", JSON.stringify(r.dialog));
  const firstName = r.dialog.placeholder;
  check(r.made && r.made.title === firstName, "Create with the name empty makes it under that name", JSON.stringify(r.made));
  await page.evaluate(() => wbShowBoardsLanding());
  await page.waitForTimeout(800);
  r = await make("new-map");
  const n = Number(firstName.split(" ").pop());
  check(r.made && r.made.title === `Untitled map ${n + 1}`, "the next one takes the next number", JSON.stringify({ first: firstName, second: r.made?.title }));
  r = await make("new-board");
  check(r.dialog.tab === "board" && /^Untitled board \d+$/.test(r.made?.title || ""), "a board is numbered on its own", JSON.stringify({ dialog: r.dialog, made: r.made }));
  const picker = await page.evaluate(async () => {
    await refreshBoardList?.();
    const select = document.getElementById("wb-board-select") || document.querySelector("select[id*='board']");
    return [...(select?.options || [])].map((o) => o.textContent);
  });
  const defaultEmpty = await page.evaluate(async () => { const d = (await apiJson("/whiteboard/boards")).find((b) => b.id == null); return d ? d.node_count + d.sketch_count + d.object_count : -1; });
  check(defaultEmpty !== 0 || !picker.some((t) => /Default board/.test(t)), "the picker offers no empty Default board", JSON.stringify({ defaultEmpty, picker }));
  check(!errors.length, "no page errors", errors.join(" | ").slice(0, 300));
  console.log(`${passes}/${passes + fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
