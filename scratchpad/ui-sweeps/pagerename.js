// INBOX 822: rename a frame from the Pages sidebar (double-click, F2, kebab),
// Enter keeps, Escape cancels, one Undo step, the canvas title follows.
const { boot, openBoardsTab } = require("./lib.js");
(async () => {
  let fails = 0;
  const bad = (m) => { fails++; console.log("FAIL", m); };
  for (const [W, H] of [[1440, 900], [390, 844]]) {
    const { browser, page } = await boot({ viewport: { width: W, height: H } });
    await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
    await openBoardsTab(page);
    const id = await page.evaluate(async () => {
      const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Pages " + Date.now() }) });
      await openWhiteboardBoard(b.id); await new Promise((r) => setTimeout(r, 1500));
      const f = await wbCreateObject("frame", { content: "Frame 1", page: 1 }, 0, 0, 400, 300, 1);
      await wbCreateObject("frame", { content: "Frame 2", page: 2 }, 500, 0, 400, 300, 1);
      renderWhiteboardNow(); await new Promise((r) => setTimeout(r, 500));
      return f.id;
    });
    if (W < 600) await page.evaluate(() => document.getElementById("wb-library-toggle")?.click?.());
    await page.evaluate(() => document.getElementById("wb-side-tab-pages").click());
    await page.waitForTimeout(500);
    await page.evaluate(() => wbRenderPages());
    const names = () => page.evaluate((id) => ({ row: document.querySelector(`#wb-pages-list [data-id="${id}"] .wb-layer-name`)?.textContent, canvas: document.querySelector(`.wb-object[data-id="${id}"] .wb-frame-title`)?.textContent, data: wbState.objects.find((o) => o.id === id).data.content }), id);
    const row = `#wb-pages-list [data-id="${id}"] .wb-layer-name`;
    // double-click, type, Enter
    await page.evaluate(() => { window.__ev = []; for (const t of ["click", "dblclick", "blur", "focusout"]) document.getElementById("wb-pages-list").addEventListener(t, (e) => window.__ev.push(t + ":" + (e.target.className || e.target.tagName).toString().slice(0, 30)), true); });
    await page.dblclick(row); await page.waitForTimeout(300);
    if (process.env.DBG) console.log(await page.evaluate(() => window.__ev.join(" | ")));
    const editing = await page.evaluate((id) => document.querySelector(`#wb-pages-list [data-id="${id}"] .wb-layer-name`).isContentEditable, id);
    if (!editing) bad("dblclick did not start an edit");
    await page.keyboard.press("Control+A"); await page.keyboard.type("Overview"); await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
    let n = await names(); console.log(W, "enter", JSON.stringify(n));
    if (n.row !== "Overview" || n.canvas !== "Overview" || n.data !== "Overview") bad("enter " + JSON.stringify(n));
    // Escape cancels (F2)
    await page.focus(`#wb-pages-list [data-id="${id}"]`); await page.keyboard.press("F2"); await page.waitForTimeout(300);
    await page.keyboard.press("Control+A"); await page.keyboard.type("Nope"); await page.keyboard.press("Escape");
    await page.waitForTimeout(700);
    n = await names(); console.log(W, "escape", JSON.stringify(n));
    if (n.row !== "Overview" || n.data !== "Overview") bad("escape " + JSON.stringify(n));
    // one undo step
    await page.evaluate(() => wbUndo());
    await page.waitForTimeout(700);
    n = await names(); console.log(W, "undo", JSON.stringify(n));
    if (n.data !== "Frame 1") bad("undo " + JSON.stringify(n));
    // kebab items
    await page.click(`#wb-pages-list [data-id="${id}"] .kebab-opener`);
    await page.waitForTimeout(400);
    const items = await page.evaluate(() => [...document.querySelectorAll(".action-menu:not(.hidden) .menu-item, .sheet .menu-item")].map((b) => b.textContent.trim()));
    console.log(W, "kebab", JSON.stringify(items));
    for (const want of ["Rename", "Fit to contents", "Present from here", "Delete the frame"]) if (!items.some((t) => t.includes(want))) bad("kebab missing " + want);
    await browser.close();
  }
  console.log(fails ? `FAIL: ${fails}` : "PASS");
  process.exit(fails ? 1 : 0);
})();
