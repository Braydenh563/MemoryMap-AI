// INBOX 824: Layers says what a tinted row means ("N selected on the board"
// with Clear), and a frame's items nest under its row, indented and collapsible.
// Board: one frame holding 3 text boxes, 2 more outside it.
const { boot, openBoardsTab } = require("./lib.js");
(async () => {
  let fails = 0;
  const bad = (m) => { fails++; console.log("FAIL", m); };
  for (const [W, H] of [[1440, 900], [390, 844]]) {
    const { browser, page } = await boot({ viewport: { width: W, height: H } });
    await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
    await openBoardsTab(page);
    await page.evaluate(async () => {
      const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Layers " + Date.now() }) });
      await openWhiteboardBoard(b.id); await new Promise((r) => setTimeout(r, 1500));
      await wbCreateObject("frame", { content: "Frame A" }, 0, 0, 600, 400, 1);
      for (const [i, [x, y]] of [[40, 40], [200, 120], [320, 220]].entries()) await wbCreateObject("text", { content: `In ${i + 1}` }, x, y, 120, 40, 2 + i);
      for (const [i, [x, y]] of [[800, 40], [800, 200]].entries()) await wbCreateObject("text", { content: `Out ${i + 1}` }, x, y, 120, 40, 6 + i);
      await fetchWhiteboardState?.(); renderWhiteboardNow(); await new Promise((r) => setTimeout(r, 600));
      wbMultiSelection.clear();
      for (const o of wbState.objects.filter((o) => /^(In 1|Out 1)$/.test(o.data?.content || ""))) wbMultiSelection.add(wbMultiKey("object", o.id));
    });
    if (W < 600) await page.click("#wb-sidebar-open, [data-wb-sidebar-open]").catch(() => {});
    await page.click('[data-side-tab="layers"]').catch(async () => { await page.evaluate(() => document.getElementById("wb-side-tab-layers").click()); });
    await page.waitForTimeout(500);
    await page.evaluate(() => wbRenderLayers());
    const r = await page.evaluate(() => {
      const tree = document.getElementById("wb-layers-tree");
      const rows = [...tree.querySelectorAll("[role=treeitem]")];
      const frame = rows.find((x) => x.classList.contains("has-held"));
      const held = rows.filter((x) => x.classList.contains("is-held"));
      const pad = (e) => parseFloat(getComputedStyle(e).paddingLeft);
      const sel = rows.filter((x) => x.getAttribute("aria-selected") === "true");
      const selBg = sel[0] ? getComputedStyle(sel[0]).backgroundColor : null;
      const plain = rows.find((x) => x.getAttribute("aria-selected") === "false");
      return {
        head: document.getElementById("wb-layers-selected-count")?.textContent, clearDisabled: document.getElementById("wb-layers-clear")?.disabled,
        frame: frame && frame.getAttribute("aria-label"), expanded: frame?.getAttribute("aria-expanded"), held: held.map((h) => h.getAttribute("aria-label")),
        indent: frame && held[0] ? [pad(frame), pad(held[0])] : null, selected: sel.map((x) => x.getAttribute("aria-label")), selBg, plainBg: plain && getComputedStyle(plain).backgroundColor,
        total: rows.length, names: rows.map((x) => x.getAttribute("aria-label")),
      };
    });
    console.log(W, JSON.stringify(r));
    if (r.head !== "2 selected on the board") bad("head " + r.head);
    if (r.held.length !== 3) bad("nested " + r.held.length);
    if (!r.indent || !(r.indent[1] > r.indent[0])) bad("indent " + JSON.stringify(r.indent));
    if (r.selected.length !== 2 || r.selBg === r.plainBg) bad("selected state");
    // fold
    await page.click(".wb-layer-fold");
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ held: document.querySelectorAll("#wb-layers-tree .is-held").length, exp: document.querySelector("#wb-layers-tree .has-held")?.getAttribute("aria-expanded") }));
    console.log(W, "folded", JSON.stringify(after));
    if (after.held !== 0 || after.exp !== "false") bad("fold");
    await page.click("#wb-layers-clear");
    await page.waitForTimeout(300);
    const cleared = await page.evaluate(() => ({ head: document.getElementById("wb-layers-selected-count").textContent, multi: wbMultiSelection.size }));
    console.log(W, "cleared", JSON.stringify(cleared));
    if (cleared.multi !== 0 || cleared.head !== "Nothing selected") bad("clear");
    await browser.close();
  }
  console.log(fails ? `FAIL: ${fails}` : "PASS");
  process.exit(fails ? 1 : 0);
})();
