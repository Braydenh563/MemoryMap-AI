// INBOX 658: dragging a map line's curve is one Undo step that puts the
// line back. Drags the bend handle of one edge, then Ctrl+Z.
//   BASE=http://127.0.0.1:8790 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapbendundo658.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1500);
  const map = await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    return apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Bend\n- Root\n  - Alpha\n  - Beta", name: "Bend " + Date.now() }) });
  });
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id);
  await page.waitForTimeout(1500);
  const alpha = await page.evaluate(() => wbMapIndex().nodes.find((n) => String(wbMapLabel(n)).trim() === "Alpha")?.id);
  await page.click(`.wb-object[data-id="${alpha}"]`); await page.waitForTimeout(500);
  const bend = () => page.evaluate((id) => wbMapIndex().byId.get(id)?.data?.edge_bend ?? null, alpha);
  const h = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".wb-map-edge-handle.is-shown")][0];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!h) { console.log("FAIL no shown edge handle"); await browser.close(); process.exit(1); }
  const before = await bend();
  await page.mouse.move(h.x, h.y); await page.mouse.down();
  await page.mouse.move(h.x + 10, h.y + 40, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(800);
  const bent = await bend();
  await page.keyboard.press("Control+z"); await page.waitForTimeout(800);
  const undone = await bend();
  console.log(`bend before ${before} after drag ${bent} after undo ${undone}`);
  console.log(`${bent !== before ? "PASS" : "FAIL"}  the drag bends the line`);
  console.log(`${undone === before ? "PASS" : "FAIL"}  Ctrl+Z puts it back`);
  await browser.close();
})();
