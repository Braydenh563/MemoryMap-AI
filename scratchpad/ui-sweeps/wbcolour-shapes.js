// The owner, 2026-10-11: "can you add more shapes". Each flyout shape draws
// in the dragged box, is a closed fillable shape, takes text, undoes.
//   BASE=http://127.0.0.1:8800 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers W=1440 node scratchpad/ui-sweeps/wbcolour-shapes.js
const { openBoard } = require("./wbcolour-lib.js");
const { checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
const W = Number(process.env.W || 1440);
(async () => {
  const { browser, page, errors } = await openBoard({ viewport: { width: W, height: 900 } });
  await page.click("#wb-shape-toggle");
  await page.waitForTimeout(400);
  const menu = await page.evaluate(() => {
    const m = document.getElementById("wb-shape-menu");
    const r = m.getBoundingClientRect();
    const tools = [...m.querySelectorAll("button[data-tool]")].map((b) => b.dataset.tool);
    const clipped = [...m.querySelectorAll("button[data-tool]")].filter((b) => { const q = b.getBoundingClientRect(); return q.left < 0 || q.right > innerWidth || q.top < 0 || q.bottom > innerHeight; }).length;
    return { n: tools.length, w: Math.round(r.width), h: Math.round(r.height), clipped, tools };
  });
  check("the flyout holds 15 shape tools, none off screen", menu.n === 15 && menu.clipped === 0, menu);
  const tools = menu.tools.filter((t) => t.startsWith("shape-"));
  await page.keyboard.press("Escape");
  let y = 160, x = 260;
  const results = [];
  for (const tool of tools) {
    await page.evaluate((t) => wbSelectToolRef(t), tool);
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 60, y + 40, { steps: 3 }); await page.mouse.move(x + 120, y + 80, { steps: 3 }); await page.mouse.up();
    await page.waitForTimeout(500);
    results.push(await page.evaluate(() => {
      const s = wbState.sketches[wbState.sketches.length - 1];
      const p = JSON.parse(s.data);
      const b = wbItemBBox("sketch", s);
      return { shape: p.shape, area: Boolean(p.label_area), closed: /Z/.test(p.d), w: Math.round(b.maxX - b.minX), h: Math.round(b.maxY - b.minY), kind: wbShapeLabelKind(p) };
    }));
    x += 190; if (x > W - 250) { x = 260; y += 160; }
  }
  const bad = results.filter((r) => r.shape !== "custom" || !r.closed || r.kind !== "custom");
  check(`all ${tools.length} draw as closed custom shapes that take text`, tools.length === 9 && bad.length === 0, bad);
  const sizes = results.map((r) => `${r.w}x${r.h}`);
  check("each fills the dragged box within its pen width", results.every((r) => Math.abs(r.w - 120) <= 8 && Math.abs(r.h - 80) <= 8), sizes);
  const n = await page.evaluate(() => wbState.sketches.length);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(600);
  check("one Undo takes the last one away", (await page.evaluate(() => wbState.sketches.length)) === n - 1);
  const palette = await page.evaluate(() => WB_COMMANDS.filter((c) => c.id.startsWith("tool-shape-")).map((c) => c.label));
  check("the palette names all nine", palette.length === 9, palette);
  check("no console errors", errors.length === 0, errors);
  summary();
  await browser.close();
})();
