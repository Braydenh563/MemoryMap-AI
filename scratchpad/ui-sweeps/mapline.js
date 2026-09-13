// MINDMAP_PLAN.md item 177, the last of the three: **connection line styles**,
// per-branch thickness, dash and arrowhead, from the map strip rather than one
// global rule.
//
// The thing worth measuring is that a thickness scales the *drawing*, not only
// a stroke: the default curve is a tapered filled ribbon (`wbMapRibbonD`), so
// a control that only wrote `stroke-width` would visibly do nothing on most of
// a map. So the ribbon's own width is read off its path at both ends, the
// stroked shapes' widths off `getComputedStyle`, and both are read on a
// sibling as well, since "per-branch" is the whole point.
//
//   BASE=http://127.0.0.1:8942 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   timeout 110 node scratchpad/ui-sweeps/mapline.js
const { boot, OUT } = require("./lib.js");

const VIEWPORT = (() => {
  const raw = process.env.VIEWPORT;
  if (!raw) return { width: 1440, height: 900 };
  const [w, h] = raw.split("x").map(Number);
  return { width: w || 1440, height: h || 900 };
})();

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

(async () => {
  const { page, browser } = await boot({ viewport: VIEWPORT });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);

  const out = await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    const board = await apiJson("/whiteboard/boards", {
      method: "POST", body: JSON.stringify({ name: `lines ${Date.now()}`, type: "map" }),
    });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    const mk = async (x, y, text, parent) => {
      const made = await apiJson("/whiteboard/objects", {
        method: "POST",
        body: JSON.stringify({ board_id: board.id, kind: "topic", x, y, width: 170, height: 52, data: { content: text } }),
      });
      if (parent) {
        Object.assign(made, await apiJson(`/whiteboard/boards/${board.id}/nodes/${made.id}/move`, {
          method: "PUT", body: JSON.stringify({ parent_id: parent }),
        }));
      }
      return made;
    };
    const root = await mk(160, 380, "Root");
    const heavy = await mk(470, 220, "The heavy branch", root.id);
    const other = await mk(470, 400, "Its neighbour", root.id);
    const line = await mk(470, 560, "A straight one", root.id);
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 700));

    // The ribbon's own thickness at each end, from its path: the forward run
    // and the reversed back run are the two sides of the shape, so the first
    // and last matching pairs are its width at the parent and at the child.
    const edge = (id) => {
      const el = document.querySelector(`.wb-map-edge[data-child="${id}"]`);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const d = el.getAttribute("d") || "";
      const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      const points = (d.match(/[ML]/g) || []).length;
      const width = (i, j) => +Math.hypot(nums[i] - nums[j], nums[i + 1] - nums[j + 1]).toFixed(2);
      return {
        cls: el.getAttribute("class"),
        fill: cs.fill,
        stroke: +parseFloat(cs.strokeWidth || 0).toFixed(2),
        marker: cs.markerEnd,
        points,
        atParent: nums.length >= 4 ? width(0, nums.length - 2) : null,
        // The last pair of the body, which for a headed ribbon is the barb.
        // A head adds a single tip point between the two sides, so an odd
        // number of points is what says where the far end's pair sits.
        atChild: (() => {
          if (points < 8) return null;
          const tipped = points % 2 === 1;
          const side = tipped ? (points - 1) / 2 : points / 2;
          return width(2 * (side - 1), 2 * (tipped ? side + 1 : side));
        })(),
      };
    };
    const pick = async (id) => {
      selectWbItem("object", id);
      await new Promise((r) => setTimeout(r, 450));
    };
    const setWidth = async (id, value) => {
      await pick(id);
      const select = document.getElementById("wb-map-edge-width");
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 1000));
      return edge(id);
    };
    const press = async (id, button) => {
      await pick(id);
      document.getElementById(button).click();
      await new Promise((r) => setTimeout(r, 1000));
      return edge(id);
    };

    const before = edge(heavy.id);
    const thick = await setWidth(heavy.id, "thick");
    const neighbour = edge(other.id);
    const thin = await setWidth(other.id, "thin");

    // The arrowhead on a ribbon is part of the path, since a marker on a
    // closed outline would be placed back at the parent.
    const headed = await press(heavy.id, "wb-map-edge-arrow");
    const arrowPressed = document.getElementById("wb-map-edge-arrow").getAttribute("aria-pressed");

    // The three stroked shapes keep their stroke, and their own thickness.
    await pick(line.id);
    await wbMapSetNodeStyle(wbMapIndex().byId.get(line.id), { edge_style: "straight" });
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 900));
    const straight = edge(line.id);
    const straightThick = await setWidth(line.id, "thick");
    const headless = await press(line.id, "wb-map-edge-arrow");
    const dashed = await press(line.id, "wb-map-edge-dashed");

    const tree = await apiJson(`/whiteboard/boards/${board.id}/tree`);
    const stored = (tree.roots[0].children || []).map((c) => [
      c.style?.edge_width || "", c.style?.edge_arrow || "", c.style?.edge_dashed ? "dashed" : "",
    ].join("/"));

    // A trunk has no line above it, so the group is put away rather than left
    // writing a field nothing draws.
    await pick(root.id);
    // The *shell*, not the bare select: `enhanceSelect` draws its own opener
    // beside a 1px real select, so measuring the select would report a group
    // as put away while its visible half was still on screen.
    const lineGroup = () => [...document.querySelectorAll("#wb-map-strip [data-wb-map-line]")]
      .map((el) => Math.round((el.closest(".select-shell") || el).getBoundingClientRect().width));
    const onTrunk = lineGroup();
    await pick(heavy.id);
    const onChild = lineGroup();
    const strip = document.getElementById("wb-map-strip").getBoundingClientRect();
    const host = document.getElementById("library-view-whiteboard").getBoundingClientRect();

    return {
      before, thick, neighbour, thin, headed, arrowPressed,
      straight, straightThick, headless, dashed, stored, onTrunk, onChild,
      strip: { w: Math.round(strip.width), h: Math.round(strip.height),
        hostW: Math.round(host.width), past: Math.round(strip.right - host.right) },
    };
  });

  check("a default branch is still the tapered ribbon",
    out.before.cls.includes("wb-map-edge-ribbon") && out.before.marker === "none" && out.before.atParent > 5,
    `${out.before.atParent} to ${out.before.atChild} units, fill ${out.before.fill}`);
  check("thick scales the ribbon itself, not a stroke",
    out.thick.atParent > out.before.atParent * 1.5,
    `${out.before.atParent} -> ${out.thick.atParent} at the parent`);
  check("its neighbour is untouched (per branch, not per board)",
    out.neighbour.atParent === out.before.atParent,
    `neighbour ${out.neighbour.atParent}`);
  check("thin scales it the other way",
    out.thin.atParent < out.before.atParent * 0.7,
    `${out.before.atParent} -> ${out.thin.atParent} at the parent`);
  check("an arrowhead on a ribbon is drawn into the path",
    out.headed.points === out.thick.points + 3 && out.headed.atChild > out.thick.atChild,
    `${out.thick.points} -> ${out.headed.points} points, barb ${out.thick.atChild} -> ${out.headed.atChild}`);
  check("the button reads the effective state", out.arrowPressed === "true");
  check("a straight line keeps its stroke and its head",
    out.straight.stroke === 3 && out.straight.marker.includes("wb-map-arrow"),
    `${out.straight.stroke}px, marker ${out.straight.marker}`);
  check("thick widens that stroke by the same step",
    out.straightThick.stroke > out.straight.stroke * 1.5,
    `${out.straight.stroke} -> ${out.straightThick.stroke}px`);
  check("the head can come off a stroked line",
    out.headless.marker === "none" && out.headless.cls.includes("headless"),
    out.headless.cls);
  check("the dash is on the strip as well as the ring",
    out.dashed.cls.includes("wb-map-edge-dashed"), out.dashed.cls);
  check("the server keeps all three (the dropped-field trap)",
    out.stored.join(" ").includes("thick/on") && out.stored.join(" ").includes("thin"),
    JSON.stringify(out.stored));
  check("a trunk is shown no line controls",
    out.onTrunk.every((w) => w === 0) && out.onChild.every((w) => w > 0),
    `trunk ${JSON.stringify(out.onTrunk)}, child ${JSON.stringify(out.onChild)}`);
  check("the strip still sits inside the canvas",
    out.strip.past <= 0 && out.strip.w <= out.strip.hostW,
    `strip ${out.strip.w}x${out.strip.h} in ${out.strip.hostW}, ${out.strip.past}px past the right edge`);

  await page.screenshot({ path: `${OUT}/mapline-${process.env.THEME || "light"}.png` });
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed  ${OUT}/mapline-${process.env.THEME || "light"}.png`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
