// gl1005: INBOX 581, "on the mindmap, the solid and dashed bar are exactly the
// same on mind map nodes". After 569 (mmdoc1005-spinebar.js, the Rounded box
// only): every Box (Rounded, Pill, Box, Ellipse), free and pinned (the dashed
// box), Edge bar Solid and Dashed, in tree-right, tree-down and a mirrored
// both-sides topic. The bar edge is photographed and each line across it
// (a row for a side bar, a column for the top bar) is asked whether it holds
// a pixel of the bar's own colour: a solid bar is continuous, a dashed one
// has gaps.
//   BASE=http://127.0.0.1:8861 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   [THEME=dark] node gl1005-mmbar.js
const { boot } = require("./lib.js");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const OUT = (process.env.SCRATCH || "/tmp") + "/gl1005-mmbar";
fs.mkdirSync(OUT, { recursive: true });

//: The share of lines across the bar (the middle 70% of its length, so a
//: rounded corner's curve is not counted as a gap) with no pixel within 60
//: of the bar's colour.
//: The bar's colour is read off the solid photograph (the outermost pixel at
//: the middle of the bar) and reused for the dashed one: a computed colour
//: can be a color-mix the screen resolves to something else.
function gapShare(file, rgb, along, side, inner = 0.15) {
  const code = `
import sys, json; sys.path.insert(0, ${JSON.stringify(path.resolve(__dirname, ".."))})
from pngpixel import read_png
w, h, rows = read_png(${JSON.stringify(file)})
ref = ${rgb ? JSON.stringify(rgb) : "None"}
if ref is None:
    ref = list((rows[2][w // 2] if ${JSON.stringify(side)} == "top" else rows[h // 2][w - 3 if ${JSON.stringify(side)} == "right" else 2])[:3])
near = lambda c: sum(abs(a - b) for a, b in zip(c[:3], ref)) < 60
along = ${along ? "True" : "False"}
n = w if along else h
lo, hi = int(n * ${inner}), int(n * (1 - ${inner}))
if along:
    lines = [[rows[y][x] for y in range(h)] for x in range(lo, hi)]
else:
    lines = [rows[y][:] for y in range(lo, hi)]
print(json.dumps([sum(1 for line in lines if not any(near(c) for c in line)) / max(1, len(lines)), ref]))
`;
  return JSON.parse(execFileSync("python3", ["-c", code]).toString().trim());
}

function diffShare(a, b) {
  const code = `
import sys; sys.path.insert(0, ${JSON.stringify(path.resolve(__dirname, ".."))})
from pngpixel import read_png
w, h, ra = read_png(${JSON.stringify(a)})
w2, h2, rb = read_png(${JSON.stringify(b)})
n = d = 0
for y in range(min(h, h2)):
    for x in range(min(w, w2)):
        n += 1
        d += sum(abs(p - q) for p, q in zip(ra[y][x][:3], rb[y][x][:3])) > 60
print(round(d / max(1, n), 3))
`;
  return Number(execFileSync("python3", ["-c", code]).toString().trim());
}

(async () => {
  const { page, browser } = await boot();
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  for (const layout of ["tree-right", "tree-down", "tree-both"]) {
    const ids = await page.evaluate(async (layout) => {
      const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Bars\n\n- Centre\n  - A topic with a longer label\n  - Right two\n  - Left one\n  - Left two with words" }) });
      await openWhiteboardBoard(b.id);
      await wbMapSetLayout(layout);
      await wbMapTidy({ quiet: true });
      renderWhiteboardNow();
      const byText = (t) => wbState.objects.find((o) => o.data.content === t).id;
      return { a: byText("A topic with a longer label"), b: byText("Left two with words") };
    }, layout);
    for (const shape of ["", "pill", "rect", "ellipse"]) {
      for (const look of ["free", "pinned", "core", "filled"]) {
        const pinned = look === "pinned";
        for (const which of layout === "tree-both" ? ["a", "b"] : ["a"]) {
          const gaps = {};
          let ref = null;
          for (const spine of ["", "dashed"]) {
            const state = await page.evaluate(async ({ id, pinned, spine, shape, look }) => {
              const node = wbState.objects.find((o) => o.id === id);
              const data = { ...node.data, pinned, core: look === "core" };
              if (look === "filled") data.fill = "self"; else delete data.fill;
              if (spine) data.spine = spine; else delete data.spine;
              if (shape) data.shape = shape; else delete data.shape;
              node.data = data;
              await wbSaveObject(node);
              renderWhiteboardNow();
              clearWbSelection();
              wbZoomToFit({ animate: false });
              await new Promise((r) => setTimeout(r, 120));
              const el = document.querySelector(`.wb-object[data-id="${id}"]`);
              const cs = getComputedStyle(el);
              const side = wbMapLayout() === "tree-down" ? "top" : el.classList.contains("wb-map-node-mirrored") ? "right" : "left";
              const r = el.getBoundingClientRect();
              const colour = cs[`border-${side}-color`].match(/[\d.]+/g).slice(0, 3).map(Number);
              return { side, style: cs[`border-${side}-style`], width: parseFloat(cs[`border-${side}-width`]), colour, box: [r.left, r.top, r.width, r.height] };
            }, { id: ids[which], pinned, spine, shape, look });
            const [x, y, w, h] = state.box;
            // An ellipse's or a pill's bar curves in from the box's edge, so
            // the strip is a quarter of the box deep, not a bar's width.
            const depth = Math.max(8, Math.round((state.side === "top" ? h : w) * (shape === "ellipse" ? 0.25 : shape === "pill" ? 0.18 : 0.06)));
            const clip =
              state.side === "top"
                ? { x: Math.floor(x), y: Math.floor(y), width: Math.round(w), height: depth }
                : { x: Math.floor(state.side === "right" ? x + w - depth : x), y: Math.floor(y), width: depth, height: Math.round(h) };
            const file = `${OUT}/${layout}-${shape || "rounded"}-${look}-${spine || "solid"}-${which}.png`;
            fs.writeFileSync(file, await page.screenshot({ clip }));
            const [share, seen] = gapShare(file, ref, state.side === "top", state.side, shape === "ellipse" ? 0.3 : 0.15);
            ref = ref || seen;
            gaps[spine || "solid"] = { share: Math.round(share * 100) / 100, style: state.style, width: state.width, file };
          }
          const label = `${layout} box ${shape || "rounded"}${{ free: "", pinned: " pinned (dashed box)", core: " core", filled: " filled" }[look]}${layout === "tree-both" ? (which === "a" ? " right side" : " left side") : ""}`;
          //: The two photographs against each other: the share of the strip's
          //: pixels that differ. Identical bars (the report) are 0. A core
          //: topic's ground is the bar's own colour, so its lines across the
          //: bar always meet that colour and only this test can see its dash.
          const differ = diffShare(gaps.solid.file, gaps.dashed.file);
          delete gaps.solid.file;
          delete gaps.dashed.file;
          const styled = gaps.solid.style === "solid" && gaps.dashed.style === "dashed" && differ >= 0.02;
          const ok = styled && (look === "core" || (gaps.solid.share <= 0.02 && gaps.dashed.share >= 0.2));
          check(label, ok, JSON.stringify({ ...gaps, differ }));
        }
      }
    }
  }
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  await browser.close();
})();
