// canvasdepth2 sweeps: a map imported from an outline and opened, plus the
// overlap count every map sweep here asks for.
const { openFresh, checker } = require("./cdlib.js");
const { waitForBoardOpen } = require("./lib.js");
async function openMap(page, content, name = "cd2 map") {
  const board = await page.evaluate(async ([c, n]) => apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: c, name: `${n} ${Date.now()}` }) }), [content, name]);
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, board.id);
  await waitForBoardOpen(page, 2);
  await page.waitForTimeout(600);
  return board;
}
// Overlapping pairs among the map's drawn topics, in board units.
function overlapIn(page) {
  return page.evaluate(() => {
    const index = wbMapIndex();
    const boxes = index.nodes.map((o) => ({ id: o.id, x: o.x, y: o.y, ...wbMapNodeSize(o) }));
    let pairs = 0;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 1 && oy > 1) pairs += 1;
    }
    return pairs;
  });
}
// WCAG contrast of two computed colours, `rgb(...)` or `color(srgb ...)`.
function contrast(a, b) {
  const parse = (c) => {
    const n = (c.match(/[\d.]+/g) || []).map(Number);
    return /^color\(/.test(c) ? n.slice(0, 3).map((v) => v * 255) : n.slice(0, 3);
  };
  const lum = (rgb) => {
    const [r, g, b2] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2;
  };
  const [x, y] = [lum(parse(a)), lum(parse(b))].sort((p, q) => q - p);
  return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
}
module.exports = { openFresh, checker, openMap, overlapIn, contrast };
