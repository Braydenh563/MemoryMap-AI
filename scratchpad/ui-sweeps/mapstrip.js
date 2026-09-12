// The map's own node controls: the edit strip, the node radial, the link
// radial, the edge handles, the text-size grip, transplant and sever
// (MINDMAP_PLAN.md §12.1 items 2 to 9).
//
// Drives a real Chromium against a running app and asserts numbers, not
// screenshots: what the strip writes on the node, where it sits, that the
// board's own selection bar stands down on a map node, and that every action
// the radial offers is reachable.
//
//   BASE=http://127.0.0.1:8803 SCRATCH=/tmp/mm-map9 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapstrip.js
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

async function newBoard(page, name, type) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  if (type === "map") await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

(async () => {
  const { browser, page } = await boot();

  await newBoard(page, "Strip map", "map");
  // A root plus one child, so there is a branch as well as a trunk.
  await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    await wbMapAddChild(root.id);
  });
  await page.waitForTimeout(1700);
  await page.keyboard.press("Escape");

  const kidId = await page.evaluate(() => {
    const i = wbMapIndex();
    return i.childrenOf.get(i.roots[0].id)[0].id;
  });

  // --- the strip stands in the board bar's place ----------------------------
  await page.evaluate((id) => selectWbItem("object", id), kidId);
  await page.waitForTimeout(400);
  const placed = await page.evaluate((id) => {
    const strip = document.getElementById("wb-map-strip");
    const bar = document.getElementById("wb-selection-bar");
    const node = document.querySelector(`.wb-object[data-id="${id}"]`);
    const s = strip.getBoundingClientRect();
    const n = node.getBoundingClientRect();
    return {
      stripShown: !strip.classList.contains("hidden") && s.width > 0,
      barHidden: bar.classList.contains("hidden"),
      above: Math.round(n.top - s.bottom),
      dx: Math.round((s.left + s.width / 2) - (n.left + n.width / 2)),
      w: Math.round(s.width),
      h: Math.round(s.height),
    };
  }, kidId);
  check("a map node gets the strip and the board's bar stands down",
    placed.stripShown && placed.barHidden, JSON.stringify(placed));
  check("the strip sits clear above the node and centred on it",
    placed.above > 20 && placed.above < 90 && Math.abs(placed.dx) <= 2,
    JSON.stringify(placed));

  const boardBar = await page.evaluate(() => {
    // A board's own object still gets the board's bar: the split is the map's,
    // not a replacement of the bar everywhere.
    const strip = document.getElementById("wb-map-strip");
    clearWbSelection();
    return strip.classList.contains("hidden");
  });
  check("clearing the selection puts the strip away", boardBar === true);

  // --- what the strip writes -----------------------------------------------
  await page.evaluate((id) => selectWbItem("object", id), kidId);
  await page.waitForTimeout(300);
  await page.click("#wb-map-bold");
  await page.waitForTimeout(700);
  await page.click("#wb-map-italic");
  await page.waitForTimeout(700);
  const marks = await page.evaluate((id) => {
    const node = document.querySelector(`.wb-object[data-id="${id}"]`);
    const text = node.querySelector(".wb-map-text");
    const obj = wbMapIndex().byId.get(id);
    return {
      bold: obj.data?.bold, italic: obj.data?.italic,
      weight: getComputedStyle(text).fontWeight,
      style: getComputedStyle(text).fontStyle,
      pressed: document.getElementById("wb-map-bold").getAttribute("aria-pressed"),
    };
  }, kidId);
  check("bold and italic are stored and drawn",
    marks.bold === true && marks.italic === true
      && Number(marks.weight) >= 600 && marks.style === "italic"
      && marks.pressed === "true",
    JSON.stringify(marks));

  const sized = await page.evaluate(async (id) => {
    const before = getComputedStyle(
      document.querySelector(`.wb-object[data-id="${id}"] .wb-map-text`)).fontSize;
    const select = document.getElementById("wb-map-text-size");
    select.value = "25";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    const after = getComputedStyle(
      document.querySelector(`.wb-object[data-id="${id}"] .wb-map-text`)).fontSize;
    return { before, after, stored: wbMapIndex().byId.get(id).data?.font_size };
  }, kidId);
  check("the size select changes the node's own text size",
    sized.stored === 25 && parseFloat(sized.after) > parseFloat(sized.before),
    JSON.stringify(sized));

  const aligned = await page.evaluate(async (id) => {
    const select = document.getElementById("wb-map-align");
    select.value = "center";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    const node = document.querySelector(`.wb-object[data-id="${id}"]`);
    return {
      stored: wbMapIndex().byId.get(id).data?.align,
      align: getComputedStyle(node.querySelector(".wb-map-text")).textAlign,
    };
  }, kidId);
  check("alignment is stored and drawn", aligned.stored === "center" && aligned.align === "center",
    JSON.stringify(aligned));

  const iconed = await page.evaluate(async (id) => {
    const select = document.getElementById("wb-map-strip-icon");
    select.value = "star";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    const icon = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-node-icon`);
    return {
      stored: wbMapIndex().byId.get(id).data?.icon,
      cls: icon ? icon.className : "",
      shown: icon ? !icon.hidden : false,
      w: icon ? Math.round(icon.getBoundingClientRect().width) : 0,
    };
  }, kidId);
  check("an icon is stored, shown and drawn from Phosphor",
    iconed.stored === "star" && iconed.cls.includes("ph-star") && iconed.shown && iconed.w > 6,
    JSON.stringify(iconed));

  // Read back from the server, which is the only proof the schema kept them:
  // a field Pydantic does not name is dropped silently on the way in, and the
  // browser's own copy would still be showing the value it sent.
  const persisted = await page.evaluate(async (id) => {
    await fetchWhiteboardState();
    const obj = (wbState.objects || []).find((o) => o.id === id);
    return obj ? { bold: obj.data?.bold, italic: obj.data?.italic,
      size: obj.data?.font_size, align: obj.data?.align, icon: obj.data?.icon } : null;
  }, kidId);
  check("and every one of them comes back from the server",
    persisted && persisted.bold === true && persisted.italic === true
      && persisted.size === 25 && persisted.align === "center" && persisted.icon === "star",
    JSON.stringify(persisted));

  // --- the link ------------------------------------------------------------
  const linked = await page.evaluate(async (id) => {
    const obj = (wbState.objects || []).find((o) => o.id === id);
    await wbMapSetNodeStyle(obj, { link: "https://example.org/notes" });
    await new Promise((r) => setTimeout(r, 600));
    const marker = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-link`);
    return { stored: obj.data?.link, shown: marker ? !marker.hidden : false };
  }, kidId);
  check("a topic's link is stored and marked on the node",
    linked.stored === "https://example.org/notes" && linked.shown, JSON.stringify(linked));

  const refused = await page.evaluate(async (id) => {
    const obj = (wbState.objects || []).find((o) => o.id === id);
    try {
      await window.apiJson(`/whiteboard/objects/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          kind: obj.kind, x: obj.x, y: obj.y, width: obj.width, height: obj.height,
          data: { ...obj.data, link: "javascript:alert(1)" },
        }),
      });
      return "accepted";
    } catch (e) {
      return "refused";
    }
  }, kidId);
  check("and a javascript: link is refused by the schema", refused === "refused", refused);

  // --- the node radial (§12.1 item 3) ---------------------------------------
  // Opened by the gesture, not by calling the function: the point of the ring
  // is that right-click reaches it.
  await page.evaluate((id) => selectWbItem("object", id), kidId);
  await page.waitForTimeout(300);
  await page.click(`.wb-object[data-id="${kidId}"]`, { button: "right" });
  await page.waitForTimeout(500);
  const ring = await page.evaluate((id) => {
    const el = document.getElementById("wb-map-radial");
    const node = document.querySelector(`.wb-object[data-id="${id}"]`);
    const n = node.getBoundingClientRect();
    const slots = [...el.querySelectorAll(".wb-map-radial-slot")].map((b) => {
      const r = b.getBoundingClientRect();
      return { id: b.id, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
    const cx = n.left + n.width / 2, cy = n.top + n.height / 2;
    const radii = slots.map((sl) => Math.round(Math.hypot(sl.cx - cx, sl.cy - cy)));
    return {
      open: !el.classList.contains("hidden"),
      role: el.getAttribute("role"),
      flat: document.querySelector(".wb-ctx-menu:not(.hidden)") === null,
      n: slots.length,
      radii,
      spread: Math.max(...radii) - Math.min(...radii),
    };
  }, kidId);
  check("right-click on a topic opens the ring, not the board's flat menu",
    ring.open && ring.flat && ring.n === 8 && ring.role === "toolbar",
    JSON.stringify({ open: ring.open, flat: ring.flat, n: ring.n, role: ring.role }));
  check("its eight slots sit on one circle around the node",
    ring.spread <= 2 && Math.min(...ring.radii) > 40,
    JSON.stringify({ radii: ring.radii, spread: ring.spread }));

  // Alt re-labels the two add slots rather than keeping the swap a secret.
  await page.keyboard.down("Alt");
  await page.waitForTimeout(250);
  const alted = await page.evaluate(() => ({
    icon: document.querySelector("#wb-radial-child i").className,
    danger: document.getElementById("wb-radial-child").classList.contains("wb-map-radial-danger"),
    title: document.getElementById("wb-radial-sibling").title,
  }));
  await page.keyboard.up("Alt");
  await page.waitForTimeout(250);
  const unalted = await page.evaluate(() =>
    document.querySelector("#wb-radial-child i").className);
  check("Alt turns the add slots into the remove slots, and says so",
    alted.icon.includes("ph-trash") && alted.danger
      && /Remove this topic only/.test(alted.title)
      && unalted.includes("elbow"),
    JSON.stringify({ alted, unalted }));

  // A trunk cannot be severed, and the slot says so instead of doing nothing.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const rootId = await page.evaluate(() => wbMapIndex().roots[0].id);
  await page.evaluate((id) => selectWbItem("object", id), rootId);
  await page.click(`.wb-object[data-id="${rootId}"]`, { button: "right" });
  await page.waitForTimeout(400);
  const severState = await page.evaluate(() => {
    const b = document.getElementById("wb-radial-sever");
    return { disabled: b.disabled, title: b.title };
  });
  check("sever is refused on a trunk and says why",
    severState.disabled === true && /already a trunk/.test(severState.title),
    JSON.stringify(severState));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  // Copy a branch: a grandchild first, so there is a shape to copy.
  await page.evaluate(async (id) => {
    await wbMapAddChild(id);
  }, kidId);
  await page.waitForTimeout(1700);
  await page.keyboard.press("Escape");
  const before = await page.evaluate(() => wbMapIndex().nodes.length);
  await page.evaluate((id) => selectWbItem("object", id), kidId);
  await page.click(`.wb-object[data-id="${kidId}"]`, { button: "right" });
  await page.waitForTimeout(400);
  await page.click("#wb-radial-copy");
  await page.waitForTimeout(3000);
  const copied = await page.evaluate((id) => {
    const i = wbMapIndex();
    const source = i.byId.get(id);
    const siblings = i.childrenOf.get(source.parent_id) || [];
    const twin = siblings.find((o) => o.id !== id && o.data?.icon === "star");
    return {
      n: i.nodes.length,
      twin: Boolean(twin),
      twinKids: twin ? (i.childrenOf.get(twin.id) || []).length : 0,
      style: twin ? { icon: twin.data?.icon, bold: twin.data?.bold, size: twin.data?.font_size } : null,
    };
  }, kidId);
  check("copy branch duplicates the whole branch beside it, styling and all",
    copied.n === before + 2 && copied.twin && copied.twinKids === 1
      && copied.style.bold === true && copied.style.size === 25,
    JSON.stringify(copied));

  // Label the line into a topic, and see it drawn.
  const labelled = await page.evaluate(async (id) => {
    const node = wbMapIndex().byId.get(id);
    await wbMapSetNodeStyle(node, { edge_label: "because" });
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 400));
    const text = document.querySelector(".wb-map-edges .wb-map-edge-label");
    const edge = document.querySelector(`.wb-map-edge[data-child="${id}"]`);
    if (!text || !edge) return { drawn: false };
    const t = text.getBoundingClientRect(), e = edge.getBoundingClientRect();
    return {
      drawn: true,
      words: text.textContent,
      onTheEdge: t.left > e.left - 40 && t.right < e.right + 40,
      size: getComputedStyle(text).fontSize,
    };
  }, kidId);
  check("a line's label is drawn on the line it belongs to",
    labelled.drawn && labelled.words === "because" && labelled.onTheEdge,
    JSON.stringify(labelled));

  // Sever, then put it back: the map keeps one more trunk and then loses it.
  const severed = await page.evaluate(async (id) => {
    const roots = wbMapIndex().roots.length;
    await wbMapSever(id);
    await new Promise((r) => setTimeout(r, 1200));
    const after = wbMapIndex();
    return {
      roots, now: after.roots.length,
      parent: after.byId.get(id).parent_id,
      colour: after.byId.get(id).data?.color,
    };
  }, kidId);
  check("sever makes a topic a trunk of its own, branch and all",
    severed.now === severed.roots + 1 && severed.parent === null, JSON.stringify(severed));

  // Back to the branch clears everything the strip and the ring can set.
  const reset = await page.evaluate(async (id) => {
    await wbMapResetToBranch(id);
    await new Promise((r) => setTimeout(r, 900));
    await fetchWhiteboardState();
    const obj = (wbState.objects || []).find((o) => o.id === id);
    return { bold: obj.data?.bold, icon: obj.data?.icon, size: obj.data?.font_size,
      align: obj.data?.align, link: obj.data?.link, label: obj.data?.edge_label };
  }, kidId);
  check("back to the branch drops every look the strip and the ring can set",
    reset && !reset.bold && !reset.icon && !reset.size && !reset.align
      && !reset.link && !reset.label,
    JSON.stringify(reset));

  // --- the link radial (§12.1 item 4) ---------------------------------------
  // Rebuild a parent/child pair: the sever above left `kidId` a trunk.
  await page.evaluate(async (id) => {
    const roots = wbMapIndex().roots;
    const other = roots.find((r) => r.id !== id);
    await window.apiJson(`/whiteboard/boards/${window.currentBoardId}/nodes/${id}/move`, {
      method: "PUT", body: JSON.stringify({ parent_id: other.id }),
    });
    await fetchWhiteboardState();
    renderWhiteboardNow();
  }, kidId);
  await page.waitForTimeout(900);

  const hit = await page.evaluate((id) => {
    const h = document.querySelector(`.wb-map-edge-hit[data-child="${id}"]`);
    const line = document.querySelector(`.wb-map-edge[data-child="${id}"]`);
    if (!h || !line) return null;
    return {
      width: getComputedStyle(h).strokeWidth,
      lineWidth: getComputedStyle(line).strokeWidth,
      events: getComputedStyle(h).pointerEvents,
      groupEvents: getComputedStyle(document.querySelector(".wb-map-edges")).pointerEvents,
      sameD: h.getAttribute("d") === line.getAttribute("d"),
    };
  }, kidId);
  check("a line has a target wide enough to hit, over an inert group",
    hit && hit.events === "stroke" && hit.groupEvents === "none"
      && parseFloat(hit.width) >= 12 && parseFloat(hit.lineWidth) <= 3 && hit.sameD,
    JSON.stringify(hit));

  const box = await page.evaluate((id) => {
    const h = document.querySelector(`.wb-map-edge-hit[data-child="${id}"]`);
    const r = h.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, kidId);
  await page.mouse.click(box.x, box.y, { button: "right" });
  await page.waitForTimeout(500);
  const linkRing = await page.evaluate(() => {
    const el = document.getElementById("wb-map-link-radial");
    return {
      open: !el.classList.contains("hidden"),
      slots: el.querySelectorAll(".wb-map-radial-slot").length,
      curveActive: document.getElementById("wb-link-curve").classList.contains("active"),
      nodeRingClosed: document.getElementById("wb-map-radial").classList.contains("hidden"),
    };
  });
  check("right-click on a line opens the line's own ring",
    linkRing.open && linkRing.slots === 8 && linkRing.curveActive && linkRing.nodeRingClosed,
    JSON.stringify(linkRing));

  await page.click("#wb-link-elbow");
  await page.waitForTimeout(1100);
  const elbowed = await page.evaluate((id) => {
    const line = document.querySelector(`.wb-map-edge[data-child="${id}"]`);
    return { stored: wbMapIndex().byId.get(id).data?.edge_style, d: line.getAttribute("d") };
  }, kidId);
  check("the elbow is stored and the line is redrawn with corners",
    elbowed.stored === "elbow" && elbowed.d.includes("L") && !elbowed.d.includes("C"),
    JSON.stringify(elbowed));

  const dashed = await page.evaluate(async (id) => {
    const node = wbMapIndex().byId.get(id);
    await wbMapSetNodeStyle(node, { edge_dashed: true });
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 500));
    const line = document.querySelector(`.wb-map-edge[data-child="${id}"]`);
    return { dash: getComputedStyle(line).strokeDasharray, cls: line.getAttribute("class") };
  }, kidId);
  check("a dashed line is drawn dashed", /\d/.test(dashed.dash) && dashed.cls.includes("dashed"),
    JSON.stringify(dashed));

  const reversed = await page.evaluate(async (id) => {
    const i = wbMapIndex();
    const child = i.byId.get(id);
    const parentId = child.parent_id;
    await wbMapReverseEdge(id);
    await new Promise((r) => setTimeout(r, 2000));
    const after = wbMapIndex();
    return {
      parentId,
      childNowParentOf: (after.childrenOf.get(id) || []).map((o) => o.id).includes(parentId),
      childParent: after.byId.get(id).parent_id,
    };
  }, kidId);
  check("turning a line around swaps the two topics without a cycle",
    reversed.childNowParentOf && reversed.childParent !== reversed.parentId,
    JSON.stringify(reversed));

  // --- the mid-line plus (§12.1 item 5) -------------------------------------
  const plus = await page.evaluate(() => {
    const layer = document.querySelector(".wb-map-plus-layer");
    const buttons = [...document.querySelectorAll(".wb-map-edge-plus")];
    const edges = document.querySelectorAll(".wb-map-edges .wb-map-edge").length;
    if (!layer || !buttons.length) return null;
    const first = buttons[0];
    const child = first.nextElementSibling;
    return {
      n: buttons.length,
      edges,
      hiddenAtRest: getComputedStyle(first).opacity === "0",
      grabbable: getComputedStyle(first).pointerEvents === "auto",
      layerInert: getComputedStyle(layer).pointerEvents === "none",
      onALine: Boolean(child === null || true),
    };
  });
  check("every visible line carries a mid-point plus, invisible until pointed at",
    plus && plus.n === plus.edges && plus.hiddenAtRest && plus.grabbable && plus.layerInert,
    JSON.stringify(plus));

  // It lands on the line it belongs to: measured against the edge's own path.
  const onLine = await page.evaluate(() => {
    const button = document.querySelector(".wb-map-edge-plus");
    const b = button.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    let best = Infinity;
    for (const edge of document.querySelectorAll(".wb-map-edges .wb-map-edge")) {
      const len = edge.getTotalLength();
      for (let i = 0; i <= 40; i += 1) {
        const p = edge.getPointAtLength((len * i) / 40);
        const svg = edge.ownerSVGElement;
        const pt = svg.createSVGPoint();
        pt.x = p.x; pt.y = p.y;
        const screen = pt.matrixTransform(edge.getScreenCTM());
        best = Math.min(best, Math.hypot(screen.x - cx, screen.y - cy));
      }
    }
    return Math.round(best);
  });
  check("and it sits on the line, not beside it", onLine <= 6, `${onLine}px from the nearest line`);

  const inserted = await page.evaluate(async () => {
    const before = wbMapIndex().nodes.length;
    const button = document.querySelector(".wb-map-edge-plus");
    const parentId = Number(document.querySelector(".wb-map-edges .wb-map-edge")
      .getAttribute("data-parent"));
    const childId = Number(document.querySelector(".wb-map-edges .wb-map-edge")
      .getAttribute("data-child"));
    button.click();
    await new Promise((r) => setTimeout(r, 2500));
    const i = wbMapIndex();
    const child = i.byId.get(childId);
    const middle = child ? i.byId.get(child.parent_id) : null;
    return {
      before, after: i.nodes.length,
      middleIsNew: Boolean(middle) && middle.id !== parentId,
      middleUnderParent: middle ? middle.parent_id === parentId : false,
    };
  });
  await page.keyboard.press("Escape");
  check("the plus puts a new topic between the two it was drawn on",
    inserted.after === inserted.before + 1 && inserted.middleIsNew
      && inserted.middleUnderParent,
    JSON.stringify(inserted));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
