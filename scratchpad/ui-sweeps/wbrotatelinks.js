// INBOX 647: a link's ends follow a box while it turns, not only after the
// next move. Measures the link path mid-drag (button still down) against
// before the turn.
//   BASE=http://127.0.0.1:8790 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbrotatelinks.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const board = await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    return apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Turn " + Date.now() }) });
  });
  await page.evaluate(async (b) => { await openWhiteboardBoard(b); }, board.id);
  await page.waitForTimeout(1200);
  const oneId = await page.evaluate(async (b) => {
    const mk = (content, x) => apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ kind: "text", data: { content }, board_id: b, x, y: 200, z: 1, width: 220, height: 80 }) });
    const one = await mk("One", 200);
    const two = await mk("Two", 650);
    await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ board_id: b, x: 0, y: 0, z: 0, data: JSON.stringify({ type: "link-straight", sourceKind: "object", sourceId: one.id, targetKind: "object", targetId: two.id }) }) });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    return one.id;
  }, board.id);
  await page.waitForTimeout(800);
  const linkD = () => page.evaluate(() => document.querySelector(".sketch-group .sketch-path")?.getAttribute("d"));
  await page.click(`.wb-object[data-id="${oneId}"]`);
  await page.waitForTimeout(400);
  const h = await page.evaluate((id) => {
    const r = document.querySelector(`.wb-object[data-id="${id}"] .wb-rotate-handle`)?.getBoundingClientRect();
    const c = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    return r && { x: r.x + r.width / 2, y: r.y + r.height / 2, cx: c.x + c.width / 2, cy: c.y + c.height / 2 };
  }, oneId);
  if (!h) { console.log("FAIL no rotate handle"); await browser.close(); process.exit(1); }
  const before = await linkD();
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(h.cx + 150, h.cy + i * 10, { steps: 2 });
  await page.waitForTimeout(150);
  const during = await linkD();
  const rot = await page.evaluate((id) => wbState.objects.find((o) => o.id === id)?.rotation, oneId);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await linkD();
  console.log(`rotation ${Math.round(rot || 0)}`);
  console.log(`${during !== before ? "PASS" : "FAIL"}  link path moves while the box turns`);
  console.log(`${after === during ? "PASS" : "INFO"}  render after release keeps it (${after === during ? "same" : "differs"})`);
  await browser.close();
})();
