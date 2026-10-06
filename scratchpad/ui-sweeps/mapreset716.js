// INBOX 716 (1)+(2): double-click a topic's resize grip after a manual resize.
// The branch line must end at the reset box, the PUT must succeed, and moving
// the node afterwards must not bring the manual size back.
//   BASE=http://127.0.0.1:8862 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapreset716.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const skip = await page.$("#recovery-key-skip"); if (skip && await skip.isVisible()) { await skip.click(); await page.waitForTimeout(500); }
  const puts = [];
  page.on("response", (r) => { if (r.request().method() === "PUT" && /whiteboard\/objects/.test(r.url())) puts.push(r.status()); });
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1500);
  const map = await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    return apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Reset\n- Root\n  - Alpha\n  - Beta", name: "Reset " + Date.now() }) });
  });
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id);
  await page.waitForTimeout(1500);
  const alpha = await page.evaluate(() => wbMapIndex().nodes.find((n) => String(wbMapLabel(n)).trim() === "Alpha")?.id);
  await page.click(`.wb-object[data-id="${alpha}"]`); await page.waitForTimeout(500);
  const grip = () => page.evaluate((id) => {
    const r = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-resize-grip`).getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, alpha);
  // Where the branch line ends, as a client-pixel point, against the node's
  // own box: the line must meet the box it belongs to.
  const box = () => page.evaluate((id) => {
    const el = document.querySelector(`.wb-object[data-id="${id}"]`);
    const d = wbMapIndex().byId.get(id);
    const r = el.getBoundingClientRect();
    const edge = wbMapEdgeAnchors(wbMapIndex().byId.get(d.parent_id), d, wbMapLayout());
    return { w: el.offsetWidth, h: el.offsetHeight, sized: !!d.data?.sized, dh: d.height, dw: d.width, edgeY2: Math.round(edge.y2), drawnY2: (() => { const e = wbMapEdgesFor(id)[0]; const d = e && e.el.getAttribute('d'); const m = d && d.match(/(-?[0-9.]+) (-?[0-9.]+)L(-?[0-9.]+) (-?[0-9.]+)/); return m ? Math.round((+m[2] + +m[4]) / 2) : (d || '').slice(-30); })(), nodeMidY: Math.round(d.y + el.offsetHeight / 2) };
  }, alpha);
  console.log("start", JSON.stringify(await box()));
  let g = await grip();
  await page.mouse.move(g.x, g.y); await page.mouse.down();
  await page.mouse.move(g.x + 90, g.y + 120, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(900);
  console.log("resized", JSON.stringify(await box()), "puts", puts);
  g = await grip();
  puts.length = 0;
  await page.mouse.dblclick(g.x, g.y);
  await page.waitForTimeout(1200);
  console.log("reset", JSON.stringify(await box()), "puts", puts);
  const c = await page.evaluate((id) => { const r = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, alpha);
  puts.length = 0;
  await page.mouse.move(c.x, c.y); await page.mouse.down();
  await page.mouse.move(c.x + 60, c.y + 60, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(1200);
  console.log("moved", JSON.stringify(await box()), "puts", puts);
  // Undo the move, then the reset, then the resize: after each, the line
  // must end at the middle of the box that is drawn.
  const line = (label, b) => console.log(label, JSON.stringify(b), b.edgeY2 === b.nodeMidY && b.drawnY2 === b.nodeMidY ? "PASS line meets box" : "FAIL line off box");
  line("moved", await box());
  await page.keyboard.press("Control+z"); await page.waitForTimeout(1200);
  line("undo move", await box());
  await page.keyboard.press("Control+z"); await page.waitForTimeout(1200);
  line("undo reset", await box());
  await page.keyboard.press("Control+z"); await page.waitForTimeout(1200);
  line("undo resize", await box());
  await page.keyboard.press("Control+Shift+z"); await page.waitForTimeout(1200);
  line("redo resize", await box());
  await browser.close();
})();
