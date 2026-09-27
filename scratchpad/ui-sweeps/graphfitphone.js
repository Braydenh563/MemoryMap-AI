// The graph on a phone and a tablet (INBOX 430): "the controls overlap the
// legend and the New note FAB. Fit the graph to the viewport's shape (more
// vertical in portrait). Arc view doesn't fit the screen; the Tree view sits
// at the top instead of centred."
//
// Per size (390x844, 768x1024, 1024x768, touch on) and per layout (force,
// tree, radial, arc), after the fit: the nodes' drawn box on screen against
// the map's own box (inside it, and centred within 12% of it on each axis),
// the share of the map's height and width it uses, and every pair of the
// map's floating controls that overlap. Shots to scratchpad/shots/phone430/.
//   TAG=before SIZES=390x844 LAYOUTS=force,tree node scratchpad/ui-sweeps/graphfitphone.js
const path = require("path");
const { boot } = require("./lib.js");
const TAG = process.env.TAG || "after";
const SIZES = (process.env.SIZES || "390x844,768x1024,1024x768").split(",").map((s) => s.split("x").map(Number));
const LAYOUTS = (process.env.LAYOUTS || "force,tree,radial,arc").split(",");
(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + detail : ""}`);
  };
  for (const [w, h] of SIZES) {
    const { page, browser } = await boot({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.evaluate(() => localStorage.setItem("graph-layout", "force"));
    await page.evaluate(() => switchTab("graph"));
    await page.waitForTimeout(4000);
    //: The floating controls over the map, and which of them overlap.
    const overlaps = await page.evaluate(() => {
      const card = document.querySelector("#tab-graph");
      const picks = [...card.querySelectorAll("#graph-legend, .graph-legend, .graph-zoom, .graph-minimap, #graph-add-node, .fab, .dock, .graph-help-panel, [class*='graph-'][class*='-strip'], .graph-overlay > *")]
        .filter((el, i, all) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden" && all.indexOf(el) === i);
      const boxes = picks.map((el) => ({ name: el.id || el.className.toString().split(" ")[0], r: el.getBoundingClientRect(), el }));
      const hits = [];
      for (let i = 0; i < boxes.length; i += 1) {
        for (let j = i + 1; j < boxes.length; j += 1) {
          const a = boxes[i];
          const b = boxes[j];
          if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
          const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
          const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
          if (x > 2 && y > 2) hits.push(`${a.name} x ${b.name} (${Math.round(x)}x${Math.round(y)})`);
        }
      }
      return { controls: boxes.map((b) => `${b.name}@${Math.round(b.r.left)},${Math.round(b.r.top)} ${Math.round(b.r.width)}x${Math.round(b.r.height)}`), hits };
    });
    console.log(`     ${w} controls`, JSON.stringify(overlaps.controls));
    check(`${w}: no two map controls overlap`, overlaps.hits.length === 0, overlaps.hits.join("; ") || "none");
    for (const layout of LAYOUTS) {
      await page.evaluate(async (kind) => {
        const radio = document.querySelector(`input[name="graph-layout"][value="${kind}"]`);
        if (radio && !radio.checked) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
        //: The frame the layout chooses on its own (a layout change clears
        //: `graphAutoFitDone`, so this is the first view a person gets).
        await new Promise((r) => setTimeout(r, 3500));
      }, layout);
      const m = await page.evaluate(() => {
        //: The canvas renderer's own state (`gcTab`): its box, its camera
        //: (the same transform the zoom behaviour holds) and its nodes.
        const s = typeof gcTab !== "undefined" ? gcTab : null;
        const canvas = document.getElementById("graph-canvas");
        const box = canvas.getBoundingClientRect();
        const t = s && s.svg ? d3.zoomTransform(s.svg.node ? s.svg.node() : s.svg) : d3.zoomTransform(canvas);
        const nodes = (s?.nodes || []).filter((n) => Number.isFinite(n.x));
        if (!nodes.length) return { nodes: 0 };
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
        for (const n of nodes) {
          const sx = box.left + t.applyX(n.x);
          const sy = box.top + t.applyY(n.y);
          x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
        }
        const cx = (x0 + x1) / 2 - (box.left + box.width / 2);
        const cy = (y0 + y1) / 2 - (box.top + box.height / 2);
        const root = nodes.find((n) => n.depth === 0);
        const rootAt = root ? [Math.round(((t.applyX(root.x) - box.width / 2) / box.width) * 100), Math.round(((t.applyY(root.y) - box.height / 2) / box.height) * 100)] : null;
        return {
          nodes: nodes.length,
          k: Number(t.k.toFixed(3)),
          map: [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height)],
          drawn: [Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0)],
          inside: x0 >= box.left - 1 && x1 <= box.right + 1 && y0 >= box.top - 1 && y1 <= box.bottom + 1,
          offCentre: [Math.round((cx / box.width) * 100), Math.round((cy / box.height) * 100)],
          useW: Math.round(((x1 - x0) / box.width) * 100),
          useH: Math.round(((y1 - y0) / box.height) * 100),
          rootAt,
        };
      });
      console.log(`     ${w} ${layout}`, JSON.stringify(m));
      //: A tree taller than the map is not squeezed to fit (its rows would be
      //: unreadable): its root is centred instead. Every other layout is
      //: framed whole and centred.
      if (layout === "tree" && !m.inside) {
        check(`${w} tree: the root is centred`, m.rootAt && Math.abs(m.rootAt[1]) <= 12, `root ${m.rootAt}% off`);
      } else {
        check(`${w} ${layout}: every node inside the map`, m.inside, JSON.stringify(m.drawn));
        check(`${w} ${layout}: centred`, m.offCentre && Math.abs(m.offCentre[0]) <= 12 && Math.abs(m.offCentre[1]) <= 12, `${m.offCentre}% off`);
      }
      if (layout === "force" && h > w) check(`${w} force: portrait-shaped on a portrait map`, m.useH >= 60, `${m.useW}% of the width, ${m.useH}% of the height`);
      await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `graph-${TAG}-${w}-${layout}.png`) });
    }
    check(`${w}: no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.evaluate(() => localStorage.setItem("graph-layout", "force"));
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : "the graph fits the screen");
  process.exit(fails ? 1 : 0);
})();
