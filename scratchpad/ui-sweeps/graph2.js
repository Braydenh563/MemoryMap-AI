// GRAPH_PLAN.md Phase 2 ("the space"), measured rather than looked at.
//
//   scratchpad/ui-sweeps/serve.sh 8831 /tmp/mm-graph2
//   BASE=http://127.0.0.1:8831 node scratchpad/graph-fixture.js 35 60
//   BASE=http://127.0.0.1:8831 node scratchpad/ui-sweeps/graph2.js
//   BASE=http://127.0.0.1:8831 THEME=dark node scratchpad/ui-sweeps/graph2.js
//
// Four questions, each of which the phase states as a number:
//
//  1. **How much of the card is map?** The phase's target is >= 95%. Measured
//     as `#graph-box`'s height over `#graph-card`'s, plus the same for area,
//     because a floating dock takes width from nothing.
//  2. **Does the page scroll on Graph?** `scrollHeight` vs `clientHeight` on
//     the scrolling element, on arrival and with the options popover open.
//  3. **How far does the layout spread?** The world bounding box of every
//     node once the simulation has settled, the zoom `fitGraphToView` picks
//     to frame it, and how many nodes are inside the frame at zoom 1. A map
//     that only fits at k = 0.3 is a map whose default view is dots.
//     `gcNodes` is a top-level `let` in a classic script, so it is in the
//     global lexical environment and readable here without a debug hook.
//  4. **Does a pan change what is hovered?** A drag across the map and a
//     wheel zoom over a node, with `__graphDebug.hovered` sampled after each.
//
// Nothing here is a screenshot. Every line is a number off the live DOM.
const { boot } = require("./lib.js");

const round = (n) => Math.round(n * 10) / 10;

// Every probe states its expectation as a `check`, not as a printed line
// somebody has to read and compare against a plan. A sweep whose output is
// only prose is a sweep whose regression nobody notices: the pan/hover bug
// (INBOX 28) was reported by the owner twice, and this file printed the
// number that would have caught it both times. Failures collect here and the
// run exits non-zero with a FAIL block, so "did it pass" is answerable
// without reading the whole log.
const failures = [];
const check = (ok, what) => {
  if (!ok) failures.push(what);
  return ok;
};

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => {
    try {
      localStorage.setItem("graph-renderer", "canvas");
      localStorage.setItem("graph-layout", "force");
      localStorage.setItem("graph-colour", "category");
      localStorage.setItem("graph-options-open", "0");
      localStorage.setItem("graphLegendCollapsed", "0");
    } catch (e) {
      /* private mode; defaults match */
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.click("#tab-btn-graph");
  // The layout is framed twice (graph-canvas.js): once on the first tick and
  // again when it settles. Wait for the settle, not for a screenshot.
  await page.waitForTimeout(9000);

  const geometry = await page.evaluate(() => {
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, visible: r.width > 0 && r.height > 0 };
    };
    const scroller = document.scrollingElement || document.documentElement;
    return {
      viewport: { w: innerWidth, h: innerHeight },
      tab: rect("#tab-graph"),
      card: rect("#graph-card"),
      box: rect("#graph-box"),
      canvas: rect("#graph-canvas"),
      dock: rect('.dock[data-dock-name="graph"]'),
      legend: rect(".graph-legend-row"),
      stats: rect("#graph-stats"),
      zoom: rect("#graph-zoom"),
      minimap: rect("#graph-minimap"),
      pageScroll: { scrollH: scroller.scrollHeight, clientH: scroller.clientHeight },
      cardRadius: getComputedStyle(document.getElementById("graph-card")).borderTopLeftRadius,
      dockBg: getComputedStyle(document.querySelector('.dock[data-dock-name="graph"]')).backgroundColor,
      statsInDock: !!document.querySelector('.dock[data-dock-name="graph"] #graph-stats'),
    };
  });

  const share = geometry.box && geometry.card ? geometry.box.h / geometry.card.h : 0;
  const areaShare =
    geometry.box && geometry.card
      ? (geometry.box.w * geometry.box.h) / (geometry.card.w * geometry.card.h)
      : 0;
  console.log("== the space ==");
  console.log(
    `card ${round(geometry.card.w)}x${round(geometry.card.h)} in a ` +
      `${geometry.viewport.w}x${geometry.viewport.h} viewport; map box ` +
      `${round(geometry.box.w)}x${round(geometry.box.h)}`
  );
  console.log(
    `map gets ${round(share * 100)}% of the card's height, ${round(areaShare * 100)}% of its area ` +
      `(target >= 95%)`
  );
  console.log(
    `page scroll: scrollHeight ${geometry.pageScroll.scrollH} vs clientHeight ` +
      `${geometry.pageScroll.clientH} (equal = no scroll)`
  );
  console.log(
    `dock ${round(geometry.dock.w)}x${round(geometry.dock.h)} at y=${round(geometry.dock.y)}, ` +
      `bg ${geometry.dockBg}; card radius ${geometry.cardRadius}; ` +
      `stats chip in the dock: ${geometry.statsInDock}`
  );
  if (geometry.legend) {
    console.log(`legend ${round(geometry.legend.w)}x${round(geometry.legend.h)} at y=${round(geometry.legend.y)}`);
  }

  const spread = await page.evaluate(() => {
    const nodes = typeof gcNodes !== "undefined" ? gcNodes : [];
    const t = window.__graphDebug ? window.__graphDebug.transform : { k: 1, x: 0, y: 0 };
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (!Number.isFinite(n.x)) continue;
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    }
    const box = document.getElementById("graph-box").getBoundingClientRect();
    // How many nodes would be on screen at zoom 1 centred on the map's middle:
    // "does a 300-note graph fit the viewport at the default zoom".
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let insideAt1 = 0;
    for (const n of nodes) {
      if (Math.abs(n.x - cx) <= box.width / 2 && Math.abs(n.y - cy) <= box.height / 2) insideAt1 += 1;
    }
    // Nearest-neighbour distance, the "clusters readable" half: a map that
    // fits because everything is in one blob is not the target either.
    const sample = nodes.slice(0, 200);
    const gaps = sample.map((a) => {
      let best = Infinity;
      for (const b of nodes) {
        if (b === a || !Number.isFinite(b.x)) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < best) best = d;
      }
      return best;
    }).filter(Number.isFinite).sort((a, b) => a - b);
    return {
      count: nodes.length,
      spanX: maxX - minX,
      spanY: maxY - minY,
      k: t.k,
      insideAt1,
      medianGap: gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0,
      alpha: window.__graphDebug ? window.__graphDebug.alpha : null,
      ticks: window.__graphDebug ? window.__graphDebug.ticks : null,
    };
  });
  console.log("== the spread ==");
  console.log(
    `${spread.count} nodes, world bounding box ${Math.round(spread.spanX)} x ` +
      `${Math.round(spread.spanY)} px, fit zoom k=${round(spread.k)}, ` +
      `${spread.insideAt1}/${spread.count} nodes inside the box at zoom 1, ` +
      `median nearest-neighbour gap ${Math.round(spread.medianGap)} px ` +
      `(alpha ${round(spread.alpha)}, ${spread.ticks} ticks)`
  );

  // 4. A pan must not change hover, and neither must a wheel zoom.
  const hoverProbe = await page.evaluate(() => {
    const nodes = (typeof gcNodes !== "undefined" ? gcNodes : []).filter((n) => Number.isFinite(n.x));
    const t = window.__graphDebug.transform;
    const box = document.getElementById("graph-canvas").getBoundingClientRect();
    // A node in screen coordinates, to aim the gestures at.
    const target = nodes[Math.floor(nodes.length / 2)];
    const screen = (n) => [box.x + n.x * t.k + t.x, box.y + n.y * t.k + t.y];
    const [tx, ty] = screen(target);
    // Where a pan may start: on the map, clear of every floating panel (the
    // dock, the legend, the zoom strip and the minimap all swallow a press
    // now), and with no node under it, or the press is a node drag instead.
    const panels = [".graph-overlay", ".graph-legend-row", "#graph-zoom", "#graph-minimap"]
      .map((sel) => document.querySelector(sel))
      .filter((el) => el && !el.classList.contains("hidden"))
      .map((el) => el.getBoundingClientRect());
    const free = (x, y) =>
      !panels.some((r) => x >= r.x - 4 && x <= r.right + 4 && y >= r.y - 4 && y <= r.bottom + 4) &&
      !nodes.some((n) => {
        const [nx, ny] = screen(n);
        return Math.hypot(nx - x, ny - y) < 30;
      });
    let start = null;
    for (let dx = 40; dx < box.width - 40 && !start; dx += 20) {
      for (let dy = 40; dy < box.height - 40 && !start; dy += 20) {
        const x = box.x + dx;
        const y = box.y + dy;
        // Far enough from the target that the drag actually crosses the map.
        if (Math.hypot(x - tx, y - ty) < 200) continue;
        if (free(x, y)) start = { x, y };
      }
    }
    return {
      x: tx, y: ty, id: target.id, start,
      boxX: box.x, boxY: box.y, boxW: box.width, boxH: box.height,
    };
  });
  if (!hoverProbe.start) throw new Error("no free spot on the map to start a pan from");
  // A drag that crosses a node: press on empty map, then move across the
  // target node. A pan must never change what is hovered.
  await page.mouse.move(hoverProbe.start.x, hoverProbe.start.y);
  await page.waitForTimeout(300);
  await page.mouse.down();
  const during = [];
  for (let i = 1; i <= 8; i++) {
    const x = hoverProbe.start.x + ((hoverProbe.x - hoverProbe.start.x) * i) / 8;
    const y = hoverProbe.start.y + ((hoverProbe.y - hoverProbe.start.y) * i) / 8;
    await page.mouse.move(x, y);
    await page.waitForTimeout(60);
    during.push(await page.evaluate(() => window.__graphDebug.hovered));
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const afterPan = await page.evaluate(() => window.__graphDebug.hovered);
  const hoveredDuringPan = during.filter((h) => h != null).length;
  const activeDuringPan = await page.evaluate(
    () => document.activeElement && document.activeElement.id
  );
  console.log("== hover during a pan ==");
  console.log(
    `drag across the map: ${hoveredDuringPan}/8 samples had a hovered node ` +
      `(want 0); after mouseup hovered=${afterPan}, activeElement=${activeDuringPan}`
  );
  check(hoveredDuringPan === 0, `a pan lit up a node in ${hoveredDuringPan}/8 samples`);
  check(afterPan == null, `hover survived the mouseup of a pan: ${afterPan}`);

  // The other half of the same bug, and the half that actually fired:
  // `#graph-box` is `tabIndex = 0`, so a press on the map focuses it, and its
  // focus listener used to hand the keyboard (and, through `focusGraphNode`,
  // the hover) to `graphNodesRef[0]`: an arbitrary note, dimmed-except and
  // labelled, that nobody pointed at. A press on a node is the gesture that
  // reproduces it, because d3-zoom's own `preventDefault` on an accepted pan
  // suppresses the focus and a press on a node is not an accepted pan.
  await page.mouse.move(hoverProbe.x, hoverProbe.y);
  await page.mouse.down();
  await page.mouse.move(hoverProbe.x - 60, hoverProbe.y + 20);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const afterPress = await page.evaluate(() => ({
    active: document.activeElement && document.activeElement.id,
    hovered: window.__graphDebug.hovered,
    keyboardId: typeof graphKeyboardId !== "undefined" ? graphKeyboardId : null,
    first: (typeof gcNodes !== "undefined" && gcNodes[0] && gcNodes[0].id) || null,
  }));
  console.log(
    `press and drag on a node: activeElement=${afterPress.active}, ` +
      `hovered=${afterPress.hovered}, keyboard=${afterPress.keyboardId} ` +
      `(want neither equal to the first node in the payload, ${afterPress.first}, ` +
      `unless that is the node pressed: ${hoverProbe.id})`
  );
  // The bug itself: `#graph-box` takes focus from the press, and the focus
  // listener used to hand the keyboard and the hover to `graphNodesRef[0]`.
  // Focus on the box is fine and expected; a node chosen by that focus is not.
  const arbitrary = (id) => id != null && id === afterPress.first && id !== hoverProbe.id;
  check(!arbitrary(afterPress.hovered), `a press focused the box and hovered node ${afterPress.hovered}`);
  check(
    !arbitrary(afterPress.keyboardId),
    `a press focused the box and selected node ${afterPress.keyboardId}`
  );

  // A wheel zoom with the pointer parked over empty space: the map slides
  // under a stationary cursor, and Chromium replays a move at the same client
  // point. Nothing moved under the user's hand, so nothing should light up.
  await page.mouse.move(hoverProbe.boxX + 30, hoverProbe.boxY + 30);
  await page.waitForTimeout(400);
  const beforeWheel = await page.evaluate(() => window.__graphDebug.hovered);
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(700);
  const afterWheel = await page.evaluate(() => window.__graphDebug.hovered);
  console.log(
    `wheel zoom under a stationary cursor: hovered ${beforeWheel} -> ${afterWheel} ` +
      `(want unchanged)`
  );
  check(
    beforeWheel === afterWheel,
    `a wheel zoom changed the hover: ${beforeWheel} -> ${afterWheel}`
  );

  // 5. Fullscreen keeps the card's radius and hides the app chrome.
  await page.click("#graph-fullscreen");
  await page.waitForTimeout(1200);
  const full = await page.evaluate(() => {
    const card = document.getElementById("graph-card");
    const r = card.getBoundingClientRect();
    const box = document.getElementById("graph-box").getBoundingClientRect();
    const cs = getComputedStyle(card);
    const chrome = ["header", ".tabs", "#sidebar", ".app-header"]
      .map((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { sel, visible: rect.height > 0 && getComputedStyle(el).visibility !== "hidden" };
      })
      .filter(Boolean);
    return {
      card: { w: r.width, h: r.height, x: r.x, y: r.y },
      box: { w: box.width, h: box.height },
      radius: cs.borderTopLeftRadius,
      overflow: cs.overflowY,
      chrome,
    };
  });
  console.log("== fullscreen ==");
  console.log(
    `card ${round(full.card.w)}x${round(full.card.h)} at (${round(full.card.x)}, ${round(full.card.y)}), ` +
      `radius ${full.radius}, map ${round(full.box.w)}x${round(full.box.h)} ` +
      `(${round((full.box.h / full.card.h) * 100)}% of the card)`
  );
  console.log(`app chrome still laid out: ${JSON.stringify(full.chrome)}`);
  await page.click("#graph-fullscreen");
  await page.waitForTimeout(600);

  await browser.close();
  if (failures.length) {
    console.log(`== FAIL (${failures.length}) ==`);
    for (const line of failures) console.log(`  - ${line}`);
    process.exitCode = 1;
  } else {
    console.log("== every probe passed ==");
  }
})();
