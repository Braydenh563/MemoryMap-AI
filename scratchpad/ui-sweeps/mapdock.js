// The map's own dock, and the two rules that keep a map from getting stuck
// (MINDMAP_PLAN.md §12.0 and §12.1 item 1).
//
// Drives a real Chromium against a running app and asserts numbers, not
// screenshots: which dock sections a board and a map each show, that every
// map control acts on the selection, that the last topic cannot be deleted at
// either delete door, and that an emptied map still offers a first topic.
//
//   BASE=http://127.0.0.1:8797 SCRATCH=/tmp/mm-shots \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapdock.js
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

async function newBoard(page, name, type) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  if (type === "map") await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

const liveSections = () =>
  [...document.querySelectorAll("#wb-tool-group .wb-tool-section")]
    .filter((s) => !s.hidden)
    .map((s) => s.getAttribute("aria-label"));

(async () => {
  const { browser, page } = await boot();

  // --- the split ------------------------------------------------------------
  await newBoard(page, "Sweep board", "board");
  const board = await page.evaluate(liveSections);
  check(
    "a board keeps the whiteboard sections",
    board.includes("Draw") && board.includes("Shapes") && !board.includes("Topics"),
    JSON.stringify(board)
  );

  await newBoard(page, "Sweep map", "map");
  const map = await page.evaluate(liveSections);
  check(
    "a map drops draw, shapes and the free adds",
    !map.includes("Draw") && !map.includes("Shapes") && !map.includes("Add"),
    JSON.stringify(map)
  );
  check("a map gains its own topic and branch sections",
    map.includes("Topics") && map.includes("Branch"), JSON.stringify(map));
  check("move, connect and edit stay shared",
    map.includes("Select and move") && map.includes("Connect") && map.includes("Edit"));

  const tool = await page.evaluate(() => {
    wbSelectToolRef("draw");
    wbSyncMapChrome();
    return window.currentTool;
  });
  check("a board-only tool does not survive into a map", tool === "select", tool);

  // --- the controls, against the selection ---------------------------------
  const idle = await page.evaluate(() => {
    clearWbSelection();
    wbSyncMapToolState();
    const d = (id) => document.getElementById(id).disabled;
    return { root: d("wb-map-add-root"), child: d("wb-map-add-child"), sib: d("wb-map-add-sibling") };
  });
  check("with nothing selected only Add topic is live",
    idle.root === false && idle.child && idle.sib, JSON.stringify(idle));

  const roots = await page.evaluate(() => wbMapIndex().roots.length);
  await page.click("#wb-map-add-root");
  await page.waitForTimeout(1300);
  await page.keyboard.press("Escape");
  const roots2 = await page.evaluate(() => wbMapIndex().roots.length);
  check("Add topic adds a second trunk", roots2 === roots + 1, `${roots} -> ${roots2}`);

  await page.evaluate(() => selectWbItem("object", wbMapIndex().roots[0].id));
  await page.waitForTimeout(300);
  await page.click("#wb-map-add-child");
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");
  const kids = await page.evaluate(() => {
    const i = wbMapIndex();
    return (i.childrenOf.get(i.roots[0].id) || []).length;
  });
  check("Add child grows the selected topic", kids === 1, String(kids));

  await page.evaluate(() => {
    const i = wbMapIndex();
    selectWbItem("object", i.childrenOf.get(i.roots[0].id)[0].id);
  });
  await page.click("#wb-map-add-sibling");
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");
  const kids2 = await page.evaluate(() => {
    const i = wbMapIndex();
    return (i.childrenOf.get(i.roots[0].id) || []).length;
  });
  check("Add sibling adds beside it", kids2 === 2, String(kids2));

  await page.evaluate(() => selectWbItem("object", wbMapIndex().roots[0].id));
  await page.click("#wb-map-collapse");
  await page.waitForTimeout(900);
  const folded = await page.evaluate(() => ({
    collapsed: Boolean(wbMapIndex().roots[0].data?.collapsed),
    icon: document.getElementById("wb-map-collapse-icon").className,
  }));
  check("collapse folds the branch and flips the caret",
    folded.collapsed && folded.icon.includes("right"), JSON.stringify(folded));
  await page.click("#wb-map-collapse");
  await page.waitForTimeout(900);

  // Branch colour: a topic inside a branch carries its colour down and onto
  // the edge; a trunk colours only its own card (§12.0, and the pair of
  // checks at the end of this file).
  const trunk = await page.evaluate(() => {
    selectWbItem("object", wbMapIndex().roots[0].id);
    wbSyncMapToolState();
    const el = document.getElementById("wb-map-branch-color");
    return { disabled: el.disabled, title: el.title };
  });
  check("a trunk's picker says it colours the trunk alone",
    trunk.disabled === false && /trunk colours its own card/.test(trunk.title),
    JSON.stringify(trunk));
  await page.evaluate(async () => {
    const i = wbMapIndex();
    await wbMapAddChild(i.childrenOf.get(i.roots[0].id)[0].id);
  });
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const i = wbMapIndex();
    selectWbItem("object", i.childrenOf.get(i.roots[0].id)[0].id);
    wbSyncMapToolState();
    const el = document.getElementById("wb-map-branch-color");
    el.value = "#b5179e";
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(1200);
  const colour = await page.evaluate(() => {
    const i = wbMapIndex();
    const c = wbMapColors(i);
    const kid = i.childrenOf.get(i.roots[0].id)[0];
    const edge = document.querySelector(`.wb-map-edge[data-child="${kid.id}"]`);
    return {
      stored: kid.data?.color,
      grandkid: c.get(i.childrenOf.get(kid.id)[0].id),
      edge: edge ? getComputedStyle(edge).stroke : "none",
    };
  });
  check("branch colour carries down and paints the edge",
    colour.stored === "#b5179e" && colour.grandkid === "#b5179e"
      && colour.edge === "rgb(181, 23, 158)",
    JSON.stringify(colour));

  await page.evaluate(() => selectWbItem("object", wbMapIndex().roots[0].id));
  await page.click("#wb-map-focus-here");
  await page.waitForTimeout(800);
  const focused = await page.evaluate(() => Boolean(wbMapFocusState));
  await page.click("#wb-map-focus-here");
  await page.waitForTimeout(600);
  const unfocused = await page.evaluate(() => Boolean(wbMapFocusState));
  check("focus turns on and off from the same button", focused && !unfocused);

  // --- a map is never stuck -------------------------------------------------
  await newBoard(page, "Sweep policy", "map");
  const rootId = await page.evaluate(() => wbMapIndex().roots[0].id);
  await page.evaluate((id) => wbMapDeleteSubtree(id), rootId);
  await page.waitForTimeout(900);
  const kept = await page.evaluate(() => (wbState.objects || []).length);
  check("the last topic survives Delete", kept === 1, String(kept));
  const refused = await page.evaluate((id) => {
    selectWbItem("object", id);
    deleteWbSelection();
    return true;
  }, rootId);
  await page.waitForTimeout(900);
  const kept2 = await page.evaluate(() => (wbState.objects || []).length);
  check("and survives the generic object delete too", refused && kept2 === 1, String(kept2));

  // Empty the map the only way that can: through the API, as the toast's own
  // "Clear the map" does, then look for the way back.
  await page.evaluate(async () => {
    for (const o of [...(wbState.objects || [])]) {
      await window.apiJson(`/whiteboard/objects/${o.id}`, { method: "DELETE" });
    }
    wbState.objects = [];
    renderWhiteboardNow();
    wbSyncMapChrome();
  });
  await page.waitForTimeout(800);
  const emptyPanel = await page.evaluate(() => {
    const el = document.getElementById("wb-map-empty");
    const r = el.getBoundingClientRect();
    return {
      shown: !el.hidden && r.width > 0,
      w: Math.round(r.width),
      h: Math.round(r.height),
      whiteboardHelp: !document.getElementById("wb-empty-hint").classList.contains("hidden"),
    };
  });
  check("an emptied map offers a first topic, not the whiteboard's help",
    emptyPanel.shown && !emptyPanel.whiteboardHelp, JSON.stringify(emptyPanel));
  await page.click("#wb-map-empty-add");
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  const back = await page.evaluate(() => ({
    n: (wbState.objects || []).length,
    hidden: document.getElementById("wb-map-empty").hidden,
  }));
  check("and the action brings the map back", back.n === 1 && back.hidden, JSON.stringify(back));

  // --- the two decisions of §12.0 (Space, and a trunk's own colour) --------
  await newBoard(page, "Sweep keys", "map");
  await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    await wbMapAddChild(root.id);
  });
  await page.waitForTimeout(1600);
  await page.keyboard.press("Escape");

  // A trunk colours its own card and does not cascade: its children are the
  // first-level topics and keep their palette entries (Coggle's rule).
  const trunkColour = await page.evaluate(async () => {
    const i0 = wbMapIndex();
    const root = i0.roots[0];
    root.data = { ...root.data, color: "#118844" };
    await wbSaveObject(root);
    renderWhiteboardNow();
    const i = wbMapIndex();
    const kid = i.childrenOf.get(root.id)[0];
    const colors = wbMapColors(i);
    const card = document.querySelector(`.wb-object[data-id="${root.id}"] .wb-map-node`)
      || document.querySelector(`.wb-object[data-id="${root.id}"]`);
    return {
      root: colors.get(root.id),
      kid: colors.get(kid.id),
      painted: card ? getComputedStyle(card).getPropertyValue("--wb-branch").trim() : "",
    };
  });
  check("a trunk's own colour paints its card and does not cascade",
    trunkColour.root === "#118844" && trunkColour.kid !== "#118844"
      && trunkColour.painted === "#118844",
    JSON.stringify(trunkColour));
  const pickerLive = await page.evaluate(() => {
    selectWbItem("object", wbMapIndex().roots[0].id);
    wbSyncMapToolState();
    const el = document.getElementById("wb-map-branch-color");
    return { disabled: el.disabled, title: el.title };
  });
  check("and the picker is live on a trunk, saying what it colours",
    pickerLive.disabled === false && /trunk colours its own card/.test(pickerLive.title),
    JSON.stringify(pickerLive));

  // C folds the selected branch; Space still pans the canvas.
  await page.evaluate(() => {
    selectWbItem("object", wbMapIndex().roots[0].id);
    document.getElementById("whiteboard-container").focus();
  });
  await page.keyboard.press("c");
  await page.waitForTimeout(900);
  const folded2 = await page.evaluate(() => Boolean(wbMapIndex().roots[0].data?.collapsed));
  await page.keyboard.press("c");
  await page.waitForTimeout(900);
  const unfolded2 = await page.evaluate(() => Boolean(wbMapIndex().roots[0].data?.collapsed));
  check("C folds the selected branch and C again opens it", folded2 && !unfolded2,
    `${folded2} -> ${unfolded2}`);

  await page.keyboard.down("Space");
  await page.waitForTimeout(200);
  const panning = await page.evaluate(() =>
    document.getElementById("whiteboard-container").classList.contains("wb-space-pan"));
  await page.keyboard.up("Space");
  check("Space with the canvas focused is still the pan", panning === true, String(panning));

  // Space on the fold control itself folds, which is §12.1 item 7's "and on
  // Space" without taking the pan away from the canvas.
  const chevronFold = await page.evaluate(() => {
    const root = wbMapIndex().roots[0];
    const el = document.querySelector(`.wb-object[data-id="${root.id}"] .wb-map-collapse`);
    if (!el || el.hidden) return null;
    el.focus();
    return document.activeElement === el;
  });
  await page.keyboard.press("Space");
  await page.waitForTimeout(1000);
  const afterSpace = await page.evaluate(() => ({
    collapsed: Boolean(wbMapIndex().roots[0].data?.collapsed),
    panning: document.getElementById("whiteboard-container").classList.contains("wb-space-pan"),
  }));
  check("Space on a node's chevron folds it instead of panning",
    chevronFold === true && afterSpace.collapsed && !afterSpace.panning,
    JSON.stringify(afterSpace));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
