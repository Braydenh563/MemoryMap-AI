// Elbow connectors, bends, sliding labels, ER ends and clone-and-connect
// (WHITEBOARD_PLAN Phase B, the features audit W4): an elbow link is drawn
// with right angles only and never through its two shapes; a dragged-in bend
// is saved and the route goes through it; the label slides and keeps its
// place; an ER end draws; Alt+Shift+Right copies a shape and joins it, one
// undo step. Every grip is a named SVG with a title.
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-elbow.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

(async () => {
  const { browser, page, errors, board } = await openBoard({ viewport: { width: Number(process.env.W || 1440), height: Number(process.env.H || 900) } });
  const ids = await page.evaluate(async (bid) => {
    const rect = (x, y) => `M ${x} ${y} L ${x + 120} ${y} L ${x + 120} ${y + 70} L ${x} ${y + 70} Z`;
    const shape = async (x, y) => (await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({
      data: JSON.stringify({ d: rect(x, y), shape: "rect", color: "#335599", width: 2 }), x: 0, y: 0, z: 1, board_id: bid,
    }) })).id;
    const a = await shape(0, 0);
    const b = await shape(320, 220);
    const link = (await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({
      data: JSON.stringify({ type: "link-curved", sourceId: a, sourceKind: "sketch", targetId: b, targetKind: "sketch", color: "#222222", width: 2, endCap: "arrow", label: "yes" }),
      x: 0, y: 0, z: 1, board_id: bid,
    }) })).id;
    await fetchWhiteboardState();
    renderWhiteboardNow();
    wbZoomToFit();
    selectWbItem("sketch", link);
    return { a, b, link };
  }, board.id);
  await page.waitForTimeout(700);

  // Line shape: elbow, from the context bar.
  //: The bar's selects are enhanced (a styled button over a hidden native
  //: select), so "shown" is the group's box and a choice is a change event.
  const pick = (id, value) => page.evaluate(([id, value]) => {
    const el = document.getElementById(id);
    el.value = value;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, [id, value]);
  const routeBar = await page.evaluate(() => {
    const el = document.getElementById("wb-prop-route");
    const group = el?.closest(".wb-context-group");
    return group && !group.classList.contains("hidden") && !document.getElementById("wb-context").classList.contains("hidden") ? el.value : null;
  });
  check("the bar shows the line shape for a selected connector", routeBar === "curved", routeBar);
  await pick("wb-prop-route", "elbow");
  await page.waitForTimeout(900);
  const geometry = await page.evaluate((ids) => {
    const d = document.querySelector(`.sketch-group[data-id="${ids.link}"] .sketch-path`).getAttribute("d");
    const shaft = d.split(/\s(?=M)/)[0];
    const pts = [...shaft.matchAll(/[ML] (-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
    const boxes = [ids.a, ids.b].map((id) => wbItemBBox("sketch", wbFindItem("sketch", id)));
    const crosses = (p, q, b) => Math.min(p.x, q.x) < b.maxX - 1 && Math.max(p.x, q.x) > b.minX + 1 && Math.min(p.y, q.y) < b.maxY - 1 && Math.max(p.y, q.y) > b.minY + 1;
    const segs = pts.slice(1).map((q, i) => [pts[i], q]);
    const parsed = JSON.parse(wbFindItem("sketch", ids.link).data);
    return {
      n: pts.length,
      square: segs.every(([p, q]) => Math.abs(p.x - q.x) < 0.5 || Math.abs(p.y - q.y) < 0.5),
      clear: segs.every(([p, q]) => !boxes.some((b) => crosses(p, q, b))),
      stored: [parsed.type, parsed.route],
      announced: document.getElementById("wb-announcer")?.textContent,
    };
  }, ids);
  check("an elbow turns only at right angles", geometry.square && geometry.n >= 3, geometry);
  check("and goes round both shapes", geometry.clear, geometry);
  check("stored as a straight link with an elbow route", geometry.stored[0] === "link-straight" && geometry.stored[1] === "elbow", geometry.stored);
  check("the change is announced", /elbow/i.test(geometry.announced || ""), geometry.announced);

  // A bend: drag the add grip on the longest run.
  const add = await page.evaluate(() => {
    const grips = [...document.querySelectorAll(".wb-link-waypoint-add")];
    const r = grips[Math.floor(grips.length / 2)]?.getBoundingClientRect();
    const at = r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
    const hit = at ? document.elementFromPoint(at.x, at.y) : null;
    return { n: grips.length, titled: grips.every((g) => g.querySelector("title")?.textContent), at, hit: hit ? `${hit.tagName}.${hit.getAttribute("class")}` : null };
  });
  check("an elbow shows grips to add a bend, each titled", add.n >= 1 && add.titled, add);
  if (add.at) {
    await page.mouse.move(add.at.x, add.at.y);
    await page.mouse.down();
    await page.mouse.move(add.at.x + 40, add.at.y + 60, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(900);
  }
  const bent = await page.evaluate((id) => {
    const parsed = JSON.parse(wbFindItem("sketch", id).data);
    const handles = document.querySelectorAll(".wb-link-waypoint-handle").length;
    return { points: parsed.points || [], handles };
  }, ids.link);
  check("a dragged bend is saved", bent.points.length === 1, bent);
  check("and is a grip of its own", bent.handles === 1, bent);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(800);
  const undone = await page.evaluate((id) => JSON.parse(wbFindItem("sketch", id).data).points || [], ids.link);
  check("Undo takes the bend back", undone.length === 0, undone);

  // The label slides.
  await page.evaluate((id) => { clearWbSelection(); selectWbItem("sketch", id); }, ids.link);
  await page.waitForTimeout(500);
  const before = await page.evaluate((id) => {
    const l = document.querySelector(`.sketch-group[data-id="${id}"] .wb-link-label`);
    const g = document.querySelector(".wb-link-label-handle")?.getBoundingClientRect();
    return { x: Number(l.getAttribute("x")), y: Number(l.getAttribute("y")), grip: g ? { x: g.x + g.width / 2, y: g.y + g.height / 2 } : null };
  }, ids.link);
  check("the label has a grip", Boolean(before.grip), before);
  if (before.grip) {
    await page.mouse.move(before.grip.x, before.grip.y);
    await page.mouse.down();
    const start = await page.evaluate((id) => {
      const g = document.querySelector(`.sketch-group[data-id="${id}"] .sketch-path`);
      const path = g.getAttribute("d").split(/\s(?=M)/)[0];
      const m = path.match(/^M (-?[\d.]+) (-?[\d.]+)/);
      const svg = document.getElementById("wb-svg-layer");
      const pt = svg.createSVGPoint();
      pt.x = Number(m[1]); pt.y = Number(m[2]);
      const s = pt.matrixTransform(document.getElementById("wb-zoom-group").getScreenCTM());
      return { x: s.x, y: s.y };
    }, ids.link);
    await page.mouse.move(start.x + 10, start.y + 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(900);
  }
  const slid = await page.evaluate((id) => {
    const parsed = JSON.parse(wbFindItem("sketch", id).data);
    const l = document.querySelector(`.sketch-group[data-id="${id}"] .wb-link-label`);
    return { t: parsed.label_t, x: Number(l.getAttribute("x")), y: Number(l.getAttribute("y")) };
  }, ids.link);
  check("a dragged label saves where it sits along the line", typeof slid.t === "number" && slid.t < 0.4, slid);
  check("and is drawn there", Math.hypot(slid.x - before.x, slid.y - before.y) > 20, { before, slid });

  // An ER end.
  await pick("wb-prop-endcap", "er-zero-many");
  await page.waitForTimeout(700);
  const er = await page.evaluate((id) => {
    const d = document.querySelector(`.sketch-group[data-id="${id}"] .sketch-path`).getAttribute("d");
    return { subpaths: d.split(/\s(?=M)/).length, cap: JSON.parse(wbFindItem("sketch", id).data).endCap };
  }, ids.link);
  check("an ER end (zero or many) is stored and drawn", er.cap === "er-zero-many" && er.subpaths >= 4, er);

  // Clone and connect.
  await page.evaluate((a) => { clearWbSelection(); selectWbItem("sketch", a); }, ids.a);
  await page.waitForTimeout(400);
  const grips = await page.evaluate(() => [...document.querySelectorAll(".wb-clone-grip")].map((g) => g.querySelector("title")?.textContent));
  check("three clone arrows round a selected shape (none over the rotate grip), each titled", grips.length === 3 && grips.every(Boolean), grips);
  const counts = () => page.evaluate(() => ({ sketches: wbState.sketches.length }));
  const c0 = await counts();
  await page.focus("#whiteboard-container").catch(() => {});
  await page.keyboard.press("Alt+Shift+ArrowRight");
  await page.waitForTimeout(1200);
  const c1 = await counts();
  const cloned = await page.evaluate((a) => {
    const sel = wbSelectedItem;
    const src = wbItemBBox("sketch", wbFindItem("sketch", a));
    const copy = sel ? wbItemBBox(sel.kind, wbFindItem(sel.kind, sel.id)) : null;
    return { sel, right: copy && copy.minX > src.maxX, level: copy && Math.abs(copy.minY - src.minY) < 1, said: document.getElementById("wb-announcer")?.textContent };
  }, ids.a);
  check("Alt+Shift+Right makes a copy and a connector", c1.sketches === c0.sketches + 2, { c0, c1 });
  check("the copy is to the right, level, and selected", cloned.right && cloned.level && cloned.sel?.id !== ids.a, cloned);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(900);
  const c2 = await counts();
  check("one Undo takes both back", c2.sketches === c0.sketches, { c0, c2 });

  check("no console errors", errors.length === 0, errors);
  summary();
  await browser.close();
})();
