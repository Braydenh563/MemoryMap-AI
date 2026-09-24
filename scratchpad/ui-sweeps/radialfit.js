// What the node radial actually covers (INBOX 114, "fix the look of the
// mindmap item radial").
//
// The ring is a pie menu now (ccd1b48): one band, cut into sectors, whose
// hole is sized to the selected topic (`wbSizeMapRadial`; MINDMAP_PLAN). The
// old tiles-on-a-circle overlap question ("does a slot land on the node it
// acts on") is answered structurally by the hole rather than by six separate
// boxes, but the band itself is not aware of *other* topics, so a real
// question survives: does the band land on a neighbouring topic or a link
// line. Every slot's `getBoundingClientRect()` is now the whole ring's
// square (clip-path only clips the paint, not the box), so this measures
// what a pointer actually hits (`elementFromPoint`, sampled on a grid over
// each candidate box) rather than bounding-rect intersection, which would
// call every slot "over" everything inside the ring's outer circle.
//
//   BASE=http://127.0.0.1:8853 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/radialfit.js
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
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await newBoard(page, "Radial fit", "map");
  // A trunk, three children and a grandchild: enough that a ring around one
  // child has a sibling and a line beside it, which is the second screenshot.
  await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    await wbMapAddChild(root.id);
    await wbMapAddChild(root.id);
    await wbMapAddChild(root.id);
    const kid = wbMapIndex().childrenOf.get(root.id)[0];
    await wbMapAddChild(kid.id);
  });
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  const kidId = await page.evaluate(() => {
    const i = wbMapIndex();
    return i.childrenOf.get(i.roots[0].id)[0].id;
  });
  await page.evaluate((id) => selectWbItem("object", id), kidId);
  await page.waitForTimeout(300);
  await page.click(`.wb-object[data-id="${kidId}"]`, { button: "right" });
  await page.waitForTimeout(500);

  const m = await page.evaluate((id) => {
    const el = document.getElementById("wb-map-radial");
    const node = document.querySelector(`.wb-object[data-id="${id}"]`);
    const n = node.getBoundingClientRect();
    const o = el.getBoundingClientRect(); // width:0 height:0, positioned at the ring's own centre
    const cx = o.left, cy = o.top;
    const s0 = [...el.querySelectorAll(".wb-map-radial-slot")].find((s) => s._sector)?._sector;
    const inner = s0 ? s0.inner : 0;
    // A grid of points across a box, so overlap is asked of the browser's own
    // hit-testing (clip-path and all) rather than of a bounding-rect compare
    // that cannot see the wedge.
    const grid = (r, steps = 4) => {
      const pts = [];
      for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) {
        pts.push([r.left + (r.width * i) / steps, r.top + (r.height * j) / steps]);
      }
      return pts;
    };
    const hitsRing = (r) => grid(r).some(([x, y]) => document.elementFromPoint(x, y)?.closest(".wb-map-radial-slot"));
    const others = [...document.querySelectorAll(".wb-object")]
      .filter((obj) => obj.dataset.id !== String(id))
      .map((obj) => obj.getBoundingClientRect());
    const lines = [...document.querySelectorAll(".wb-map-edge")].map((l) => l.getBoundingClientRect());
    // The hole's own margin past the node's farthest corner: negative means
    // the hole is too small and the band would paint over the node.
    const holds = inner - Math.max(...[[n.left, n.top], [n.right, n.top], [n.left, n.bottom], [n.right, n.bottom]]
      .map(([x, y]) => Math.hypot(x - cx, y - cy)));
    const strip = document.getElementById("wb-map-strip");
    const sr = strip && !strip.classList.contains("hidden") ? strip.getBoundingClientRect() : null;
    return {
      node: { w: Math.round(n.width), h: Math.round(n.height) },
      inner: Math.round(inner),
      stripShown: Boolean(sr),
      overStrip: sr ? hitsRing(sr) : false,
      overNode: hitsRing(n),
      holds: Math.round(holds),
      overOther: others.filter((rr) => hitsRing(rr)).length,
      overLine: lines.filter((rr) => hitsRing(rr)).length,
      otherCount: others.length,
      lineCount: lines.length,
    };
  }, kidId);
  console.log(JSON.stringify(m, null, 1));
  check("no slot is drawn over the topic it acts on", !m.overNode, String(m.overNode));
  check("the hole clears the node's farthest corner", m.holds >= 0, `${m.holds}px past the inner edge`);
  const place = await page.evaluate((id) => {
    const host = document.getElementById("library-view-whiteboard").getBoundingClientRect();
    const strip = document.getElementById("wb-map-strip").getBoundingClientRect();
    const n = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    const bar = document.getElementById("wb-topbar").getBoundingClientRect();
    const ring = [...document.querySelectorAll("#wb-map-radial .wb-map-radial-slot")].map((b) => b.getBoundingClientRect());
    return {
      hostTop: Math.round(host.top), barBottom: Math.round(bar.bottom),
      nodeTop: Math.round(n.top), nodeBottom: Math.round(n.bottom),
      stripTop: Math.round(strip.top), stripH: Math.round(strip.height),
      ringTop: Math.round(Math.min(...ring.map((r) => r.top))),
      ringBottom: Math.round(Math.max(...ring.map((r) => r.bottom))),
    };
  }, kidId);
  console.log("placement " + JSON.stringify(place));
  // wbMapRadialOverhang (the edge-clamp helper this used to call) was folded
  // into wbPlaceMapRadial itself by the pie-ring rewrite (ccd1b48) and is no
  // longer a standalone function; the node's own box, still live, is enough
  // to see where the topic sits relative to the floor the ring must clear.
  console.log("gaps " + JSON.stringify(await page.evaluate(() => {
    const host = document.getElementById("library-view-whiteboard").getBoundingClientRect();
    const container = document.getElementById("whiteboard-container");
    const t = d3.zoomTransform(container);
    const rect = container.getBoundingClientRect();
    const node = wbMapRadialNode();
    const box = wbItemBBox("object", node);
    const top = rect.top - host.top + t.applyY(box.minY);
    const bottom = rect.top - host.top + t.applyY(box.maxY);
    const strip = document.getElementById("wb-map-strip");
    return { top, bottom,
      h: strip.offsetHeight, w: strip.offsetWidth,
      floor: document.getElementById("wb-topbar").getBoundingClientRect().bottom - host.top + 10 };
  })));
  console.log("re-place " + JSON.stringify(await page.evaluate(() => {
    const before = Math.round(document.getElementById("wb-map-strip").getBoundingClientRect().top);
    wbUpdateSelectionBar();
    return { before, after: Math.round(document.getElementById("wb-map-strip").getBoundingClientRect().top),
      radialFor: wbMapRadialFor, selected: JSON.stringify(wbSelectedItem) };
  })));
  console.log(`neighbours touched: ${m.overOther}/${m.otherCount}, links touched: ${m.overLine}/${m.lineCount}, strip touched: ${m.overStrip}`);
  await page.screenshot({ path: process.env.SHOT || "/tmp/radialfit.png" });

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
})();
