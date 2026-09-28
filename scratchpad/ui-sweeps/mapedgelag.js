// **Do the lines keep up with the topics?** (INBOX 312, the owner: "all the
// links lag behind"; MINDMAP_PLAN 13a-view.)
//
// Every animation frame of a real mouse drag of a topic with a branch under
// it, each tree line inside the moving branch, and each cross-link with an
// end in it, is compared with the line the topics' positions *at that frame*
// call for: the `d` the board drew against the `d` that `wbMapEdgePathD` /
// `wbMapRibbonD` / `wbLinkPathD` compute from where the topics are now. A
// line more than 1px off at rAF time is a line that paints a frame behind the
// topics it joins, which is exactly what the owner describes.
//
// Measured with it before the fix: 77 of 81 frames had a line up to 12px
// behind, every one of them inside the dragged branch. `wbApplyBulkMove`
// redrew each member's lines inside the same loop that moved the members,
// and a tree line is claimed by its parent end, so it was drawn to a child
// that had not moved yet that frame.
//
// Comparing numbers rather than strings: a ribbon rounds each coordinate to
// a tenth, so the same curve computed twice can differ by 0.1 in one place.
//
//   BASE=http://127.0.0.1:8795 SCRATCH=/tmp/mm PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/mapedgelag.js
const { boot } = require("./lib.js");

const N = Number(process.env.N || 200);
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

// The balanced outline mapperf.js uses: breadth-first, five children each.
function outline(n) {
  const lines = [`# Lag ${n}`, "- Trunk"];
  const depth = [0];
  let made = 1;
  let parent = 0;
  let count = 0;
  while (made < n) {
    if (count === 5) { parent += 1; count = 0; continue; }
    const d = depth[parent] + 1;
    depth.push(d);
    lines.push(`${"  ".repeat(d)}- Topic ${made}`);
    made += 1;
    count += 1;
  }
  return lines.join("\n");
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
  });
  const board = await page.evaluate(async ([content]) => apiJson("/whiteboard/boards/import", {
    method: "POST", body: JSON.stringify({ format: "markdown", content, name: "Edge lag" }),
  }), [outline(N)]);
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, board.id);
  await page.waitForTimeout(2000);

  // The open shows the root and not much else, so centre on the root's first
  // child with a branch, and grab the biggest branch on screen that is not
  // the root's own.
  await page.evaluate(() => {
    const idx = wbMapIndex();
    const root = idx.roots[0];
    const kid = (idx.childrenOf.get(root.id) || []).find((c) => (idx.childrenOf.get(c.id) || []).length);
    if (kid) wbCenterOn(wbItemBBox("object", kid), { animate: false, minScale: 1 });
  });
  await page.waitForTimeout(400);
  const pt = await page.evaluate(() => {
    const idx = wbMapIndex();
    const c = document.getElementById("whiteboard-container").getBoundingClientRect();
    let best = null;
    for (const el of document.querySelectorAll("#wb-html-layer .wb-map-node")) {
      const id = Number(el.dataset.id);
      const node = idx.byId.get(id);
      if (!node || node.parent_id == null || !(idx.childrenOf.get(id) || []).length) continue;
      const b = el.getBoundingClientRect();
      const cx = b.left + b.width / 2;
      const cy = b.top + b.height / 2;
      if (cx < c.left + 80 || cx > c.right - 200 || cy < c.top + 80 || cy > c.bottom - 160) continue;
      const size = wbMapSubtree(idx, id).length;
      if (!best || size > best.size) best = { id, x: cx, y: cy, size };
    }
    return best;
  });
  check("a topic with a branch is on screen to grab", pt, pt ? `branch of ${pt.size}` : "");
  if (!pt) { await browser.close(); process.exit(1); }

  // Cross-links from inside the branch to topics outside it: the other kind
  // of line on a map, and the one the owner's word "links" names.
  const made = await page.evaluate(async (rootId) => {
    const idx = wbMapIndex();
    const inside = wbMapSubtree(idx, rootId);
    const insideIds = new Set(inside.map((o) => o.id));
    const outside = idx.nodes.filter((o) => !insideIds.has(o.id));
    let count = 0;
    for (let i = 0; i < Math.min(6, inside.length); i++) {
      const row = await apiJson("/whiteboard/sketches", {
        method: "POST",
        body: JSON.stringify({
          data: JSON.stringify({
            type: "link-curved", sourceId: inside[i].id, targetId: outside[(i * 7) % outside.length].id,
            sourceKind: "object", targetKind: "object", color: "#888888",
          }),
          x: 0, y: 0, z: 1, board_id: window.currentBoardId,
        }),
      });
      wbState.sketches.push(row);
      count += 1;
    }
    renderWhiteboardNow();
    return count;
  }, pt.id);
  await page.waitForTimeout(300);

  // The per-frame comparison, installed before the gesture.
  await page.evaluate((rootId) => {
    const branch = new Set(wbMapSubtree(wbMapIndex(), rootId).map((o) => o.id));
    const nums = (x) => (String(x || "").match(/-?\d+(\.\d+)?/g) || []).map(Number);
    const apart = (a, b) => {
      const x = nums(a);
      const y = nums(b);
      if (x.length !== y.length) return Infinity;
      let off = 0;
      for (let i = 0; i < x.length; i++) off = Math.max(off, Math.abs(x[i] - y[i]));
      return off;
    };
    const log = { frames: 0, lagging: 0, treeWorst: 0, linkWorst: 0, treeChecks: 0, linkChecks: 0 };
    window.__lagLog = log;
    window.__lagOn = true;
    const tick = () => {
      if (!window.__lagOn) return;
      const index = wbMapIndex();
      const layout = wbMapLayout();
      let behind = 0;
      for (const path of document.querySelectorAll(".wb-map-edges path.wb-map-edge")) {
        const child = index.byId.get(Number(path.dataset.child));
        const parent = index.byId.get(Number(path.dataset.parent));
        if (!child || !parent || !branch.has(child.id)) continue;
        const want = wbMapEdgeIsRibbon(child) ? wbMapRibbonD(parent, child, layout) : wbMapEdgePathD(parent, child, layout);
        const off = apart(path.getAttribute("d"), want);
        log.treeChecks += 1;
        log.treeWorst = Math.max(log.treeWorst, off);
        if (off > 1) behind += 1;
      }
      for (const sketch of wbState.sketches || []) {
        let parsed = null;
        try { parsed = JSON.parse(sketch.data); } catch (e) { parsed = null; }
        if (!parsed || !String(parsed.type || "").startsWith("link")) continue;
        if (!branch.has(parsed.sourceId) && !branch.has(parsed.targetId)) continue;
        const look = wbMapCrossLinkLook(parsed);
        const ends = look ? null : wbResolveLinkEndpoints(parsed);
        const want = look ? look.d
          : ends ? wbLinkPathD(parsed.type, ends.source, ends.target, wbLinkCaps(parsed), parsed.width, parsed.bend) : null;
        const drawn = document.querySelector(`.sketch-group[data-id="${sketch.id}"] .sketch-path`);
        if (!want || !drawn) continue;
        const off = apart(drawn.getAttribute("d"), want);
        log.linkChecks += 1;
        log.linkWorst = Math.max(log.linkWorst, off);
        if (off > 1) behind += 1;
      }
      log.frames += 1;
      if (behind) log.lagging += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, pt.id);

  const before = await page.evaluate((id) => {
    const o = wbState.objects.find((x) => x.id === id);
    return { x: o.x, y: o.y };
  }, pt.id);
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) {
    await page.mouse.move(pt.x + i * 6, pt.y + i * 4);
    await page.waitForTimeout(20);
  }
  const log = await page.evaluate(() => ({ ...window.__lagLog }));
  const moved = await page.evaluate(([id, b]) => {
    const o = wbState.objects.find((x) => x.id === id);
    return Math.round(Math.hypot(o.x - b.x, o.y - b.y));
  }, [pt.id, before]);
  await page.mouse.up();
  await page.evaluate(() => { window.__lagOn = false; });

  // A drag that moved nothing measured nothing: every line would be where it
  // was and the check below would read as a pass.
  check("the drag moved the branch it grabbed", moved > 50, `${moved} board units`);
  check("the branch carries cross-links for the link half", made >= 4 && log.linkChecks > 0,
    `${made} links, ${log.linkChecks} link checks`);
  const r = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : x);
  check("every tree line and cross-link is where its topics are, every frame of the drag",
    log.lagging === 0 && log.frames > 10,
    `${log.lagging} of ${log.frames} frames had a line more than 1px behind; worst tree line ${r(log.treeWorst)}px ` +
      `over ${log.treeChecks} checks, worst cross-link ${r(log.linkWorst)}px over ${log.linkChecks}`);

  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
