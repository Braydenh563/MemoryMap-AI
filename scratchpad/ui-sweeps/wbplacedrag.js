// **The text and sticky tools draw a box at the size you drag** (the owner,
// 2026-09-24: "I cant drag to create a custom sized textbox on the whiteboard
// when selected on the textbox tool", "same with the sticky notes").
//
// For each tool, by real pointer input on a fresh board:
//   - a click places the default size (200x80 text, 180x140 sticky);
//   - a 240x130 drag shows a dashed preview mid-drag and creates a box of
//     exactly the dragged size, corner at the press, in edit mode;
//   - a drag up and to the left makes the box on that side of the press;
//   - Shift makes it square (the longer travel);
//   - a 10px drag is clamped to the minimum (60x32 text, 80x60 sticky);
//   - one Ctrl+Z after a drawn box takes it away again.
// Sizes are board units read back from wbState; the board is at zoom 1 so
// board units and screen pixels agree, which is what the numbers compare.
//
//   BASE=http://127.0.0.1:8788 SCRATCH=/tmp/mm PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/wbplacedrag.js
const { boot } = require("./lib.js");

const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
};

(async () => {
  const [vw, vh] = (process.env.SIZE || "1440x900").split("x").map(Number);
  const { browser, page } = await boot({ viewport: { width: vw, height: vh } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Place drag " + Date.now() }) });
    await openWhiteboardBoard(b.id);
    const c = document.getElementById("whiteboard-container");
    d3.select(c).call(wbZoom.transform, d3.zoomIdentity);
  });
  await page.waitForTimeout(800);
  const origin = await page.evaluate(() => {
    const r = document.getElementById("whiteboard-container").getBoundingClientRect();
    return { x: r.left + r.width / 2 - 200, y: r.top + r.height / 2 - 120 };
  });
  const objects = () => page.evaluate(() => (wbState.objects || []).map((o) => ({ id: o.id, x: o.x, y: o.y, w: o.width, h: o.height })));
  const newest = async (before) => {
    const all = await objects();
    return all.filter((o) => !before.some((b) => b.id === o.id));
  };
  const clean = async () => {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    await page.keyboard.press("Escape");
    await page.evaluate(async () => {
      for (const o of [...(wbState.objects || [])]) await apiJson(`/whiteboard/objects/${o.id}`, { method: "DELETE" }).catch(() => {});
      wbState.objects = [];
      renderWhiteboardNow();
    });
    await page.waitForTimeout(300);
  };
  const pick = async (tool) => {
    await page.evaluate((tool) => document.querySelector(`button[data-tool="${tool}"]`)?.click(), tool);
    await page.waitForTimeout(150);
  };
  const drag = async (dx, dy, { shift = false, peek = false } = {}) => {
    await page.mouse.move(origin.x, origin.y);
    if (shift) await page.keyboard.down("Shift");
    await page.mouse.down();
    let preview = null;
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(origin.x + (dx * i) / 8, origin.y + (dy * i) / 8);
      if (peek && i === 4) {
        preview = await page.evaluate(() => {
          const el = document.querySelector("#whiteboard-container canvas.wb-marquee");
          return el ? { shown: true } : { shown: false };
        });
      }
    }
    await page.mouse.up();
    if (shift) await page.keyboard.up("Shift");
    await page.waitForTimeout(700);
    return preview;
  };
  const DEFAULT = { text: [200, 80], sticky: [180, 140] };
  const MIN = { text: [60, 32], sticky: [80, 60] };
  for (const tool of ["text", "sticky"]) {
    await clean();
    // A click: the default size.
    await pick(tool);
    let before = await objects();
    await page.mouse.click(origin.x, origin.y);
    await page.waitForTimeout(700);
    let made = await newest(before);
    check(`${tool}: a click places one box at the default size`, made.length === 1 && made[0].w === DEFAULT[tool][0] && made[0].h === DEFAULT[tool][1],
      JSON.stringify(made));

    // A drag: the dragged size, a preview while dragging, edit mode after.
    await clean();
    await pick(tool);
    before = await objects();
    const preview = await drag(240, 130, { peek: true });
    made = await newest(before);
    const editing = await page.evaluate(() => Boolean(document.querySelector(".wb-object.wb-text-editing, .wb-text-content[contenteditable=true]")));
    const box = made[0] || {};
    const start = await page.evaluate(([x, y]) => {
      const c = document.getElementById("whiteboard-container");
      const r = c.getBoundingClientRect();
      return d3.zoomTransform(c).invert([x - r.left, y - r.top]);
    }, [origin.x, origin.y]);
    check(`${tool}: a 240x130 drag makes one box that size at the press`,
      made.length === 1 && Math.abs(box.w - 240) <= 1 && Math.abs(box.h - 130) <= 1 && Math.abs(box.x - start[0]) <= 1 && Math.abs(box.y - start[1]) <= 1,
      `made ${JSON.stringify(made)}, press at ${start.map(Math.round)}`);
    check(`${tool}: the drag shows a dashed preview`, preview && preview.shown, JSON.stringify(preview));
    check(`${tool}: the drawn box opens for typing`, editing);
    // One undo takes it away.
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.evaluate(() => wbUndo());
    await page.waitForTimeout(600);
    const after = await newest(before);
    check(`${tool}: one undo removes the drawn box`, after.length === 0, JSON.stringify(after));

    // Up and to the left.
    await clean();
    await pick(tool);
    before = await objects();
    await drag(-200, -100);
    made = await newest(before);
    check(`${tool}: a drag up and left puts the box on that side`, made.length === 1 && Math.abs(made[0].x - (start[0] - 200)) <= 1 && Math.abs(made[0].y - (start[1] - 100)) <= 1 && Math.abs(made[0].w - 200) <= 1,
      JSON.stringify(made));

    // Shift: square.
    await clean();
    await pick(tool);
    before = await objects();
    await drag(220, 120, { shift: true });
    made = await newest(before);
    check(`${tool}: Shift makes it square`, made.length === 1 && Math.abs(made[0].w - 220) <= 1 && Math.abs(made[0].h - 220) <= 1, JSON.stringify(made));

    // A tiny drag: the minimum.
    await clean();
    await pick(tool);
    before = await objects();
    await drag(10, 6);
    made = await newest(before);
    check(`${tool}: a 10px drag is held to the minimum`, made.length === 1 && made[0].w === MIN[tool][0] && made[0].h === MIN[tool][1], JSON.stringify(made));
  }
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
