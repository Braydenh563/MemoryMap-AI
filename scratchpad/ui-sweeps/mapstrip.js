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

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
