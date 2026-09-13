// MINDMAP_PLAN.md item 177, first of the three left: **a core idea**. A node
// marked as the thing a branch hangs off, with its own shape set (rounded
// rectangle, pill, ellipse) and a heavier weight.
//
// Measured, not looked at: the class the paint writes, the field the server
// keeps (the trap this item was written against is `WhiteboardObjectData`
// dropping a field it does not name, so the round trip through the tree
// endpoint is the first check here), the computed weight against a plain
// sibling's, and the strip's own width after a tenth control joined it.
//
//   BASE=http://127.0.0.1:8942 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   timeout 110 node scratchpad/ui-sweeps/mapcore.js
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
      method: "POST", body: JSON.stringify({ name: `core ${Date.now()}`, type: "map" }),
    });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    // `parent_id` is not part of the object payload: the tree is moved, not
    // declared (the same `/move` the transplant uses).
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
    const core = await mk(460, 240, "The core idea", root.id);
    const plain = await mk(460, 420, "An ordinary one", root.id);
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 700));

    const el = (id) => document.querySelector(`.wb-object[data-id="${id}"]`);
    // getComputedStyle is live: every number is taken as a primitive before
    // the next class change, never held as a style object.
    const read = (id) => {
      const node = el(id);
      const cs = getComputedStyle(node);
      const text = node.querySelector(".wb-map-text");
      const ts = text ? getComputedStyle(text) : null;
      return {
        cls: node.className,
        shape: node.dataset.shape || "",
        borderTop: +parseFloat(cs.borderTopWidth).toFixed(2),
        borderLeft: +parseFloat(cs.borderLeftWidth).toFixed(2),
        radius: Math.round(parseFloat(cs.borderTopLeftRadius)),
        padInline: Math.round(parseFloat(cs.paddingLeft)),
        align: cs.textAlign,
        weight: ts ? ts.fontWeight : "",
        shadow: cs.boxShadow.length,
      };
    };
    const before = { core: read(core.id), plain: read(plain.id) };

    // The strip, driven the way a person does: select the node, press the
    // button, read what the server kept.
    selectWbItem("object", core.id);
    await new Promise((r) => setTimeout(r, 500));
    const button = document.getElementById("wb-map-core");
    const stripBox = document.getElementById("wb-map-strip").getBoundingClientRect();
    const canvasBox = document.getElementById("library-view-whiteboard").getBoundingClientRect();
    const pressedBefore = button.getAttribute("aria-pressed");
    button.click();
    await new Promise((r) => setTimeout(r, 900));
    const afterPress = read(core.id);
    const pressedAfter = button.getAttribute("aria-pressed");

    // The round trip, which is the field's real test: the PUT succeeded is
    // not the same claim as the server kept it.
    const tree = await apiJson(`/whiteboard/boards/${board.id}/tree`);
    const stored = JSON.stringify(tree).includes('"core":true');

    // The ellipse, the shape the core idea brought with it.
    const shapeSelect = document.getElementById("wb-map-shape");
    const options = [...shapeSelect.options].map((o) => o.value);
    shapeSelect.value = "ellipse";
    shapeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    const ellipsed = read(core.id);
    const tree2 = await apiJson(`/whiteboard/boards/${board.id}/tree`);
    const ellipseStored = JSON.stringify(tree2).includes('"shape":"ellipse"');

    // Moving the selection to a plain node has to move the button with it.
    selectWbItem("object", plain.id);
    await new Promise((r) => setTimeout(r, 600));
    const pressedOnPlain = document.getElementById("wb-map-core").getAttribute("aria-pressed");

    // Back to the branch clears it, the way it clears the other nine.
    selectWbItem("object", core.id);
    await new Promise((r) => setTimeout(r, 500));
    await wbMapResetToBranch(core.id);
    await new Promise((r) => setTimeout(r, 900));
    const afterReset = read(core.id);

    return {
      before, afterPress, pressedBefore, pressedAfter, stored, options,
      ellipsed, ellipseStored, pressedOnPlain, afterReset,
      strip: { w: Math.round(stripBox.width), h: Math.round(stripBox.height),
        canvasW: Math.round(canvasBox.width), right: Math.round(stripBox.right - canvasBox.right) },
    };
  });

  check("a plain topic starts uncored", !out.before.core.cls.includes("wb-map-core") && out.pressedBefore === "false",
    `${out.before.core.borderLeft}px spine, weight ${out.before.core.weight}`);
  check("the strip's button marks the node", out.afterPress.cls.includes("wb-map-core") && out.pressedAfter === "true");
  check("the server keeps `core` (the dropped-field trap)", out.stored);
  check("a core node is heavier than its plain sibling",
    out.afterPress.borderLeft > out.before.plain.borderLeft
      && out.afterPress.borderTop > out.before.plain.borderTop
      && Number(out.afterPress.weight) > Number(out.before.plain.weight),
    `spine ${out.before.plain.borderLeft} -> ${out.afterPress.borderLeft}px, border ${out.before.plain.borderTop} -> ${out.afterPress.borderTop}px, weight ${out.before.plain.weight} -> ${out.afterPress.weight}`);
  check("a core node carries a ring in its own branch colour",
    out.afterPress.shadow > out.before.plain.shadow,
    `box-shadow ${out.before.plain.shadow} -> ${out.afterPress.shadow} chars`);
  check("the shape picker offers the three of item 177",
    out.options.includes("") && out.options.includes("pill") && out.options.includes("ellipse"),
    JSON.stringify(out.options));
  check("an ellipse is drawn and kept", out.ellipsed.radius >= 40 && out.ellipseStored && out.ellipsed.align === "center",
    `radius ${out.ellipsed.radius}px, padding-inline ${out.ellipsed.padInline}px, ${out.ellipsed.align}`);
  check("the button follows the selection", out.pressedOnPlain === "false");
  check("back to the branch clears the mark", !out.afterReset.cls.includes("wb-map-core"),
    out.afterReset.cls);
  check("the strip still sits inside the canvas", out.strip.right <= 0 && out.strip.w < out.strip.canvasW,
    `strip ${out.strip.w}x${out.strip.h} in ${out.strip.canvasW}, ${out.strip.right}px past the right edge`);

  await page.screenshot({ path: `${OUT}/mapcore-${process.env.THEME || "light"}.png` });
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed  ${OUT}/mapcore-${process.env.THEME || "light"}.png`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
