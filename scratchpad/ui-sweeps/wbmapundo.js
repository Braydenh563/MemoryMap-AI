// INBOX 445 (2), the second audit's open items, each driven with real keys:
//
//   1. Ctrl+Z after Delete on a branch brings its cross-links back, between
//      the restored topics (the server now hands the dropped links back).
//   2. The next Ctrl+Z after that restore is not stale: the restored topics
//      have new ids and the older history entries are rewritten to match.
//   3. Shift+Tab (outdent) is one undo step.
//   4. Undoing a create selects the parent.
//   5. Tab on the canvas only adds a topic once the map was engaged (a click
//      or a map key since focus arrived), so Tab can leave the map.
//
//   BASE=http://127.0.0.1:8802 SCRATCH=/tmp/mm-mm2-s \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbmapundo.js
const { boot } = require("./lib.js");

async function newBoard(page, name) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById("wb-boards-new").click());
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
}

let pass = 0;
let fail = 0;
function ok(label, good, detail) {
  if (good) pass += 1;
  else fail += 1;
  console.log(`${good ? "OK  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await newBoard(page, "Undo audit map");

  const seed = await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    const make = async (parentId, text) => (await wbMapCreateNode({ parentId, text })).id;
    const branch = await make(root.id, "Branch");
    const c1 = await make(branch, "Child one");
    const c2 = await make(branch, "Child two");
    const other = await make(root.id, "Other");
    const made = await apiJson("/whiteboard/sketches", {
      method: "POST",
      body: JSON.stringify({
        board_id: window.currentBoardId,
        data: JSON.stringify({
          type: "link-straight", sourceId: c1, sourceKind: "object", targetId: other, targetKind: "object", label: "ties",
        }),
      }),
    });
    wbState.sketches.push(made);
    await wbRefreshMapState();
    renderWhiteboardNow();
    wbUndoStack.length = 0;
    wbRedoStack.length = 0;
    return { root: root.id, branch, c1, c2, other };
  });
  await page.waitForTimeout(1000);

  const tree = () => page.evaluate(async () => {
    const t = await apiJson(`/whiteboard/boards/${window.currentBoardId}/tree`);
    return { links: t.cross_links, count: (function count(ns) { return ns.reduce((n, x) => n + 1 + count(x.children || []), 0); })(t.roots) };
  });
  const press = async (key, wait = 900) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(wait);
  };
  const click = async (id) => {
    await page.click(`.wb-object[data-id="${id}"]`);
    await page.waitForTimeout(250);
  };
  const idOf = (text) => page.evaluate((x) => (wbState.objects.find((o) => o.data && o.data.content === x) || {}).id, text);
  const failedToast = () => page.evaluate(() => /Couldn.t (undo|redo|restore)/.test(document.body.innerText));

  const t0 = await tree();
  ok("seeded: five topics and one cross-link", t0.count === 5 && t0.links.length === 1, JSON.stringify(t0));

  // SKIP12=1 jumps to items 3 to 5 (a baseline run of a build without the
  // fixes dies in item 2 on the stale ids it is measuring).
  if (!process.env.SKIP12) {
  // --- 1. Delete then Ctrl+Z brings the cross-link back --------------------
  await click(seed.branch);
  await press("Delete", 1200);
  const t1 = await tree();
  ok("Delete takes the branch and its cross-link", t1.count === 2 && t1.links.length === 0, JSON.stringify(t1));
  await press("Control+z", 3000);
  const t2 = await tree();
  const c1b = await idOf("Child one");
  ok("Ctrl+Z brings the topics back", t2.count === 5, JSON.stringify(t2));
  ok("and the cross-link, between the restored topic and the one outside", t2.links.length === 1
    && t2.links[0].from_id === c1b && t2.links[0].to_id === seed.other && t2.links[0].label === "ties", JSON.stringify(t2.links));
  const drawn = await page.evaluate(() => document.querySelectorAll(".wb-map-cross, .wb-link, [class*='cross-link']").length);
  console.log(`INFO elements matching a cross-link class after restore: ${drawn}`);

  // --- 2. The next Ctrl+Z is not stale -------------------------------------
  const xId = await page.evaluate(async (other) => (await wbMapCreateNode({ parentId: other, text: "Scratch" })).id, seed.other);
  // A later topic, so the deleted one is not the highest row: SQLite hands the
  // top rowid out again, and a restore would then reuse the old id by luck.
  const yId = await page.evaluate(async (root) => (await wbMapCreateNode({ parentId: root, text: "Later" })).id, seed.root);
  await page.evaluate(() => { wbRefreshMapState(); renderWhiteboardNow(); });
  await page.waitForTimeout(500);
  await click(xId);
  await press("Delete", 1200);
  await press("Control+z", 2500);
  const x2 = await idOf("Scratch");
  const stack = await page.evaluate(() => wbUndoStack.slice(-2).map((e) => `${e.action}:${e.id}`));
  ok("a restored topic has a new id", x2 && x2 !== xId, `${xId} -> ${x2}`);
  ok("the older create entry now names the new id", stack[0] === `create:${x2}` && stack[1] === `create:${yId}`, stack.join(" "));
  await press("Control+z", 1500);
  await press("Control+z", 1500);
  const gone = await idOf("Scratch");
  const goneLater = await idOf("Later");
  ok("two more Ctrl+Z take both away, with no error", !gone && !goneLater && !(await failedToast()), `scratch ${gone}; later ${goneLater}; error toast: ${await failedToast()}`);
  ok("and the server agrees", (await tree()).count === 5, JSON.stringify(await tree()));

  }

  // --- 3. Shift+Tab is one undo step ----------------------------------------
  const c2b = process.env.SKIP12 ? seed.c2 : await idOf("Child two");
  const branchB = process.env.SKIP12 ? seed.branch : await idOf("Branch");
  await page.evaluate(() => { wbUndoStack.length = 0; wbRedoStack.length = 0; });
  await click(c2b);
  const before = await page.evaluate(() => wbUndoStack.length);
  await press("Shift+Tab", 1500);
  const out = await page.evaluate((id) => ({ parent: wbState.objects.find((o) => o.id === id).parent_id, steps: wbUndoStack.length }), c2b);
  ok("Shift+Tab outdents the topic", out.parent === seed.root, JSON.stringify(out));
  ok("and pushes exactly one undo step", out.steps === before + 1, `${before} -> ${out.steps}`);
  await press("Control+z", 1500);
  const back = await page.evaluate((id) => wbState.objects.find((o) => o.id === id).parent_id, c2b);
  ok("one Ctrl+Z puts it back under its parent", back === branchB, `parent ${back}, want ${branchB}`);
  await press("Control+Shift+z", 1500);
  const again = await page.evaluate((id) => wbState.objects.find((o) => o.id === id).parent_id, c2b);
  ok("and Ctrl+Shift+Z outdents it again", again === seed.root, `parent ${again}`);
  await press("Control+z", 1500);

  // --- 4. Undoing a create selects the parent --------------------------------
  await page.evaluate(() => { wbUndoStack.length = 0; wbRedoStack.length = 0; });
  await click(seed.other);
  const nBefore = (await tree()).count;
  await press("Tab", 600);
  await page.keyboard.type("zz");
  await press("Enter", 900);
  const nMid = (await tree()).count;
  ok("Tab adds a child under the clicked topic", nMid === nBefore + 1, `${nBefore} -> ${nMid}`);
  let guard = 0;
  while ((await tree()).count !== nBefore && guard < 4) { await press("Control+z", 1200); guard += 1; }
  const sel = await page.evaluate(() => (wbSelectedItem ? wbSelectedItem.id : null));
  ok("undoing the create leaves the parent selected", (await tree()).count === nBefore && sel === seed.other, `selected ${sel}, parent ${seed.other}, ${guard} undos`);

  // --- 5. Tab can leave the map ----------------------------------------------
  await click(seed.other);
  await page.evaluate(() => document.querySelector("#wb-topbar button")?.focus());
  const n5 = (await tree()).count;
  await press("Tab", 800);
  const n5b = (await tree()).count;
  ok("Tab from another control with a topic selected adds nothing", n5b === n5, `${n5} -> ${n5b}`);
  // Walk focus into the canvas with Shift+Tab from the top bar, as a keyboard
  // user does (the canvas is a stop just before it in the page).
  await page.evaluate(() => document.querySelector("#wb-topbar button")?.focus());
  let reached = false;
  for (let i = 0; i < 30 && !reached; i += 1) {
    await page.keyboard.press("Shift+Tab");
    reached = await page.evaluate(() => document.activeElement && document.activeElement.id === "whiteboard-container");
  }
  ok("Shift+Tab reaches the canvas", reached);
  const n6 = (await tree()).count;
  await press("Tab", 800);
  const after = await page.evaluate(() => ({ id: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }));
  ok("the Tab that arrived did not add a topic, and the next one moves focus on", (await tree()).count === n6 && after.id !== "whiteboard-container", `topics ${n6} -> ${(await tree()).count}; focus now ${after.id}`);
  // Back onto the canvas, then engage the map with a key: Tab adds again.
  await page.evaluate(() => document.querySelector("#wb-topbar button")?.focus());
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press("Shift+Tab");
    if (await page.evaluate(() => document.activeElement && document.activeElement.id === "whiteboard-container")) break;
  }
  const onCanvas = await page.evaluate(() => document.activeElement && document.activeElement.id === "whiteboard-container");
  await press("ArrowLeft", 300);
  await press("ArrowRight", 300);
  const n7 = (await tree()).count;
  await press("Tab", 900);
  await page.keyboard.type("yy");
  await press("Enter", 900);
  ok("after a map key, Tab adds a topic again", onCanvas && (await tree()).count === n7 + 1, `on canvas ${onCanvas}; ${n7} -> ${(await tree()).count}`);

  console.log(`page errors: ${errors.length}${errors.length ? " " + errors.join(" | ") : ""}`);
  console.log(`${pass} ok, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
