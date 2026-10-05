// INBOX 569: "it says the edge bar is solid even though it is dashed". Every
// combination of the box (solid, or dashed because the topic is pinned) and
// the Edge bar (solid, dashed, none), in tree-right, tree-down and a
// both-sides mirrored topic: what the Shape menu says, the bar edge's
// computed style, and its pixels sampled down the bar for gaps.
//
//   BASE=http://127.0.0.1:8844 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmdoc1005-spinebar.js   (THEME=dark)
const { boot } = require("./lib.js");
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const OUT = (process.env.SCRATCH || "/tmp") + "/mmdoc1005-spine";
fs.mkdirSync(OUT, { recursive: true });

//: The fraction of samples down the bar's middle column that are not the bar's
//: colour: 0 is a solid bar, a dash leaves a third or more.
function gapShare(file, column) {
  const code = `
import sys; sys.path.insert(0, ${JSON.stringify(path.resolve(__dirname, ".."))})
from pngpixel import read_png
w, h, rows = read_png(${JSON.stringify(file)})
x = min(w - 1, ${column})
col = [rows[y][x][:3] for y in range(h)]
ref = max(col, key=lambda c: (max(c) - min(c), c))
off = sum(1 for c in col if sum(abs(a - b) for a, b in zip(c, ref)) > 90)
print(off / len(col))
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
      const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Spine\n\n- Centre\n  - Right one\n  - Right two\n  - Left one\n  - Left two" }) });
      await openWhiteboardBoard(b.id);
      await wbMapSetLayout(layout);
      await wbMapTidy({ quiet: true });
      renderWhiteboardNow();
      const byText = (t) => wbState.objects.find((o) => o.data.content === t).id;
      return { a: byText("Right one"), b: byText("Left two") };
    }, layout);
    for (const pinned of [false, true]) {
      for (const spine of ["", "dashed", "none"]) {
        for (const which of layout === "tree-both" ? ["a", "b"] : ["a"]) {
          const id = ids[which];
          const state = await page.evaluate(async ({ id, pinned, spine }) => {
            const node = wbState.objects.find((o) => o.id === id);
            const data = { ...node.data, pinned };
            if (spine) data.spine = spine; else delete data.spine;
            node.data = data;
            await wbSaveObject(node);
            renderWhiteboardNow();
            selectWbItem("object", id);
            wbSyncMapStrip(node);
            const el = document.querySelector(`.wb-object[data-id="${id}"]`);
            const cs = getComputedStyle(el);
            const mirrored = el.classList.contains("wb-map-node-mirrored");
            const down = wbMapLayout() === "tree-down";
            const side = down ? "top" : mirrored ? "right" : "left";
            const others = ["top", "right", "bottom", "left"].filter((s) => s !== side);
            const menu = document.getElementById("wb-map-spine")?.selectedOptions[0]?.textContent;
            // The photograph wants the topic alone: no strip over it, in view.
            clearWbSelection();
            wbZoomToFit({ animate: false });
            const r = el.getBoundingClientRect();
            return {
              side,
              barStyle: cs[`border-${side}-style`],
              barWidth: parseFloat(cs[`border-${side}-width`]),
              otherStyles: [...new Set(others.map((s) => cs[`border-${s}-style`]))],
              menu,
              box: [r.left, r.top, r.width, r.height].map(Math.round),
            };
          }, { id, pinned, spine });
          // The bar, photographed: a strip along it, one bar-width deep.
          const [x, y, w, h] = state.box;
          const along = state.side === "top";
          const clip = along
            ? { x: x + 8, y, width: Math.max(10, w - 16), height: 4 }
            : { x: state.side === "right" ? x + w - 4 : x, y: y + 6, width: 4, height: Math.max(10, h - 12) };
          const file = `${OUT}/${layout}-${pinned ? "pin" : "free"}-${spine || "solid"}-${which}.png`;
          let gaps = null;
          if (state.barWidth >= 3) {
            const buf = await page.screenshot({ clip });
            let png = buf;
            if (along) {
              // Turn the strip on its side: sample the row instead of a column.
              fs.writeFileSync(file, buf);
              const code = `
import sys; sys.path.insert(0, ${JSON.stringify(path.resolve(__dirname, ".."))})
from pngpixel import read_png
w, h, rows = read_png(${JSON.stringify(file)})
row = [rows[1][x][:3] for x in range(w)]
ref = max(row, key=lambda c: (max(c) - min(c), c))
print(sum(1 for c in row if sum(abs(a - b) for a, b in zip(c, ref)) > 90) / len(row))
`;
              gaps = Number(execFileSync("python3", ["-c", code]).toString().trim());
            } else {
              fs.writeFileSync(file, png);
              gaps = gapShare(file, 1);
            }
          }
          const want = spine || "solid";
          const label = `${layout} ${pinned ? "pinned (box dashed)" : "box solid"} bar ${want}${layout === "tree-both" ? ` (${which === "a" ? "right side" : "left side"})` : ""}`;
          const menuOk = state.menu === { solid: "Solid bar", dashed: "Dashed bar", none: "No bar" }[want];
          let drawnOk;
          if (want === "solid") drawnOk = state.barStyle === "solid" && state.barWidth >= 3 && gaps === 0;
          else if (want === "dashed") drawnOk = state.barStyle === "dashed" && gaps > 0.15;
          else drawnOk = state.barWidth < 3;
          check(label, menuOk && drawnOk, JSON.stringify({ menu: state.menu, side: state.side, style: state.barStyle, width: state.barWidth, gaps, box: state.otherStyles }));
          if (pinned) check(`${label}: the rest of the box is dashed`, state.otherStyles.length === 1 && state.otherStyles[0] === "dashed", state.otherStyles.join());
        }
      }
    }
  }
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  await browser.close();
})();
