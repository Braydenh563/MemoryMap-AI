// INBOX 410: "drag selection on the whiteboard and mindmap is laggy as well".
//
// A real rubber-band drag (page.mouse, so hit-testing, pointer capture and
// every window-level pointermove listener are on the measured path) across a
// board of N text boxes and a map of N topics, N = 50 and 200. Per drag:
//   frames   rAF deltas while the pointer moves: median, p95, worst
//   cdp      Chrome's own counters over the drag (Performance.getMetrics):
//            layouts, style recalcs, and the time spent in each and in script
//   caught   how many items the finished drag selected, so a faster drag
//            that selects the wrong things cannot pass
//
//   BASE=http://127.0.0.1:8785 SCRATCH=/tmp/mm-mapfix \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/marqueeperf.js
const { boot } = require("./lib.js");

const SIZES = (process.env.SIZES || "50,200").split(",").map(Number);
const r1 = (x) => Math.round(x * 10) / 10;
const pct = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0;
};

function outline(n) {
  const lines = [`# Marquee ${n}`, "- Trunk"];
  const depth = [0];
  let made = 1, parent = 0, kids = 0;
  while (made < n) {
    if (kids === 5) { parent += 1; kids = 0; continue; }
    const d = depth[parent] + 1;
    depth.push(d);
    lines.push(`${"  ".repeat(d)}- Topic ${made}`);
    made += 1;
    kids += 1;
  }
  return lines.join("\n");
}

async function metrics(cdp) {
  const { metrics: list } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(list.map((m) => [m.name, m.value]));
}

async function drag(page, cdp, label) {
  // From the canvas's top-left corner (empty after a fit, which leaves a
  // margin) to its bottom-right, in 80 moves: the sweep a person makes.
  // The first point, scanning in from the top-left corner, that is bare
  // canvas (the map's top bar floats over the canvas's top edge), and the
  // mirror of it at the bottom right, clear of the dock.
  const box = await page.evaluate(() => {
    const r = document.getElementById("whiteboard-container").getBoundingClientRect();
    const bare = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el && el.closest("#whiteboard-container") && !el.closest(
        ".node-card, .sketch-group:not(.wb-link-sketch), .wb-object, .wb-sketch-handle-group, .wb-resize-handle, #wb-topbar, #wb-tools-panel, .wb-map-edge-group");
    };
    let start = null;
    for (let y = r.top + 8; y < r.top + 200 && !start; y += 8) {
      for (let x = r.left + 8; x < r.left + 200; x += 8) if (bare(x, y)) { start = [x, y]; break; }
    }
    let end = null;
    for (let y = r.bottom - 8; y > r.bottom - 300 && !end; y -= 8) {
      for (let x = r.right - 8; x > r.right - 300; x -= 8) if (bare(x, y)) { end = [x, y]; break; }
    }
    return { start, end };
  });
  const [x0, y0] = box.start;
  const [x1, y1] = box.end;
  if (process.env.DIAG) {
    // The same path with no button held: what a pointer crossing this board
    // costs before any rectangle is drawn, so the drag's own cost is the
    // difference.
    await page.mouse.move(x0, y0);
    await browserRef.startTracing(page, { categories: ["devtools.timeline"] });
    for (let i = 1; i <= 80; i++) await page.mouse.move(x0 + ((x1 - x0) * i) / 80, y0 + ((y1 - y0) * i) / 80);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const hover = JSON.parse((await browserRef.stopTracing()).toString());
    const hs = {};
    for (const ev of hover.traceEvents || []) {
      if (ev.ph === "X" && ev.dur && ["Layerize", "Paint", "UpdateLayoutTree", "HitTest"].includes(ev.name)) hs[ev.name] = r1((hs[ev.name] || 0) + ev.dur / 1000);
    }
    console.log(JSON.stringify({ label: `${label} hover only`, trace: hs }));
  }
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x0 + 8, y0 + 8);
  await page.evaluate(() => window.__startFrames());
  const m0 = await metrics(cdp);
  await browserRef.startTracing(page, { categories: ["devtools.timeline"] });
  for (let i = 1; i <= 80; i++) {
    await page.mouse.move(x0 + ((x1 - x0) * i) / 80, y0 + ((y1 - y0) * i) / 80);
  }
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const m1 = await metrics(cdp);
  const frames = await page.evaluate(() => window.__stopFrames());
  // The release, timed on its own: the selection is decided and drawn here.
  const upStart = Date.now();
  await page.mouse.up();
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const upMs = Date.now() - upStart;
  const trace = JSON.parse((await browserRef.stopTracing()).toString());
  const sums = {};
  for (const ev of trace.traceEvents || []) {
    if (ev.ph !== "X" || !ev.dur) continue;
    const key = ev.name === "EventDispatch" ? `Event:${ev.args?.data?.type}` : ev.name;
    if (!["Paint", "Layout", "UpdateLayoutTree", "Event:pointermove", "Event:pointerup", "PrePaint", "Layerize", "HitTest"].includes(key)) continue;
    sums[key] = (sums[key] || 0) + ev.dur / 1000;
  }
  await page.waitForTimeout(400);
  const caught = await page.evaluate(() => wbMultiSelection.size + (wbSelectedItem ? 1 : 0));
  const d = (k) => m1[k] - m0[k];
  const row = {
    label,
    frames: frames.length,
    median: r1(pct(frames, 0.5)),
    p95: r1(pct(frames, 0.95)),
    worst: r1(Math.max(...frames)),
    layouts: d("LayoutCount"),
    recalcs: d("RecalcStyleCount"),
    layoutMs: r1(d("LayoutDuration") * 1000),
    recalcMs: r1(d("RecalcStyleDuration") * 1000),
    scriptMs: r1(d("ScriptDuration") * 1000),
    releaseMs: upMs,
    trace: Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, r1(v)])),
    caught,
  };
  console.log(JSON.stringify(row));
  await page.evaluate(() => { wbMultiSelection.clear(); wbSelectedItem = null; wbApplySelectionHighlight(); });
  return row;
}

let browserRef = null;
(async () => {
  const { browser, page } = await boot({});
  browserRef = browser;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.evaluate(() => document.querySelector('[data-tab="library"]')?.click());
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('[data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.__frames = [];
    window.__rafOn = false;
    window.__startFrames = () => {
      window.__frames = [];
      window.__rafOn = true;
      let last = performance.now();
      const tick = (t) => {
        if (!window.__rafOn) return;
        window.__frames.push(t - last);
        last = t;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    window.__stopFrames = () => { window.__rafOn = false; return window.__frames.slice(1); };
  });
  for (const n of SIZES) {
    // A board of n text boxes in a grid.
    const boardId = await page.evaluate(async (n) => {
      const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `Marquee board ${n}` }) });
      const cols = Math.ceil(Math.sqrt(n));
      for (let i = 0; i < n; i++) {
        await apiJson("/whiteboard/objects", {
          method: "POST",
          body: JSON.stringify({
            kind: "text", data: { content: `Item ${i}` }, board_id: board.id,
            x: (i % cols) * 220, y: Math.floor(i / cols) * 110, z: 1, width: 180, height: 70,
          }),
        });
      }
      return board.id;
    }, n);
    await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, boardId);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { wbSelectToolRef?.("select"); wbZoomToFit({ animate: false }); });
    await page.waitForTimeout(800);
    await drag(page, cdp, `board ${n}`);

    const map = await page.evaluate(async ([content, name]) => apiJson("/whiteboard/boards/import", {
      method: "POST", body: JSON.stringify({ format: "markdown", content, name }),
    }), [outline(n), `Marquee map ${n}`]);
    await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { wbSelectToolRef?.("select"); wbZoomToFit({ animate: false }); });
    await page.waitForTimeout(800);
    await drag(page, cdp, `map ${n}`);
  }
  await browser.close();
})();
