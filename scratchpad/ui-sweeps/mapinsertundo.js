// **Insert-between is one Undo step that puts the branch back** (INBOX 537,
// the owner: a + pressed on a map line by mistake, Ctrl+Z "undid most of it,
// but the link from the parent node to the rest of the branch disappeared").
// Root > A > B; press the + on the line Root-A; Ctrl+Z; the map must be
// Root > A > B again with nothing else; Ctrl+Y brings the inserted topic back
// between them; Ctrl+Z again restores. Then a drag of A keeps A on the board.
//   BASE=http://127.0.0.1:8788 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapinsertundo.js
const { boot } = require("./lib.js");
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
  });
  const board = await page.evaluate(async () => apiJson("/whiteboard/boards/import", {
    method: "POST", body: JSON.stringify({ format: "markdown", content: "# Undo map\n- Root\n  - Alpha\n    - Beta", name: "Undo map " + Date.now() }),
  }));
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, board.id);
  await page.waitForTimeout(1800);
  const shape = () => page.evaluate(() => {
    const idx = wbMapIndex();
    const name = (n) => (n ? String(wbMapLabel(n) || "").trim() : null);
    const byId = idx.byId;
    return idx.nodes.map((n) => `${name(n)}<${name(byId.get(n.parent_id)) ?? "-"}`).sort().join(" | ");
  });
  const before = await shape();
  check("the map starts as Root > Alpha > Beta", /Alpha<Root/.test(before) && /Beta<Alpha/.test(before), before);
  const ids = await page.evaluate(() => {
    const idx = wbMapIndex();
    const root = idx.roots[0];
    const a = (idx.childrenOf.get(root.id) || [])[0];
    return { root: root.id, a: a.id };
  });
  await page.evaluate(async ({ root, a }) => { await wbMapInsertBetween(root, a); }, ids);
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const inserted = await shape();
  check("the + put a topic between Root and Alpha", /Alpha<New topic/.test(inserted) && /New topic<Root/.test(inserted), inserted);
  await page.evaluate(async () => { await wbUndo(); });
  await page.waitForTimeout(700);
  const undone = await shape();
  check("one Undo restores the map exactly", undone === before, undone);
  await page.evaluate(async () => { await wbRedo(); });
  await page.waitForTimeout(900);
  const redone = await shape();
  check("Redo puts the topic back between them", /Alpha<New topic/.test(redone) && /New topic<Root/.test(redone), redone);
  await page.evaluate(async () => { await wbUndo(); });
  await page.waitForTimeout(900);
  const again = await shape();
  check("Undo after Redo restores again", again === before, again);
  // The server agrees (a reload is the truth).
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, board.id);
  await page.waitForTimeout(1500);
  const reloaded = await shape();
  check("the saved map is the original after a reload", reloaded === before, reloaded);
  // A loose branch (a second root, which the old Undo left behind) dragged
  // with the mouse stays on the board and keeps its child.
  const loose = await page.evaluate(async (boardId) => {
    const idx = wbMapIndex();
    const alpha = idx.nodes.find((n) => String(wbMapLabel(n)).trim() === "Alpha");
    await apiJson(`/whiteboard/boards/${boardId}/nodes/${alpha.id}/move`, { method: "PUT", body: JSON.stringify({ parent_id: null }) });
    await openWhiteboardBoard(boardId);
    await new Promise((r) => setTimeout(r, 1200));
    const el = document.querySelector(`#wb-html-layer .wb-map-node[data-id="${alpha.id}"]`);
    if (!el) return null;
    wbCenterOn(wbItemBBox("object", alpha.id), { animate: false, minScale: 1 });
    await new Promise((r) => setTimeout(r, 300));
    const b = el.getBoundingClientRect();
    return { id: alpha.id, x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, board.id);
  if (loose) {
    await page.mouse.move(loose.x, loose.y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(loose.x + i * 12, loose.y + i * 8);
    await page.mouse.up();
    await page.waitForTimeout(1200);
    const after = await page.evaluate((id) => ({
      inState: (wbState.objects || []).some((o) => o.id === id),
      drawn: !!document.querySelector(`#wb-html-layer .wb-map-node[data-id="${id}"]`),
    }), loose.id);
    const shapeNow = await shape();
    check("a dragged loose branch stays on the board with its child", after.inState && after.drawn && /Beta<Alpha/.test(shapeNow), JSON.stringify(after) + " " + shapeNow);
    await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, board.id);
    await page.waitForTimeout(1200);
    const saved = await shape();
    check("and is still there after a reload", /Beta<Alpha/.test(saved) && /Alpha</.test(saved), saved);
  } else check("the loose branch is drawn", false);
  await browser.close();
  const failed = results.filter((r) => !r).length;
  console.log(`${results.length - failed}/${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
