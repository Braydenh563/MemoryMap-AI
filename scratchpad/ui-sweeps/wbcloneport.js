// The owner, 2026-10-10: "I used those little side triangle arrows on the
// edge of a sticky note to make another connected sticky note but when I move
// the new connected sticky note, the point at which the link line connects to
// it changes vertically depending on where I drag it." The copy made by the
// right arrow is dragged up and down by hand; the link's end on it must stay
// at the same point of the copy (its left side's middle) at every frame.
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbcloneport.js
const { boot } = require("./lib.js");
let fails = 0, passes = 0;
const check = (ok, what) => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}`); ok ? passes++ : fails++; };
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  const board = await page.evaluate(async () => {
    await initWhiteboard();
    return apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Clone port " + Date.now() }) });
  });
  await page.evaluate(async (b) => { await openWhiteboardBoard(b); }, board.id);
  await page.waitForTimeout(1000);
  const a = await page.evaluate(async (b) => {
    const o = await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ kind: "text", data: { content: "First", bg: "#fff4a3", border_color: "#e8d56a", color: "#2a2a1f", font_size: 16 }, board_id: b, x: 300, y: 300, z: 1, width: 180, height: 140 }) });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    selectWbItem("object", o.id);
    return o.id;
  }, board.id);
  await page.waitForTimeout(500);
  await page.click('#wb-clone-grips .wb-clone-grip[data-dir="right"]');
  await page.waitForTimeout(1200);
  const made = await page.evaluate((a) => {
    const copy = wbSelectedItem;
    const link = wbState.sketches.find((s) => { try { const p = JSON.parse(s.data); return p.sourceId === a && p.targetId === copy.id; } catch { return false; } });
    return { copy: copy.id, link: link?.id, data: link && JSON.parse(link.data) };
  }, a);
  check(Boolean(made.link), `the right arrow made a copy and a link (${made.copy}, ${made.link})`);
  check(Boolean(made.data?.targetAnchor && made.data?.sourceAnchor), `both ends anchored to ports (${JSON.stringify(made.data?.sourceAnchor)} to ${JSON.stringify(made.data?.targetAnchor)})`);
  //: Where on the copy the link ends, as fractions of its box ("0.00,0.50" is
  //: the middle of its left side), read from the drawn path's own end.
  const endOnCopy = () => page.evaluate(({ copy, link }) => {
    const item = wbState.objects.find((o) => o.id === copy);
    const box = wbItemBBox("object", item);
    const d = document.querySelector(`.sketch-group[data-id="${link}"] .sketch-path`)?.getAttribute("d") || "";
    const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
    const onOutline = (x, y) => Math.min(Math.abs(x - box.minX), Math.abs(x - box.maxX), Math.abs(y - box.minY), Math.abs(y - box.maxY));
    let best = null;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = nums[i], y = nums[i + 1];
      if (x < box.minX - 1 || x > box.maxX + 1 || y < box.minY - 1 || y > box.maxY + 1) continue;
      const dist = onOutline(x, y);
      if (!best || dist < best.dist) best = { dist, x, y };
    }
    if (!best) return "none";
    const f = (v, lo, hi) => ((v - lo) / (hi - lo)).toFixed(2);
    return `${f(best.x, box.minX, box.maxX)},${f(best.y, box.minY, box.maxY)}`;
  }, made);
  const start = await endOnCopy();
  const c = await page.evaluate((id) => { const r = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, made.copy);
  const seen = [start];
  await page.mouse.move(c.x + 30, c.y + 40);
  await page.mouse.down();
  for (const [dx, dy] of [[0, -60], [-60, -220], [-120, -260], [0, 60], [-80, 240], [40, 90]]) {
    await page.mouse.move(c.x + 30 + dx, c.y + 40 + dy, { steps: 4 });
    await page.waitForTimeout(60);
    seen.push(await endOnCopy());
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
  seen.push(await endOnCopy());
  check(new Set(seen).size === 1, `the link meets the copy at one point through the drag (${seen.join(" ")})`);
  console.log(`${passes}/${passes + fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
