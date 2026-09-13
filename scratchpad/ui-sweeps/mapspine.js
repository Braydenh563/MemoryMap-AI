// MINDMAP_PLAN.md item 177, second of the three left: **the bar down a
// topic's edge**, solid, dashed or none, per topic.
//
// The bar is the strongest thing a node wears, so what is measured here is the
// edge itself: its width, its style and its colour before and after, the
// interaction with the three rules that write the same edge (a core node's
// weight, a plain topic's transparent box, and a downward map where the bar is
// the top edge), and the round trip through the tree endpoint, which is the
// half of a style field that can silently vanish.
//
//   BASE=http://127.0.0.1:8942 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   timeout 110 node scratchpad/ui-sweeps/mapspine.js
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
      method: "POST", body: JSON.stringify({ name: `spine ${Date.now()}`, type: "map" }),
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
    const root = await mk(180, 360, "Root");
    const kid = await mk(460, 260, "A topic with a bar", root.id);
    const plain = await mk(460, 440, "A plain topic", root.id);
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 700));

    // Every value is read as a primitive: getComputedStyle is live, and the
    // next line changes the class the one before it measured.
    const read = (id) => {
      const node = document.querySelector(`.wb-object[data-id="${id}"]`);
      const cs = getComputedStyle(node);
      return {
        spine: node.dataset.spine || "",
        w: +parseFloat(cs.borderLeftWidth).toFixed(2),
        style: cs.borderLeftStyle,
        colour: cs.borderLeftColor,
        topW: +parseFloat(cs.borderTopWidth).toFixed(2),
        topStyle: cs.borderTopStyle,
        hairline: +parseFloat(cs.borderRightWidth).toFixed(2),
        hairColour: cs.borderRightColor,
        textLeft: Math.round(node.querySelector(".wb-map-text").getBoundingClientRect().left),
      };
    };
    const set = async (id, value) => {
      selectWbItem("object", id);
      await new Promise((r) => setTimeout(r, 400));
      const select = document.getElementById("wb-map-spine");
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 900));
      return read(id);
    };

    const solid = read(kid.id);
    const dashed = await set(kid.id, "dashed");
    const none = await set(kid.id, "none");
    const tree = await apiJson(`/whiteboard/boards/${board.id}/tree`);
    const stored = (tree.roots[0].children || []).map((c) => c.style?.spine || "");

    // Back to solid stores nothing at all, the way "M" and "rounded" do.
    const back = await set(kid.id, "");
    const tree2 = await apiJson(`/whiteboard/boards/${board.id}/tree`);
    const clean = !JSON.stringify(tree2).includes('"spine"');

    // A plain topic has no box: the choice must not paint an edge back on it
    // or move its label.
    selectWbItem("object", plain.id);
    await new Promise((r) => setTimeout(r, 400));
    const shape = document.getElementById("wb-map-shape");
    shape.value = "none";
    shape.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    const plainBefore = read(plain.id);
    const plainAfter = await set(plain.id, "none");

    // A core node whose bar is quieted is still core, and the explicit choice
    // wins over the weight the mark gave the same edge.
    selectWbItem("object", kid.id);
    await new Promise((r) => setTimeout(r, 400));
    document.getElementById("wb-map-core").click();
    await new Promise((r) => setTimeout(r, 900));
    const cored = read(kid.id);
    const coredQuiet = await set(kid.id, "none");
    const stillCore = document.querySelector(`.wb-object[data-id="${kid.id}"]`).className.includes("wb-map-core");

    // Downward, the bar is the top edge, so the choice has to move with it.
    await wbMapSetLayout("tree-down");
    await new Promise((r) => setTimeout(r, 1200));
    const downQuiet = read(kid.id);
    const downDashed = await set(kid.id, "dashed");

    return {
      solid, dashed, none, stored, back, clean,
      plainBefore, plainAfter, cored, coredQuiet, stillCore, downQuiet, downDashed,
    };
  });

  check("a topic starts with the solid bar the map has always drawn",
    out.solid.spine === "" && out.solid.w >= 4 && out.solid.style === "solid",
    `${out.solid.w}px ${out.solid.style} ${out.solid.colour}`);
  check("dashed dashes the bar and leaves its weight",
    out.dashed.style === "dashed" && out.dashed.w === out.solid.w,
    `${out.dashed.w}px ${out.dashed.style}`);
  check("none drops the bar to the hairline the other sides are",
    out.none.w === out.none.hairline && out.none.colour === out.none.hairColour,
    `${out.solid.w}px -> ${out.none.w}px, ${out.none.colour} against ${out.none.hairColour}`);
  check("the label moves with the bar rather than staying over it",
    out.none.textLeft < out.solid.textLeft,
    `text left ${out.solid.textLeft} -> ${out.none.textLeft}`);
  check("the server keeps `spine` (the dropped-field trap)",
    out.stored.includes("none"), JSON.stringify(out.stored));
  check("solid stores nothing at all", out.clean && out.back.w === out.solid.w,
    `${out.back.w}px ${out.back.style}`);
  check("a plain topic is untouched by the choice",
    out.plainAfter.w === out.plainBefore.w && out.plainAfter.textLeft === out.plainBefore.textLeft,
    `${out.plainBefore.w}px/${out.plainBefore.textLeft} -> ${out.plainAfter.w}px/${out.plainAfter.textLeft}`);
  check("the choice wins over a core node's heavier bar, and it stays core",
    out.coredQuiet.w < out.cored.w && out.stillCore,
    `core ${out.cored.w}px -> quiet ${out.coredQuiet.w}px`);
  check("downward, the choice is on the top edge",
    out.downQuiet.topW < 4 && out.downDashed.topStyle === "dashed" && out.downDashed.style === "solid",
    `top ${out.downQuiet.topW}px quiet, ${out.downDashed.topW}px ${out.downDashed.topStyle} dashed`);

  await page.screenshot({ path: `${OUT}/mapspine-${process.env.THEME || "light"}.png` });
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed  ${OUT}/mapspine-${process.env.THEME || "light"}.png`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
