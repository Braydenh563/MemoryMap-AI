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
        // INBOX 201: the fill, the ink on it, the step of size and the star.
        bg: cs.backgroundColor,
        ink: cs.color,
        textPx: ts ? +parseFloat(ts.fontSize).toFixed(2) : 0,
        icon: node.querySelector(".wb-map-node-icon")?.className || "",
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

  // --- INBOX 201: told apart three ways at once ------------------------------
  // The node above was reset to the branch by the last step, so this pass marks
  // a fresh one and then walks the whole palette on it. The ink is computed per
  // colour in `wbCoreInkFor`, so a single colour proves nothing: the claim is
  // "every palette entry clears 4.5:1", and that is ten measurements.
  const ways = await page.evaluate(async () => {
    const id = wbMapIndex()?.nodes?.find((n) => n.kind === "topic" && n.data?.content === "The core idea")?.id
      || document.querySelector(".wb-map-node")?.closest(".wb-object")?.dataset.id;
    selectWbItem("object", id);
    await new Promise((r) => setTimeout(r, 400));
    document.getElementById("wb-map-core").click();
    await new Promise((r) => setTimeout(r, 800));
    const node = document.querySelector(`.wb-object[data-id="${id}"]`);
    const sibling = [...document.querySelectorAll(".wb-map-node")]
      .map((n) => n.closest(".wb-object"))
      .find((n) => n && n.dataset.id !== id);
    const px = (el) => +parseFloat(getComputedStyle(el.querySelector(".wb-map-text")).fontSize).toFixed(2);
    const marked = {
      radius: Math.round(parseFloat(getComputedStyle(node).borderTopLeftRadius)),
      align: getComputedStyle(node).textAlign,
      shape: node.dataset.shape || "",
      icon: node.querySelector(".wb-map-node-icon")?.className || "",
      core: px(node),
      plain: sibling ? px(sibling) : 0,
      bg: getComputedStyle(node).backgroundColor,
      plainBg: sibling ? getComputedStyle(sibling).backgroundColor : "",
    };

    // A topic given a shape of its own keeps it: the toggle adds, never takes.
    const shapeSelect = document.getElementById("wb-map-shape");
    shapeSelect.value = "rect";
    shapeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 700));
    const chosen = { radius: Math.round(parseFloat(getComputedStyle(node).borderTopLeftRadius)) };
    shapeSelect.value = "";
    shapeSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 700));

    // The palette, entry by entry, read off the rendered node.
    const rgb = (v) => (String(v).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const lum = (c) => {
      const [r, g, b] = c.map((n) => {
        const x = n / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => {
      const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
      return (hi + 0.05) / (lo + 0.05);
    };
    const picker = document.getElementById("wb-map-strip-color");
    const swatches = (window.d3?.schemeTableau10 || []).slice(0, 10);
    const rows = [];
    for (const colour of swatches) {
      picker.value = colour;
      picker.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 450));
      const cs = getComputedStyle(node);
      rows.push({ colour, bg: cs.backgroundColor, ink: cs.color, ratio: +ratio(rgb(cs.backgroundColor), rgb(cs.color)).toFixed(2) });
    }
    return { marked, chosen, rows };
  });

  check("a core idea takes the ellipse without writing a shape",
    ways.marked.radius >= 40 && ways.marked.align === "center" && ways.marked.shape === "",
    `radius ${ways.marked.radius}px, ${ways.marked.align}, shape "${ways.marked.shape}"`);
  check("a shape chosen by hand survives the core mark", ways.chosen.radius === 0,
    `box radius ${ways.chosen.radius}px`);
  check("a core idea is filled, its plain sibling is not",
    ways.marked.bg !== ways.marked.plainBg,
    `${ways.marked.bg} against ${ways.marked.plainBg}`);
  check("a core idea reads one step larger", ways.marked.core > ways.marked.plain,
    `${ways.marked.plain}px -> ${ways.marked.core}px`);
  check("a core idea carries the star", /ph-star/.test(ways.marked.icon), ways.marked.icon || "(none)");
  const worst = ways.rows.reduce((a, r) => (r.ratio < a.ratio ? r : a), ways.rows[0] || { ratio: 0, colour: "(none)" });
  check("the label clears 4.5:1 on every palette entry", ways.rows.length === 10 && worst.ratio >= 4.5,
    `${ways.rows.length} colours, worst ${worst.ratio}:1 on ${worst.colour} (${worst.ink})`);

  await page.screenshot({ path: `${OUT}/mapcore-${process.env.THEME || "light"}.png` });
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed  ${OUT}/mapcore-${process.env.THEME || "light"}.png`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
