// **The map rings are pie menus: one ring cut into sectors** (the owner,
// 2026-09-24: "the radial buttons are still clearly separate, I want them to
// be part of the radial, not just buttons sitting ontop of it"; before that,
// INBOX 410: "is there a way to make these mind map item radial options fit
// better in the radials??").
//
// Measured, per ring and per width, off the live DOM:
//   - the hole holds the topic: every corner of the topic's box is inside
//     the ring's inner edge (node ring only; the line ring opens at the
//     pointer);
//   - each action is its sector: the pointer at a sector's middle hits that
//     sector's button, the middle of the hole hits no sector, and a point
//     just past the outer edge hits none;
//   - each sector's icon and word sit inside its own wedge (every corner of
//     the face between the two radii and the two edge angles), and no two
//     faces overlap;
//   - the sectors are evenly spaced (equal angular steps);
//   - the caption hangs clear under the ring, readable, on screen.
//
//   BASE=http://127.0.0.1:8788 SCRATCH=/tmp/mm THEME=light \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapradialfit.js
const { boot } = require("./lib.js");

const WIDTHS = (process.env.SIZES || "1440x900,1184x800,390x844").split(",").map((s) => s.split("x").map(Number));
let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

async function newMap(page, name) {
  await page.evaluate(() => document.querySelector('[data-tab="library"]')?.click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(700);
  await page.evaluate(async (name) => {
    const b = await apiJson("/whiteboard/boards/import", {
      method: "POST",
      body: JSON.stringify({ format: "markdown", name, content: "# Fit\n- Central idea\n  - A child topic" }),
    });
    await openWhiteboardBoard(b.id);
  }, name);
  await page.waitForFunction(() => wbIsMap() && wbMapIndex().roots.length > 0, null, { timeout: 90000 });
  await page.waitForTimeout(1200);
}

function measureRing([id, nodeId]) {
  const ring = document.getElementById(id);
  const o = ring.getBoundingClientRect();
  const cs = getComputedStyle(ring, "::before");
  const outer = parseFloat(cs.width) / 2;
  const inner = outer - parseFloat(cs.borderTopWidth);
  const norm = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const within = (a, a0, a1) => norm(a - a0) <= norm(a1 - a0) + 1e-3;
  const slots = [...ring.querySelectorAll(".wb-map-radial-slot")];
  const faces = slots.map((s) => {
    const sec = s._sector;
    const f = s.querySelector(".wb-map-radial-face").getBoundingClientRect();
    // The face's drawn content, not its fixed box: the icon and the word.
    const parts = [...s.querySelectorAll(".wb-map-radial-face > *")].map((el) => el.getBoundingClientRect()).filter((r) => r.width);
    const box = parts.reduce((b, r) => ({ l: Math.min(b.l, r.left), t: Math.min(b.t, r.top), r: Math.max(b.r, r.right), b: Math.max(b.b, r.bottom) }),
      { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity });
    const corners = [[box.l, box.t], [box.r, box.t], [box.l, box.b], [box.r, box.b]];
    const inside = corners.every(([x, y]) => {
      const d = Math.hypot(x - o.left, y - o.top);
      return d >= inner - 0.5 && d <= outer + 0.5 && within(Math.atan2(y - o.top, x - o.left), sec.a0, sec.a1);
    });
    const worst = Math.max(...corners.map(([x, y]) => {
      const d = Math.hypot(x - o.left, y - o.top);
      return Math.max(inner - d, d - outer, 0);
    }));
    // Clearance (INBOX 421 a): the content box's nearest approach to the
    // inner arc (the box point nearest the centre), the outer arc (its
    // farthest corner) and the two dividers (the perpendicular distance from
    // each corner to each edge line; the box is convex and inside the
    // wedge, so a corner is the nearest point). The divider is the drawn
    // hairline, so its half-width (0.75px) comes off.
    const cx = Math.min(Math.max(o.left, box.l), box.r), cy = Math.min(Math.max(o.top, box.t), box.b);
    const toInner = Math.hypot(cx - o.left, cy - o.top) - inner;
    const toOuter = outer - Math.max(...corners.map(([x, y]) => Math.hypot(x - o.left, y - o.top)));
    const toDiv = Math.min(...[sec.a0, sec.a1].flatMap((a) => corners.map(([x, y]) =>
      Math.abs(-(x - o.left) * Math.sin(a) + (y - o.top) * Math.cos(a)) - 0.75)));
    const mid = (inner + outer) / 2;
    const bcx = (box.l + box.r) / 2 - o.left, bcy = (box.t + box.b) / 2 - o.top;
    const offCentre = Math.hypot(bcx - mid * Math.cos(sec.at), bcy - mid * Math.sin(sec.at));
    const px = o.left + mid * Math.cos(sec.at), py = o.top + mid * Math.sin(sec.at);
    const hit = document.elementFromPoint(px, py)?.closest(".wb-map-radial-slot");
    const past = document.elementFromPoint(o.left + (outer + 6) * Math.cos(sec.at), o.top + (outer + 6) * Math.sin(sec.at))?.closest(".wb-map-radial-slot");
    return { name: s.textContent.trim(), at: (sec.at * 180) / Math.PI, inside, worst, toInner, toOuter, toDiv, offCentre, hitsOwn: hit === s, pastHits: Boolean(past), box, faceW: f.width };
  });
  let overlap = 0;
  for (let i = 0; i < faces.length; i++) for (let j = i + 1; j < faces.length; j++) {
    const a = faces[i].box, b = faces[j].box;
    const w = Math.min(a.r, b.r) - Math.max(a.l, b.l), h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (w > 0 && h > 0) overlap = Math.max(overlap, w * h);
  }
  const angles = faces.map((f) => (f.at + 360) % 360).sort((a, b) => a - b);
  const steps = angles.map((a, i) => ((angles[(i + 1) % angles.length] - a) + 360) % 360 || 360);
  const holeHit = document.elementFromPoint(o.left, o.top)?.closest(".wb-map-radial-slot");
  let holds = null;
  if (nodeId != null) {
    const n = document.querySelector(`.wb-object[data-id="${nodeId}"]`).getBoundingClientRect();
    holds = Math.max(...[[n.left, n.top], [n.right, n.top], [n.left, n.bottom], [n.right, n.bottom]]
      .map(([x, y]) => Math.hypot(x - o.left, y - o.top))) - inner;
  }
  const cap = ring.querySelector(".wb-map-radial-caption");
  cap.textContent = cap.dataset.rest || "";
  const cr = cap.getBoundingClientRect();
  return { outer, inner, faces, overlap, steps, holeHit: Boolean(holeHit), holds,
    capGap: cr.top - (o.top + outer), capFont: parseFloat(getComputedStyle(cap).fontSize),
    capInView: cr.left >= 0 && cr.right <= innerWidth && cr.bottom <= innerHeight };
}

function report(label, m) {
  const spread = Math.max(...m.steps) - Math.min(...m.steps);
  console.log(`  ${label}: ring ${m.inner.toFixed(0)}..${m.outer.toFixed(0)}  ${m.faces.map((f) => `${f.name}@${f.at.toFixed(0)}`).join(" ")}`);
  if (m.holds !== null) check(`${label}: the hole holds the topic`, m.holds <= 0, `farthest corner ${m.holds.toFixed(1)}px ${m.holds <= 0 ? "inside" : "past"} the inner edge`);
  check(`${label}: each sector takes the pointer at its middle`, m.faces.every((f) => f.hitsOwn), m.faces.filter((f) => !f.hitsOwn).map((f) => f.name).join(", "));
  check(`${label}: the hole and the outside take no sector`, !m.holeHit && m.faces.every((f) => !f.pastHits), `hole ${m.holeHit}, past ${m.faces.filter((f) => f.pastHits).length}`);
  check(`${label}: every icon and word inside its own sector`, m.faces.every((f) => f.inside), `worst ${Math.max(...m.faces.map((f) => f.worst)).toFixed(1)}px; ${m.faces.filter((f) => !f.inside).map((f) => f.name).join(", ")}`);
  const clear = (k) => Math.min(...m.faces.map((f) => f[k]));
  console.log(`    clearance: ${m.faces.map((f) => `${f.name} in ${f.toInner.toFixed(1)} out ${f.toOuter.toFixed(1)} div ${f.toDiv.toFixed(1)} off ${f.offCentre.toFixed(1)}`).join(" | ")}`);
  check(`${label}: every label 10px clear of both arcs and both dividers`, clear("toInner") >= 10 && clear("toOuter") >= 10 && clear("toDiv") >= 10,
    `min inner ${clear("toInner").toFixed(1)}, outer ${clear("toOuter").toFixed(1)}, divider ${clear("toDiv").toFixed(1)}`);
  check(`${label}: every label centred on its sector's middle`, Math.max(...m.faces.map((f) => f.offCentre)) <= 1.5,
    `worst ${Math.max(...m.faces.map((f) => f.offCentre)).toFixed(1)}px off`);
  check(`${label}: no two faces overlap`, m.overlap === 0, `largest overlap ${m.overlap.toFixed(0)}px2`);
  check(`${label}: evenly spaced`, spread <= 1, `steps ${m.steps.map((s) => s.toFixed(0)).join("/")}`);
  check(`${label}: caption clear of the ring and readable`, m.capGap >= 0 && m.capFont >= 11 && m.capInView,
    `gap ${m.capGap.toFixed(0)}px, ${m.capFont}px`);
}

(async () => {
  for (const [w, h] of WIDTHS) {
    const touch = w < 600;
    const { browser, page } = await boot({ viewport: { width: w, height: h }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
    await newMap(page, `Radial fit ${w} ${Date.now()}`);
    const ids = await page.evaluate(() => {
      const root = wbMapIndex().roots[0];
      const kid = wbMapIndex().childrenOf.get(root.id)[0];
      return { root: root.id, kid: kid.id };
    });
    await page.evaluate((id) => wbOpenMapRadial(wbState.objects.find((o) => o.id === id)), ids.root);
    await page.waitForTimeout(400);
    report(`${w} node ring`, await page.evaluate(measureRing, ["wb-map-radial", ids.root]));
    await page.screenshot({ path: `${process.env.SCRATCH || "."}/shots/mapradialfit-node-${w}-${process.env.THEME || "light"}.png` });
    await page.evaluate(() => wbCloseMapRadial());
    await page.evaluate((kid) => {
      const host = document.getElementById("library-view-whiteboard").getBoundingClientRect();
      wbOpenMapLinkRadial(kid, host.left + host.width / 2, host.top + host.height / 2);
    }, ids.kid);
    await page.waitForTimeout(400);
    report(`${w} line ring`, await page.evaluate(measureRing, ["wb-map-link-radial", null]));
    await page.screenshot({ path: `${process.env.SCRATCH || "."}/shots/mapradialfit-line-${w}-${process.env.THEME || "light"}.png` });
    await browser.close();
  }
  console.log(failures ? `${failures} failed` : "all passed");
  process.exit(failures ? 1 : 0);
})();
