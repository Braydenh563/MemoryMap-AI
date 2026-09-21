// **Is the mind map slow?** (INBOX 305, the owner: "the mindmap is slow.")
//
// This is the one claim in that report that had to be measured before
// anything was designed, because if it is true it outranks the other five:
// no amount of control-layout work rescues a surface that stutters. So this
// probe takes four numbers at three map sizes and asserts nothing about
// taste.
//
// **The four numbers, and why each one.**
//
//  1. `open` — from the call that opens the board to the frame on which all
//     N nodes are in the DOM *and* the browser has painted twice. Two rAFs,
//     not one: the first fires after the render pass has written the layer,
//     the second only once that write has actually been composited, so a
//     single rAF would report the time to queue the paint rather than the
//     time to see it.
//  2. `pan` — the frame deltas during a real hand-tool drag across the
//     canvas, driven with `page.mouse` rather than dispatched events, so the
//     hit-testing, the pointer capture and the transform write are all on
//     the measured path.
//  3. `drag` — the same, on one node, which is the other gesture a person
//     makes constantly and which re-renders rather than re-transforms.
//  4. `layout` — `wbMapTidyPositions`, the pure position computation, timed
//     on its own with no network and no render, plus `wbMapIndex` (which
//     every map action calls first) and `renderWhiteboard` (which every map
//     action calls last). Splitting the three is the whole point: a tidy
//     that feels slow is one of them, and the fix is different for each.
//
// **The map is built through the real route.** `/whiteboard/boards/import`
// with a Markdown outline is a route a person actually has (the Board menu's
// own import), it produces ordinary `topic` objects with real `parent_id`
// edges, and it is the only way to get to 500 nodes without measuring 500
// round trips of `wbMapAddChild` instead of the thing being asked about.
//
// Frame deltas are collected in the page by a rAF loop installed before the
// gesture and stopped after it, so what is reported is what the compositor
// actually did, not what a timer around the gesture would suggest.
//
//   BASE=http://127.0.0.1:8804 SCRATCH=/tmp/mm-mapread \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapperf.js
const { boot } = require("./lib.js");

const VIEWPORT = (() => {
  const raw = process.env.VIEWPORT;
  if (!raw) return { width: 1440, height: 900 };
  const [w, h] = raw.split("x").map(Number);
  return { width: w || 1440, height: h || 900 };
})();

const SIZES = (process.env.SIZES || "50,200,500").split(",").map(Number);

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

// A balanced outline of exactly `n` topics: one trunk, then breadth-first
// with a branching factor of 5, which is the shape of a map somebody made on
// purpose rather than a chain or a star.
function outline(n) {
  const lines = [`# Perf ${n}`];
  const depth = [0];
  lines.push(`- Trunk`);
  let made = 1;
  let parent = 0;
  let childrenOfParent = 0;
  while (made < n) {
    if (childrenOfParent === 5) {
      parent += 1;
      childrenOfParent = 0;
      continue;
    }
    const d = depth[parent] + 1;
    depth.push(d);
    lines.push(`${"  ".repeat(d)}- Topic ${made}`);
    made += 1;
    childrenOfParent += 1;
  }
  return lines.join("\n");
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const r1 = (x) => Math.round(x * 10) / 10;

(async () => {
  const { browser, page } = await boot({ viewport: VIEWPORT });

  // Get to the whiteboard view once; every board below opens inside it.
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
  });
  await page.waitForTimeout(500);

  // The rAF frame recorder, installed once and driven per gesture.
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
    window.__stopFrames = () => {
      window.__rafOn = false;
      // The first delta is the gap from installing the loop to its first
      // callback, which is not a frame the gesture produced.
      return window.__frames.slice(1);
    };
  });

  const table = [];

  for (const n of SIZES) {
    // 1. Build the map through the import route.
    const board = await page.evaluate(
      async ([content, name]) =>
        apiJson("/whiteboard/boards/import", {
          method: "POST",
          body: JSON.stringify({ format: "markdown", content, name }),
        }),
      [outline(n), `Perf ${n}`]
    );
    check(`${n}: import made a map`, board && board.id, `object_count ${board && board.object_count}`);

    // 2. Open it, and time to the painted frame.
    const open = await page.evaluate(async ([id, want]) => {
      const t0 = performance.now();
      await openWhiteboardBoard(id);
      // Poll for the nodes rather than trusting the promise: the open path
      // fetches state and queues a render, so the promise resolving is not
      // the nodes being there.
      const deadline = t0 + 30000;
      while (performance.now() < deadline) {
        const drawn = document.querySelectorAll("#wb-html-layer .wb-map-node").length;
        if (drawn >= want) break;
        await new Promise((r) => setTimeout(r, 8));
      }
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return {
        ms: performance.now() - t0,
        drawn: document.querySelectorAll("#wb-html-layer .wb-map-node").length,
        objects: (wbState.objects || []).length,
      };
    }, [board.id, n]);
    check(`${n}: opened and painted`, open.drawn >= n, `${r1(open.ms)}ms, ${open.drawn} nodes drawn of ${open.objects}`);

    // 3. The three costs inside one map action, each on its own.
    const cost = await page.evaluate(() => {
      const times = (fn, runs) => {
        const out = [];
        for (let i = 0; i < runs; i++) {
          const t = performance.now();
          fn();
          out.push(performance.now() - t);
        }
        return out;
      };
      const index = times(() => wbMapIndex(), 7);
      const idx = wbMapIndex();
      const layout = times(() => wbMapTidyPositions(idx, wbMapLayout()), 7);
      const render = times(() => renderWhiteboardNow(), 5);
      return { index, layout, render };
    });

    // 4. A hand-tool pan across the canvas, with frames recorded.
    const canvas = await page.evaluate(() => {
      const c = document.getElementById("whiteboard-container");
      const b = c.getBoundingClientRect();
      return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height };
    });
    await page.click('#wb-tool-group button[data-tool="pan"]');
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__startFrames());
    await page.mouse.move(canvas.x - 250, canvas.y);
    await page.mouse.down();
    for (let i = 1; i <= 30; i++) {
      await page.mouse.move(canvas.x - 250 + i * 12, canvas.y + Math.sin(i / 4) * 40);
      await page.waitForTimeout(8);
    }
    await page.mouse.up();
    const panFrames = await page.evaluate(() => window.__stopFrames());
    await page.click('#wb-tool-group button[data-tool="select"]');
    await page.waitForTimeout(300);

    // 5. A node drag, with frames recorded. The node picked is one that is
    // actually on screen: a 500-node map runs off the canvas, and dragging
    // at a point where `elementFromPoint` returns the shell measures nothing.
    const node = await page.evaluate(() => {
      const c = document.getElementById("whiteboard-container").getBoundingClientRect();
      for (const el of document.querySelectorAll("#wb-html-layer .wb-map-node")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0) continue;
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        if (cx > c.left + 60 && cx < c.right - 60 && cy > c.top + 60 && cy < c.bottom - 60) {
          return { x: cx, y: cy };
        }
      }
      return null;
    });
    let dragFrames = [];
    if (node) {
      await page.evaluate(() => window.__startFrames());
      await page.mouse.move(node.x, node.y);
      await page.mouse.down();
      for (let i = 1; i <= 25; i++) {
        await page.mouse.move(node.x + i * 6, node.y + i * 3);
        await page.waitForTimeout(8);
      }
      await page.mouse.up();
      dragFrames = await page.evaluate(() => window.__stopFrames());
      await page.waitForTimeout(500);
    }
    check(`${n}: a node was on screen to drag`, Boolean(node), node ? "" : "none inside the canvas");

    const row = {
      n,
      openMs: r1(open.ms),
      drawn: open.drawn,
      indexMs: r1(median(cost.index)),
      layoutMs: r1(median(cost.layout)),
      renderMs: r1(median(cost.render)),
      panMedian: r1(median(panFrames)),
      panWorst: r1(Math.max(0, ...panFrames)),
      panFrames: panFrames.length,
      dragMedian: r1(median(dragFrames)),
      dragWorst: r1(Math.max(0, ...dragFrames)),
      dragFrames: dragFrames.length,
    };
    table.push(row);
    console.log("    " + JSON.stringify(row));

    // 60fps is a 16.7ms frame. A median above it during a gesture is the
    // report being true; below it, at this size, it is not.
    check(`${n}: pan holds 60fps at the median`, row.panMedian <= 17, `${row.panMedian}ms median, ${row.panWorst}ms worst`);
    check(`${n}: drag holds 60fps at the median`, !node || row.dragMedian <= 17, `${row.dragMedian}ms median, ${row.dragWorst}ms worst`);
  }

  console.log("\n  size | open ms | index ms | layout ms | render ms | pan med/worst | drag med/worst");
  for (const r of table) {
    console.log(
      `  ${String(r.n).padStart(4)} | ${String(r.openMs).padStart(7)} | ${String(r.indexMs).padStart(8)} | ` +
        `${String(r.layoutMs).padStart(9)} | ${String(r.renderMs).padStart(9)} | ` +
        `${String(r.panMedian).padStart(5)}/${String(r.panWorst).padEnd(6)} | ${r.dragMedian}/${r.dragWorst}`
    );
  }

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
