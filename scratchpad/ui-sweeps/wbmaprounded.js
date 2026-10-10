// The owner, 2026-10-10: "the rounded rectangle shape doesnt work on the
// mindmap". Measured before: a core topic drew the ellipse (50%) whichever
// of the strip's two "Rounded" rows was chosen, and the export drew every
// topic as one rounded box (rx 8). Now, through the strip's own select: the
// Rounded row on the centre (a pill by its level), a core topic and a plain
// one draws the rounded rectangle (a radius of at least a small step, not
// a pill, not an ellipse); Box is square; and the SVG export draws each
// topic's own corner.
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbmaprounded.js
const { boot } = require("./lib.js");
let fails = 0, passes = 0;
const check = (ok, what, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}${detail ? "  " + detail : ""}`); ok ? passes++ : fails++; };
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1200);
  await page.evaluate(async () => { await initWhiteboard(); });
  const map = await page.evaluate(async () => apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# R\n- Root\n  - Core idea\n  - Plain", name: "Rounded " + Date.now() }) }));
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id); await page.waitForTimeout(1500);
  const ids = await page.evaluate(async () => {
    const idx = wbMapIndex();
    const by = (t) => idx.nodes.find((n) => wbMapLabel(n) === t).id;
    await wbMapSetNodeStyle(wbState.objects.find((o) => o.id === by("Core idea")), { core: true });
    return { root: by("Root"), core: by("Core idea"), plain: by("Plain") };
  });
  await page.waitForTimeout(400);
  const choose = (id, label) => page.evaluate(async ({ id, label }) => {
    clearWbSelection();
    wbHandleItemClick("object", id, new MouseEvent("click"));
    await new Promise((r) => setTimeout(r, 250));
    const sel = document.getElementById("wb-map-shape");
    const option = [...sel.options].find((o) => o.textContent === label);
    sel.value = option.value;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const el = document.querySelector(`.wb-object[data-id="${id}"]`);
    const r = el.getBoundingClientRect();
    return { stored: wbState.objects.find((o) => o.id === id).data.shape ?? null, radius: getComputedStyle(el).borderTopLeftRadius, h: Math.round(r.height), rows: [...sel.options].map((o) => o.textContent) };
  }, { id, label });
  for (const [name, id] of Object.entries(ids)) {
    const r = await choose(id, "Rounded");
    const px = parseFloat(r.radius);
    check(/px$/.test(r.radius) && px >= 6 && px < r.h / 2, `${name}: Rounded draws the rounded rectangle`, JSON.stringify(r));
  }
  const box = await choose(ids.plain, "Box");
  check(box.radius === "0px", "Box is square", JSON.stringify(box));
  await choose(ids.plain, "Rounded");
  await choose(ids.root, "Ellipse");
  const svg = await page.evaluate(async (ids) => {
    const out = await wbBuildExportSvg("all");
    const text = typeof out === "string" ? out : out?.svg || "";
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const rects = [...doc.querySelectorAll("rect[ry]")].map((r) => ({ w: +r.getAttribute("width"), h: +r.getAttribute("height"), rx: +r.getAttribute("rx"), ry: +r.getAttribute("ry") })).filter((r) => r.w > 20);
    const on = (id) => { const el = document.querySelector(`.wb-object[data-id="${id}"]`); return getComputedStyle(el).borderTopLeftRadius; };
    return { rects, root: on(ids.root), plain: on(ids.plain) };
  }, ids);
  const ellipse = svg.rects.find((r) => Math.abs(r.rx - r.w / 2) < 1 && Math.abs(r.ry - r.h / 2) < 1);
  const rounded = svg.rects.filter((r) => Math.abs(r.rx - parseFloat(svg.plain)) < 0.6);
  check(Boolean(ellipse) && rounded.length >= 2, "the export draws each topic's own corner (an ellipse, the rounded rectangles)", JSON.stringify(svg));
  check(!errors.length, "no page errors", errors.join(" | ").slice(0, 300));
  console.log(`${passes}/${passes + fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
