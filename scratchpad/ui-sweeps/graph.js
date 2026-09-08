// The Graph tab's Phase 1 gate (GRAPH_PLAN.md §5), measured in a real
// Chromium against the 2,000-note fixture.
//
//   scratchpad/ui-sweeps/serve.sh 8812 /tmp/mm-graph-a97
//   BASE=http://127.0.0.1:8812 node scratchpad/graph-fixture.js 2000 4000
//   BASE=http://127.0.0.1:8812 node scratchpad/ui-sweeps/graph.js            # canvas
//   BASE=http://127.0.0.1:8812 RENDERER=svg node scratchpad/ui-sweeps/graph.js
//
// What it measures, and why each one is measured this way rather than looked
// at:
//
//  1. **First frame after data arrives.** `window.fetch` is wrapped so the
//     moment the `/graph` response resolves is recorded in the page, and the
//     clock stops at the first frame that actually has content in it — a
//     canvas draw, or the first `.graph-node` in the SVG. Measuring from the
//     click instead would be measuring SQLite, not the renderer.
//  2. **Frames per second during a two-second drag.** A `requestAnimationFrame`
//     counter, exactly as the plan asks, while a synthetic pointer drags a
//     node in a circle. Both renderers are driven through the same gesture.
//  3. **The longest frame on a 200-note board.** Nine of the ten fixture
//     categories are switched off in the legend, which leaves 200 notes. The
//     canvas renderer reports its own draw cost per frame
//     (`__graphDebug.lastFrameMs`); for both renderers the gap between
//     consecutive `requestAnimationFrame` callbacks is recorded too, and both
//     numbers are printed, because they answer different questions and only
//     one of them is available on the old renderer.
//  4. **Hover within one frame.** The pointer is moved onto a node and the
//     next single frame is asked whether the highlight is on.
//  5. **Every control still changes what is drawn.** Each control is driven
//     and the *drawing* is compared, not the control: a hash of the canvas
//     pixels plus the renderer's own read-only `window.__graphDebug` state.
//     "The checkbox ticked" is not evidence that anything was redrawn, which
//     is the whole reason the debug surface exists.
const { boot } = require("./lib.js");

const RENDERER = process.env.RENDERER === "svg" ? "svg" : "canvas";
const ok = (pass) => (pass ? "PASS" : "FAIL");

(async () => {
  const { browser, page } = await boot();
  const findings = [];

  // The renderer switch is read from localStorage by graph.js's
  // `graphRenderer()`; it needs to be set before the tab first renders.
  await page.evaluate((r) => {
    try {
      localStorage.setItem("graph-renderer", r);
      localStorage.setItem("graph-layout", "force");
      localStorage.setItem("graph-colour", "category");
      localStorage.removeItem("graph-minimap-hidden");
    } catch (e) {
      /* private mode; the default is canvas anyway */
    }
  }, RENDERER);

  // Instrument before the tab is opened: the clock has to be running before
  // the request that starts it.
  await page.evaluate(() => {
    window.__gate = { dataAt: 0, firstFrame: 0, frames: [], counting: false };
    const realFetch = window.fetch;
    window.fetch = function (...args) {
      const url = String(args[0] || "");
      const promise = realFetch.apply(this, args);
      if (/^\/graph(\?|$)/.test(url)) {
        promise.then(() => {
          window.__gate.dataAt = performance.now();
          window.__gate.firstFrame = 0;
        });
      }
      return promise;
    };
    const painted = () => {
      const debug = window.__graphDebug;
      if (debug && debug.renderer === "canvas") return debug.frames > 0;
      return document.querySelectorAll("#graph-svg .graph-node").length > 0;
    };
    const tick = (now) => {
      const gate = window.__gate;
      if (gate.counting) gate.frames.push(now);
      if (gate.dataAt && !gate.firstFrame && painted()) {
        gate.firstFrame = performance.now() - gate.dataAt;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  await page.click('[data-tab="graph"]');
  await page.waitForTimeout(6000);

  const shape = await page.evaluate(() => ({
    firstFrame: window.__gate.firstFrame,
    debug: window.__graphDebug || null,
    svgNodes: document.querySelectorAll("#graph-svg .graph-node").length,
    canvasHidden: (document.getElementById("graph-canvas") || {}).className || "",
  }));
  const nodeCount = shape.debug && shape.debug.nodes ? shape.debug.nodes : shape.svgNodes;
  console.log(`renderer=${RENDERER} nodes=${nodeCount} edges=${(shape.debug || {}).edges || "n/a"}`);
  console.log(
    `1. first frame after data: ${shape.firstFrame.toFixed(1)} ms  ${ok(
      shape.firstFrame > 0 && shape.firstFrame < 300
    )} (< 300 ms)`
  );

  // --- 2. fps during a two-second drag -----------------------------------
  const dragOnce = async (seconds) => {
    const point = await page.evaluate(() => {
      const box = document.getElementById("graph-box").getBoundingClientRect();
      const debug = window.__graphDebug;
      if (debug && debug.renderer === "canvas" && debug.positions.length) {
        // The most-connected of the sampled nodes: dragging a hub is the
        // worst case, because its neighbourhood is what has to follow.
        let best = 0;
        for (let i = 1; i < debug.positions.length; i++) {
          if (debug.radii[i] > debug.radii[best]) best = i;
        }
        const [x, y] = debug.positions[best];
        const t = debug.transform;
        return { x: box.left + t.x + x * t.k, y: box.top + t.y + y * t.k };
      }
      const node = document.querySelector("#graph-svg .graph-node .graph-core");
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (!point) return null;
    await page.evaluate(() => {
      window.__gate.frames = [];
      window.__gate.counting = true;
      window.__gate.draw = [];
      window.__gate.sample = setInterval(() => {
        const d = window.__graphDebug;
        if (d && d.lastFrameMs) window.__gate.draw.push(d.lastFrameMs);
      }, 8);
    });
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 4;
      await page.mouse.move(point.x + Math.cos(angle) * 90, point.y + Math.sin(angle) * 70);
      await page.waitForTimeout(1000 / 60);
    }
    await page.mouse.up();
    return page.evaluate((secs) => {
      window.__gate.counting = false;
      clearInterval(window.__gate.sample);
      const frames = window.__gate.frames;
      const gaps = [];
      for (let i = 1; i < frames.length; i++) gaps.push(frames[i] - frames[i - 1]);
      gaps.sort((a, b) => a - b);
      const span = frames.length > 1 ? frames[frames.length - 1] - frames[0] : secs * 1000;
      return {
        fps: ((frames.length - 1) * 1000) / span,
        worstGap: gaps.length ? gaps[gaps.length - 1] : 0,
        p95Gap: gaps.length ? gaps[Math.floor(gaps.length * 0.95)] : 0,
        worstDraw: window.__gate.draw.length ? Math.max(...window.__gate.draw) : null,
      };
    }, seconds);
  };

  const drag = await dragOnce(2);
  if (!drag) {
    findings.push("could not find a node to drag");
  } else {
    console.log(
      `2. drag fps (2 s, ${nodeCount} notes): ${drag.fps.toFixed(1)} fps  ${ok(drag.fps >= 55)} (>= 55)` +
        `   worst frame gap ${drag.worstGap.toFixed(1)} ms, p95 ${drag.p95Gap.toFixed(1)} ms` +
        (drag.worstDraw != null ? `, worst draw ${drag.worstDraw.toFixed(2)} ms` : "")
    );
  }

  // --- 4. hover within one frame ------------------------------------------
  const hover = await page.evaluate(async () => {
    const box = document.getElementById("graph-box").getBoundingClientRect();
    const debug = window.__graphDebug;
    let target = null;
    if (debug && debug.renderer === "canvas" && debug.positions.length) {
      const [x, y] = debug.positions[0];
      const t = debug.transform;
      target = { x: box.left + t.x + x * t.k, y: box.top + t.y + y * t.k };
    }
    if (!target) return null;
    const surface = document.getElementById("graph-canvas");
    const before = window.__graphDebug.hovered;
    surface.dispatchEvent(
      new PointerEvent("pointermove", {
        clientX: target.x,
        clientY: target.y,
        bubbles: true,
        pointerId: 1,
      })
    );
    const at = performance.now();
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    return {
      before,
      after: window.__graphDebug.hovered,
      ms: performance.now() - at,
      frames: window.__graphDebug.frames,
    };
  });
  if (hover) {
    console.log(
      `4. hover highlight: ${hover.before} -> ${hover.after} in one frame ` +
        `(${hover.ms.toFixed(1)} ms)  ${ok(hover.after !== null && hover.after !== hover.before)}`
    );
  } else {
    console.log("4. hover highlight: not measurable on this renderer (no debug surface)");
  }

  // --- 3. the longest frame on a 200-note board ----------------------------
  // The fixture files notes round-robin into ten categories, so switching nine
  // off in the legend leaves 200. Done through the legend buttons themselves,
  // not by poking state, so this also exercises the legend filter.
  const smaller = await page.evaluate(async () => {
    const items = [...document.querySelectorAll("#graph-legend .legend-toggle")];
    const names = items.map((b) => b.textContent.trim());
    for (let i = 1; i < items.length; i++) items[i].click();
    return names.length;
  });
  await page.waitForTimeout(4000);
  const small = await page.evaluate(() => {
    const d = window.__graphDebug;
    return {
      nodes: d && d.renderer === "canvas" ? d.nodes : document.querySelectorAll("#graph-svg .graph-node").length,
    };
  });
  const smallDrag = await dragOnce(2);
  console.log(
    `3. ${small.nodes} notes (from ${smaller} legend entries): ` +
      (smallDrag
        ? `worst draw ${smallDrag.worstDraw != null ? smallDrag.worstDraw.toFixed(2) + " ms" : "n/a"} ` +
          `${smallDrag.worstDraw != null ? ok(smallDrag.worstDraw < 16) : ""} (< 16 ms), ` +
          `${smallDrag.fps.toFixed(1)} fps, worst gap ${smallDrag.worstGap.toFixed(1)} ms`
        : "no node to drag")
  );

  // Put the legend back before the control sweep.
  await page.evaluate(() => {
    for (const button of document.querySelectorAll("#graph-legend .legend-off")) button.click();
  });
  await page.waitForTimeout(3500);

  // --- 5. every control still changes what is drawn ------------------------
  const snapshot = () =>
    page.evaluate(() => {
      const canvas = document.getElementById("graph-canvas");
      let pixels = 0;
      if (canvas && !canvas.classList.contains("hidden")) {
        const ctx = canvas.getContext("2d");
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        // A cheap content hash: every 401st byte, so a redraw that moved
        // anything at all changes it, and reading it costs a few hundred
        // thousand array lookups rather than four million.
        for (let i = 0; i < data.length; i += 401) pixels = (pixels * 31 + data[i]) >>> 0;
      }
      const svg = document.getElementById("graph-svg");
      const debug = window.__graphDebug || {};
      return {
        pixels,
        svg: svg ? svg.innerHTML.length : 0,
        state: JSON.stringify({
          nodes: debug.nodes,
          edges: debug.edges,
          layout: debug.layout,
          colourMode: debug.colourMode,
          k: debug.transform && Math.round(debug.transform.k * 1000),
          time: debug.timeCutoff,
          hidden: debug.hiddenCategories,
          highlight: debug.highlight,
          trace: debug.trace,
          focus: debug.focusModeId,
          colours: debug.colours,
          radii: debug.radii,
        }),
      };
    });

  const control = async (label, action, settle = 2500) => {
    const before = await snapshot();
    await action();
    await page.waitForTimeout(settle);
    const after = await snapshot();
    const changed =
      before.pixels !== after.pixels || before.state !== after.state || before.svg !== after.svg;
    console.log(`5. ${label}: ${changed ? "redrew" : "NO CHANGE"}  ${ok(changed)}`);
    if (!changed) findings.push(`${label} did not change the drawing`);
  };

  await control("layout tree", () =>
    page.evaluate(() => {
      localStorage.setItem("graph-layout", "tree");
      document.querySelector('input[name="graph-layout"][value="tree"]').click();
    })
  );
  await control("layout radial", () =>
    page.evaluate(() => {
      localStorage.setItem("graph-layout", "radial");
      document.querySelector('input[name="graph-layout"][value="radial"]').click();
    })
  );
  await control("layout arc", () =>
    page.evaluate(() => {
      localStorage.setItem("graph-layout", "arc");
      document.querySelector('input[name="graph-layout"][value="arc"]').click();
    })
  );
  await control(
    "layout force",
    () =>
      page.evaluate(() => {
        localStorage.setItem("graph-layout", "force");
        document.querySelector('input[name="graph-layout"][value="force"]').click();
      }),
    4000
  );
  await control(
    "colour by cluster",
    () => page.evaluate(() => document.querySelector('input[name="graph-colour"][value="cluster"]').click()),
    5000
  );
  await control("colour by category", () =>
    page.evaluate(() => document.querySelector('input[name="graph-colour"][value="category"]').click())
  );
  await control("search highlight", async () => {
    await page.fill("#graph-search", "Reading");
  });
  await control("search cleared", async () => {
    await page.fill("#graph-search", "");
  });
  await control("hide unlinked", () =>
    page.evaluate(() => {
      const box = document.getElementById("graph-hide-orphans");
      box.checked = true;
      box.dispatchEvent(new Event("change", { bubbles: true }));
    })
  );
  await control("show unlinked", () =>
    page.evaluate(() => {
      const box = document.getElementById("graph-hide-orphans");
      box.checked = false;
      box.dispatchEvent(new Event("change", { bubbles: true }));
    })
  );
  await control(
    "labels off",
    () =>
      page.evaluate(() => {
        const box = document.getElementById("graph-labels");
        box.checked = false;
        box.dispatchEvent(new Event("change", { bubbles: true }));
      }),
    900
  );
  await control(
    "labels on",
    () =>
      page.evaluate(() => {
        const box = document.getElementById("graph-labels");
        box.checked = true;
        box.dispatchEvent(new Event("change", { bubbles: true }));
      }),
    900
  );
  await control(
    "time slider back",
    () =>
      page.evaluate(() => {
        const slider = document.getElementById("graph-time-slider");
        slider.value = String(Number(slider.min) + (Number(slider.max) - Number(slider.min)) * 0.3);
        slider.dispatchEvent(new Event("input", { bubbles: true }));
      }),
    900
  );
  await control(
    "time slider to now",
    () =>
      page.evaluate(() => {
        const slider = document.getElementById("graph-time-slider");
        slider.value = slider.max;
        slider.dispatchEvent(new Event("input", { bubbles: true }));
      }),
    900
  );
  await control("legend filter", () =>
    page.evaluate(() => document.querySelector("#graph-legend .legend-toggle").click())
  );
  await control("legend filter off", () =>
    page.evaluate(() => document.querySelector("#graph-legend .legend-off").click())
  );
  await control("zoom in", () => page.click("#graph-zoom-in"), 1200);
  await control("zoom out", () => page.click("#graph-zoom-out"), 1200);
  await control("fit to view", () => page.click("#graph-zoom-fit"), 1500);
  await control(
    "similarity edges",
    () =>
      page.evaluate(() => {
        const box = document.getElementById("graph-similarity");
        box.checked = true;
        box.dispatchEvent(new Event("change", { bubbles: true }));
      }),
    6000
  );
  await control(
    "similarity off",
    () =>
      page.evaluate(() => {
        const box = document.getElementById("graph-similarity");
        box.checked = false;
        box.dispatchEvent(new Event("change", { bubbles: true }));
      }),
    5000
  );
  await control(
    "focus mode",
    () =>
      page.evaluate(async () => {
        const first = (await api("/entries?limit=1").then((r) => r.json()))[0];
        graphFocusModeId = first.id;
        document.getElementById("graph-focus-clear").classList.remove("hidden");
        return renderGraph();
      }),
    4000
  );
  await control("exit focus", () => page.click("#graph-focus-clear"), 5000);
  await control(
    "trace between two notes",
    () =>
      page.evaluate(async () => {
        const ids = (window.__graphDebug && window.__graphDebug.positions.length
          ? graphNodesRef.slice(0, 2)
          : graphNodesRef.slice(0, 2)
        ).map((n) => n.id);
        setTraceEnd("from", ids[0]);
        setTraceEnd("to", ids[1]);
        return runTrace();
      }),
    4000
  );
  await control("clear trace", () => page.evaluate(() => clearTrace()), 1500);

  // The minimap, saved views and the PNG export are not "did the drawing
  // change" questions, so they are checked for their own result instead.
  const minimap = await page.evaluate(() => {
    graphMinimapPaint();
    const dots = document.getElementById("graph-minimap-dots");
    const frame = document.getElementById("graph-minimap-frame");
    return {
      dots: dots ? dots.childElementCount : 0,
      frame: frame ? Number(frame.getAttribute("width")) : 0,
      coloured: dots && dots.firstChild ? dots.firstChild.getAttribute("fill") : "",
    };
  });
  console.log(
    `5. minimap: ${minimap.dots} dots, viewport frame ${minimap.frame}px wide, ` +
      `first dot ${minimap.coloured}  ${ok(minimap.dots > 0 && minimap.frame > 0)}`
  );
  if (!minimap.dots) findings.push("minimap drew no dots");

  const views = await page.evaluate(() => {
    const captured = graphCaptureView();
    localStorage.setItem("graph-saved-views", JSON.stringify([{ name: "gate", ...captured }]));
    renderGraphViews();
    const picker = document.getElementById("graph-view-picker");
    picker.value = "gate";
    picker.dispatchEvent(new Event("change", { bubbles: true }));
    return { options: picker.options.length, transform: Boolean(captured.transform) };
  });
  console.log(
    `5. saved views: ${views.options} options, captured a transform: ${views.transform}  ` +
      ok(views.options > 1 && views.transform)
  );

  const exported = await page.evaluate(async () => {
    const canvas = document.getElementById("graph-canvas");
    const surface = canvas && !canvas.classList.contains("hidden") ? canvas : null;
    if (!surface) return { bytes: 0, note: "svg renderer" };
    const blob = await new Promise((resolve) => surface.toBlob(resolve, "image/png"));
    return { bytes: blob ? blob.size : 0 };
  });
  console.log(`5. export PNG from the canvas: ${exported.bytes} bytes  ${ok(exported.bytes > 5000)}`);
  if (exported.bytes !== undefined && exported.bytes <= 5000 && !exported.note) {
    findings.push("canvas PNG export produced almost nothing");
  }

  const errors = await page.evaluate(() => (window.__gate.errors || []).length);
  console.log(`findings: ${findings.length}${findings.length ? "\n  " + findings.join("\n  ") : ""}`);
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
