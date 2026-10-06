// FEAT-02 debug: one Tab, one name, every write's status and body.
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot();
  const writes = [];
  page.on("response", async (r) => {
    const req = r.request();
    if (!/whiteboard/.test(req.url()) || req.method() === "GET") return;
    let body = "";
    try { body = r.status() >= 400 ? await r.text() : ""; } catch (e) {}
    writes.push(`${req.method()} ${req.url().replace(/.*whiteboard/, "")} ${r.status()} ${r.status() >= 400 ? (req.postData() || "").slice(0, 300) + " => " + body.slice(0, 300) : ""}`);
  });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# D\n\n- Centre\n  - A\n  - B" }) });
    await openWhiteboardBoard(b.id);
    await wbMapTidyFresh();
    const a = wbState.objects.find((o) => o.data.content === "A");
    selectWbItem("object", a.id);
    document.activeElement?.blur?.();
  });
  await page.waitForTimeout(500);
  await page.keyboard.press("Tab");
  await page.keyboard.type("Child one");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  await page.keyboard.press("Enter");
  await page.keyboard.type("Sibling two");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  const state = await page.evaluate(async () => {
    const tree = await apiJson(`/whiteboard/boards/${window.currentBoardId}/tree`);
    const walk = (nodes, d = 0) => nodes.flatMap((n) => [`${"  ".repeat(d)}${n.text}`, ...walk(n.children, d + 1)]);
    return { tree: walk(tree.roots), undo: wbUndoStack.map((e) => `${e.action}:${e.id}`), focus: document.activeElement?.id || document.activeElement?.tagName, announcer: document.getElementById("wb-announcer")?.textContent };
  });
  console.log(writes.join("\n"));
  console.log(JSON.stringify(state, null, 1));
  await browser.close();
})();
