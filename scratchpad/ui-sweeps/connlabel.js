// INBOX 819 (part 1): a selected connector's bar has a visible Label button;
// pressing it opens the label editor, the label renders on the line and
// survives a reload.
const { boot, openBoardsTab } = require("./lib.js");
(async () => {
  let fails = 0;
  const bad = (m) => { fails++; console.log("FAIL", m); };
  for (const [W, H] of [[1440, 900], [390, 844]]) {
    const { browser, page } = await boot({ viewport: { width: W, height: H } });
    await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
    await openBoardsTab(page);
    const ids = await page.evaluate(async () => {
      const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Conn " + Date.now() }) });
      await openWhiteboardBoard(b.id); await new Promise((r) => setTimeout(r, 1500));
      const a = await wbCreateObject("text", { content: "A" }, 0, 0, 120, 40, 1);
      const c = await wbCreateObject("text", { content: "B" }, 400, 200, 120, 40, 2);
      const made = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ board_id: b.id, x: 0, y: 0, z: 3, data: JSON.stringify({ type: "link-straight", sourceId: a.id, sourceKind: "object", targetId: c.id, targetKind: "object", color: "#888888", width: 3, endCap: "arrow" }) }) });
      await fetchWhiteboardState(); renderWhiteboardNow(); await new Promise((r) => setTimeout(r, 600));
      wbZoomToFit({ animate: false }); await new Promise((r) => setTimeout(r, 500));
      selectWbItem("sketch", made.id); await new Promise((r) => setTimeout(r, 500));
      return { board: b.id, link: made.id };
    });
    const vis = await page.evaluate(() => { const b = document.getElementById("wb-prop-label"); const r = b.getBoundingClientRect(); return { shown: !b.classList.contains("hidden") && r.width > 0, text: b.textContent.trim(), title: b.title, w: Math.round(r.width), h: Math.round(r.height) }; });
    console.log(W, "button", JSON.stringify(vis));
    if (!vis.shown || vis.text !== "Label") bad("button not shown");
    await page.click("#wb-prop-label"); await page.waitForTimeout(400);
    const editor = await page.evaluate(() => !!document.querySelector(".wb-link-label-editor"));
    if (!editor) bad("editor did not open");
    await page.keyboard.type("causes"); await page.keyboard.press("Enter"); await page.waitForTimeout(700);
    const drawn = () => page.evaluate((id) => document.querySelector(`.sketch-group[data-id="${id}"] .wb-link-label`)?.textContent, ids.link);
    console.log(W, "drawn", await drawn());
    if ((await drawn()) !== "causes") bad("label not drawn");
    await page.evaluate(async (ids) => { await openWhiteboardBoard(ids.board); await new Promise((r) => setTimeout(r, 1500)); }, ids);
    await page.evaluate(async (ids) => { await fetchWhiteboardState(); renderWhiteboardNow(); await new Promise((r) => setTimeout(r, 600)); }, ids);
    console.log(W, "after reload", await drawn());
    if ((await drawn()) !== "causes") bad("label lost on reload");
    await browser.close();
  }
  console.log(fails ? `FAIL: ${fails}` : "PASS");
  process.exit(fails ? 1 : 0);
})();
