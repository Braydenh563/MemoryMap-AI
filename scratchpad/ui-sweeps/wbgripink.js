// The text box and sticky drag grip (`.wb-object-grip`, the "⠿" tab on the
// top edge) reads against what it sits on: 3:1 for the glyph against the
// grip's own ground, composited over the item's fill, on a sticky, a plain
// text box and a dark-filled box, light and dark. The orchestrator's report:
// 1.42:1 on a sticky in dark.
//
//   BASE=http://127.0.0.1:8809 SCRATCH=/tmp/x THEME=dark \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbgripink.js
const { boot } = require("./lib.js");

let pass = 0;
let fail = 0;
function ok(label, good, detail) {
  if (good) pass += 1;
  else fail += 1;
  console.log(`${good ? "OK  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
}
const VW = Number(process.env.VW || 1440);
const VH = Number(process.env.VH || 900);

(async () => {
  const { browser, page } = await boot({ viewport: { width: VW, height: VH } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluate(() => document.querySelector('[data-tab="library"]').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-target="library-view-whiteboard"]').click());
  await page.waitForTimeout(700);
  const boardId = await page.evaluate(async () =>
    (await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `Grip ${Date.now()}` }) })).id
  );
  await page.evaluate((bid) => openWhiteboardBoard(bid), boardId);
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  const results = await page.evaluate(async () => {
    d3.select("#whiteboard-container").call(wbZoom.transform, d3.zoomIdentity);
    const kinds = [
      ["sticky", { content: "Sticky", bg: "#fff4a3", border_color: "#e8d56a", color: "#2a2a1f", font_size: 16 }],
      ["text box", { content: "Plain" }],
      ["dark box", { content: "Dark", bg: "#1d2a4a" }],
    ];
    const made = [];
    let x = 120;
    for (const [name, data] of kinds) {
      const o = await wbCreateObject("text", data, x, 260, 180, 120);
      made.push([name, o.id]);
      x += 240;
    }
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 300));
    const parse = (s) => {
      const m = String(s).match(/[\d.]+/g) || [];
      const k = String(s).startsWith("color(srgb") ? 255 : 1;
      return { r: (+m[0] || 0) * k, g: (+m[1] || 0) * k, b: (+m[2] || 0) * k, a: m[3] === undefined ? 1 : +m[3] };
    };
    const over = (top, under) => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    });
    const lum = (c) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const ratio = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (hi + 0.05) / (lo + 0.05);
    };
    const board = parse(getComputedStyle(document.getElementById("whiteboard-container")).backgroundColor);
    return made.map(([name, id]) => {
      const el = document.querySelector(`.wb-object[data-id="${id}"]`);
      const grip = el.querySelector(".wb-object-grip");
      const content = el.querySelector(".wb-text-content") || el;
      let fill = parse(getComputedStyle(content).backgroundColor);
      if (fill.a === 0) fill = parse(getComputedStyle(el).backgroundColor);
      const itemFill = over(fill, board);
      const g = getComputedStyle(grip);
      const ground = over(parse(g.backgroundColor), itemFill);
      const ink = over(parse(g.color), ground);
      return { name, ratio: ratio(ink, ground), ink: g.color, ground: g.backgroundColor };
    });
  });
  for (const r of results) ok(`the grip reads on a ${r.name} (3:1)`, r.ratio >= 3, `${r.ratio.toFixed(2)} ink ${r.ink} on ${r.ground}`);
  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${pass}/${pass + fail} at ${VW}x${VH} ${process.env.THEME || "light"}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
