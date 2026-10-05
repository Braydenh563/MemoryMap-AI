// Bends on straight and curved connectors, and line jumps (wb-phase2 step 1).
// A straight or curved connector shows a ring to add a bend; dragging it saves
// a waypoint the line runs through (a curve through it smoothly); a
// double-click on the line adds another in order; a bend's own double-click
// takes it out; Undo puts each back; changing the line shape keeps the bends.
// A connector set to jump hops over one under it (arc, gap, sharp), from the
// Format panel's Line jumps.
//   BASE=http://127.0.0.1:8795 W=1440 H=900 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbwaypoints.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

(async () => {
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
  const { browser, page, errors, board } = await openBoard({ viewport: { width: W, height: H } });
  const ids = await page.evaluate(async (bid) => {
    const rect = (x, y) => `M ${x} ${y} L ${x + 120} ${y} L ${x + 120} ${y + 70} L ${x} ${y + 70} Z`;
    const post = async (data, z = 1) => (await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(data), x: 0, y: 0, z, board_id: bid }) })).id;
    const a = await post({ d: rect(0, 0), shape: "rect", color: "#335599", width: 2 });
    const b = await post({ d: rect(520, 0), shape: "rect", color: "#335599", width: 2 });
    const c = await post({ d: rect(0, 300), shape: "rect", color: "#335599", width: 2 });
    const e = await post({ d: rect(520, 300), shape: "rect", color: "#335599", width: 2 });
    const straight = await post({ type: "link-straight", sourceId: a, sourceKind: "sketch", targetId: b, targetKind: "sketch", color: "#222222", width: 2, endCap: "arrow", label: "yes" }, 3);
    const curved = await post({ type: "link-curved", sourceId: c, sourceKind: "sketch", targetId: e, targetKind: "sketch", color: "#222222", width: 2, endCap: "arrow" }, 3);
    // An upright line under both, crossing them, for the jumps.
    const upright = await post({ type: "link-straight", sourcePoint: { x: 330, y: -60 }, targetPoint: { x: 330, y: 420 }, color: "#aa3333", width: 2 }, 2);
    await fetchWhiteboardState();
    renderWhiteboardNow();
    wbZoomToFit();
    return { a, b, c, e, straight, curved, upright };
  }, board.id);
  await page.waitForTimeout(800);

  const select = async (id) => {
    await page.evaluate((id) => { clearWbSelection(); selectWbItem("sketch", id); }, id);
    await page.waitForTimeout(500);
  };
  const grips = () => page.evaluate(() => {
    const at = (el) => { const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; };
    const hit = (p) => { const el = document.elementFromPoint(p.x, p.y); return el ? el.getAttribute("class") : null; };
    const add = [...document.querySelectorAll(".wb-link-waypoint-add")].map((g) => ({ ...at(g), hit: hit(at(g)), title: g.querySelector("title")?.textContent }));
    const bends = [...document.querySelectorAll(".wb-link-waypoint-handle")].map((g) => ({ ...at(g), hit: hit(at(g)) }));
    return { add, bends, oldBend: document.querySelectorAll(".wb-link-bend-handle").length };
  });
  const stored = (id) => page.evaluate((id) => JSON.parse(wbFindItem("sketch", id).data), id);
  const shaft = (id) => page.evaluate((id) => document.querySelector(`.sketch-group[data-id="${id}"] .sketch-path`).getAttribute("d").split(/\s(?=M)/)[0], id);
  const drag = async (p, dx, dy) => {
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    await page.mouse.move(p.x + dx, p.y + dy, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(900);
  };

  // 1. A straight connector: one ring in its middle, hittable and titled; no old bend handle.
  await select(ids.straight);
  let g = await grips();
  check("a straight connector shows one ring to add a bend, titled, on top", g.add.length === 1 && /add a bend/i.test(g.add[0].title || "") && /waypoint-add/.test(g.add[0].hit || ""), g);
  check("and no separate bend handle", g.oldBend === 0, g.oldBend);
  await drag(g.add[0], 0, 80);
  let s = await stored(ids.straight);
  let d = await shaft(ids.straight);
  check("dragging it saves one waypoint", Array.isArray(s.points) && s.points.length === 1, s.points);
  check("and the straight line runs through it in two straight runs", /^M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+$/.test(d) && d.includes(`L ${s.points[0].x} ${s.points[0].y}`), d);
  g = await grips();
  check("the bend is a grip, with a ring on each side to add another", g.bends.length === 1 && g.add.length === 2, { bends: g.bends.length, add: g.add.length });

  // 2. A double-click on the line adds a second bend, in order.
  const second = await page.evaluate((id) => {
    const p = JSON.parse(wbFindItem("sketch", id).data).points[0];
    const ends = wbResolveLinkEndpoints(JSON.parse(wbFindItem("sketch", id).data));
    const q = { x: (p.x + ends.target.x) / 2, y: (p.y + ends.target.y) / 2 };
    const svg = document.getElementById("wb-svg-layer");
    const pt = svg.createSVGPoint();
    pt.x = q.x; pt.y = q.y;
    const sp = pt.matrixTransform(document.getElementById("wb-zoom-group").getScreenCTM());
    return { x: sp.x, y: sp.y };
  }, ids.straight);
  await page.mouse.dblclick(second.x, second.y);
  await page.waitForTimeout(900);
  s = await stored(ids.straight);
  check("a double-click on the line adds a bend after the first", s.points?.length === 2 && s.points[1].x > s.points[0].x, s.points);

  // 3. Double-click a bend takes it out; Undo brings it back.
  await select(ids.straight);
  g = await grips();
  await page.mouse.dblclick(g.bends[1].x, g.bends[1].y);
  await page.waitForTimeout(900);
  s = await stored(ids.straight);
  check("double-clicking a bend takes it out", s.points?.length === 1, s.points);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(900);
  s = await stored(ids.straight);
  check("Undo puts it back", s.points?.length === 2, s.points);

  // 4. A curved connector: a bend makes one smooth curve through it.
  await select(ids.curved);
  g = await grips();
  check("a curved connector shows a ring to add a bend", g.add.length === 1 && /waypoint-add/.test(g.add[0].hit || ""), g.add);
  await drag(g.add[0], 0, -70);
  s = await stored(ids.curved);
  d = await shaft(ids.curved);
  const through = await page.evaluate(([id, p]) => {
    const path = document.querySelector(`.sketch-group[data-id="${id}"] .sketch-path`);
    const m = document.createElementNS("http://www.w3.org/2000/svg", "path");
    m.setAttribute("d", path.getAttribute("d").split(/\s(?=M)/)[0]);
    document.getElementById("wb-zoom-group").appendChild(m);
    let best = Infinity;
    const L = m.getTotalLength();
    for (let i = 0; i <= 400; i++) { const q = m.getPointAtLength((L * i) / 400); best = Math.min(best, Math.hypot(q.x - p.x, q.y - p.y)); }
    m.remove();
    return best;
  }, [ids.curved, s.points?.[0] || { x: 0, y: 0 }]);
  check("a curved bend is saved and the curve is two smooth segments through it", s.points?.length === 1 && (d.match(/ C /g) || []).length === 2 && through < 2, { d, through });

  // 5. Line shape kept: elbow keeps the bend.
  await page.evaluate(() => wbSetLinkRoute("elbow"));
  await page.waitForTimeout(900);
  s = await stored(ids.curved);
  check("turning it into an elbow keeps its bend", s.route === "elbow" && s.points?.length === 1, s);
  await page.evaluate(() => wbSetLinkRoute("curved"));
  await page.waitForTimeout(900);

  // 6. Line jumps, from the Format panel.
  await select(ids.straight);
  await page.evaluate(() => wbFormatOpen("style", { focus: false }));
  await page.waitForTimeout(500);
  const row = await page.evaluate(() => {
    const el = document.getElementById("wb-fmt-jumps");
    const r = el?.closest("[data-fmt]");
    return { shown: Boolean(r && !r.hidden && r.getBoundingClientRect().height > 0), value: el?.value };
  });
  check("the Format panel offers Line jumps for a connector", row.shown && row.value === "none", row);
  const pick = (v) => page.evaluate((v) => { const el = document.getElementById("wb-fmt-jumps"); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); }, v);
  for (const style of ["arc", "gap", "sharp"]) {
    await pick(style);
    await page.waitForTimeout(900);
    s = await stored(ids.straight);
    const both = await page.evaluate((id) => {
      const g = document.querySelector(`.sketch-group[data-id="${id}"]`);
      return { path: g.querySelector(".sketch-path").getAttribute("d"), hit: g.querySelector(".sketch-hitbox").getAttribute("d") };
    }, ids.straight);
    const count = (str, re) => (str.match(re) || []).length;
    const hopped = style === "arc" ? count(both.path, / A /g) === 1
      : style === "gap" ? count(both.path, / M /g) === count(both.hit, / M /g) + 1
        : count(both.path, / L /g) === count(both.hit, / L /g) + 3;
    check(`${style}: stored, and the line hops the one under it once`, s.jumps === style && hopped, { stored: s.jumps, ...both });
  }
  const label = await page.evaluate((id) => {
    const g = document.querySelector(`.sketch-group[data-id="${id}"]`);
    const l = g.querySelector(".wb-link-label");
    const hit = g.querySelector(".sketch-hitbox").getAttribute("d");
    return { x: Number(l?.getAttribute("x")), y: Number(l?.getAttribute("y")), hitHasGap: / M /.test(hit.split(/\s(?=M)/)[0]) };
  }, ids.straight);
  check("the label still sits on the line with a gap jump", Number.isFinite(label.x) && !label.hitHasGap, label);
  const under = await page.evaluate((id) => document.querySelector(`.sketch-group[data-id="${id}"] .sketch-path`).getAttribute("d"), ids.upright);
  check("the line underneath does not hop", !/ A | M [-\d.]+ [-\d.]+ L/.test(under.split(/\s(?=M)/)[0].slice(2)), under);
  await pick("none");
  await page.waitForTimeout(700);
  s = await stored(ids.straight);
  check("None takes the jumps off", s.jumps === undefined, s.jumps);

  // 7. The export carries the hops.
  await pick("arc");
  await page.waitForTimeout(700);
  const exported = await page.evaluate(() => { const out = wbBuildExportSvg("board"); return out ? String(out.svg).includes(" A ") : null; });
  check("an SVG export keeps the arcs", exported === true, exported);

  // 8. A connector's bends move with the two things it joins (step 5).
  //: The Format panel (section 6) covers the left of a phone: closed first.
  await page.evaluate(() => wbFormatClose({ restoreFocus: false }));
  const pair = await page.evaluate(async (bid) => {
    const rect = (x, y) => `M ${x} ${y} L ${x + 120} ${y} L ${x + 120} ${y + 70} L ${x} ${y + 70} Z`;
    const post = async (data, z = 1) => (await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(data), x: 0, y: 0, z, board_id: bid }) })).id;
    const a = await post({ d: rect(0, 600), shape: "rect", color: "#335599", width: 2 });
    const b = await post({ d: rect(520, 600), shape: "rect", color: "#335599", width: 2 });
    const link = await post({ type: "link-straight", sourceId: a, sourceKind: "sketch", targetId: b, targetKind: "sketch", width: 2, points: [{ x: 320, y: 760 }] }, 3);
    await fetchWhiteboardState();
    renderWhiteboardNow();
    //: The camera on the pair alone, so the shapes are big enough on a
    //: phone to grab clear of the selection's bar.
    const c = document.getElementById("whiteboard-container");
    const r = c.getBoundingClientRect();
    const k = Math.min(1, (r.width - 40) / 640);
    d3.select(c).call(wbZoom.transform, d3.zoomIdentity.translate(r.width / 2 - 320 * k, r.height / 2 - 690 * k).scale(k));
    clearWbSelection();
    wbMultiSelection.add(wbMultiKey("sketch", a));
    wbMultiSelection.add(wbMultiKey("sketch", b));
    wbApplySelectionHighlight();
    return { a, b, link };
  }, board.id);
  await page.waitForTimeout(600);
  const grab = await page.evaluate((id) => {
    const svg = document.getElementById("wb-svg-layer");
    const pt = svg.createSVGPoint();
    pt.x = 60; pt.y = 640;
    const s = pt.matrixTransform(document.getElementById("wb-zoom-group").getScreenCTM());
    return { x: s.x, y: s.y, k: d3.zoomTransform(document.getElementById("whiteboard-container")).k };
  }, pair.a);
  await page.mouse.move(grab.x, grab.y, { steps: 2 });
  await page.mouse.down();
  await page.mouse.move(grab.x + 40, grab.y + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
  const carried = await page.evaluate((ids) => ({
    points: JSON.parse(wbFindItem("sketch", ids.link).data).points,
    b: wbItemBBox("sketch", wbFindItem("sketch", ids.b)),
  }), pair);
  const ddx = carried.b.minX - 520, ddy = carried.b.minY - 600;
  check("a group drag carries its connector's bends with it", Math.abs(ddx) > 5 && Math.abs(carried.points[0].x - (320 + ddx)) <= 1 && Math.abs(carried.points[0].y - (760 + ddy)) <= 1, { carried, ddx, ddy });
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(1000);
  const restored = await page.evaluate((id) => JSON.parse(wbFindItem("sketch", id).data).points, pair.link);
  check("and one Undo puts the bends back with the shapes", restored[0].x === 320 && restored[0].y === 760, restored);

  check("no console errors", errors.length === 0, errors.slice(0, 5));
  const ok = summary();
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
