// Per-frame cost of the four heavy surfaces, at rest and under a drag
// (WORLD_CLASS_PLAN 26.2, decision 63). For each surface and phase it counts
// long tasks (over 50 ms, PerformanceObserver), requestAnimationFrame gaps over
// 17.5 ms, 20 ms and 33 ms, the worst gap, and the style recalcs, layouts and
// script time CDP reports. The machine's load is printed first: on a shared
// four-core box the gaps are inflated; a 60 Hz frame is 16.7 ms and jitters past
// 17.5 on its own, so over17 counts the jitter and over20 the missed frames, and the long tasks at rest
// are the figure to trust.
//
// Surfaces: whiteboard and mind map (a seeded board id and map id, a drag on
// one object), graph (a drag on the canvas), companion (the Atlas companion on
// the dashboard; it has no drag, so the phase is a pointer sweep and wheel
// steps, which is what moves it).
//
// ONLY=graph,companion limits the surfaces. BUDDY=off|me|atlas sets the companion before the surfaces that are not the
// companion's own, so a surface can be told apart from the companion's cost.
//   BASE=http://127.0.0.1:8821 BOARD=76 MAP=77 SCRATCH=/tmp/x \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/frames.js
//
// The at-rest ratchet: REST_BUDGET below is the number of long tasks allowed
// in a 3 s rest on each surface; the sweep exits 1 above it. Seeded with the
// figure measured on 2026-10-10 with BUDDY=off at load average 6 to 7 on four
// cores (graph 1, 9 and 10 on two other runs; companion 6, 6 and 4): lower it,
// never raise it. The target is zero on every surface.
const os = require("os");
const { boot, openBoardsTab, waitForBoardOpen } = require("./lib.js");

const REST_BUDGET = { whiteboard: 0, mindmap: 0, graph: 10, companion: 6 };
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const MS = Number(process.env.MS || 3000);
const BOARD = Number(process.env.BOARD || 76);
const MAP = Number(process.env.MAP || 77);

async function metrics(cdp) {
  const { metrics: m } = await cdp.send("Performance.getMetrics");
  return Object.fromEntries(m.map((x) => [x.name, x.value]));
}

async function phase(page, cdp, name, act) {
  await page.evaluate(() => {
    window.__gaps = [];
    window.__long = [];
    window.__stop = false;
    let last = performance.now();
    const tick = (t) => { window.__gaps.push(t - last); last = t; if (!window.__stop) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    window.__po = new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(e.duration); });
    window.__po.observe({ entryTypes: ["longtask"] });
  });
  const a = await metrics(cdp);
  await act();
  const b = await metrics(cdp);
  const r = await page.evaluate(() => {
    window.__stop = true; window.__po.disconnect();
    const g = window.__gaps.slice(1);
    return {
      frames: g.length,
      over17: g.filter((x) => x > 17.5).length,
      over20: g.filter((x) => x > 20).length,
      over33: g.filter((x) => x > 33.4).length,
      worstMs: Math.round(Math.max(0, ...g)),
      longTasks: window.__long.length,
      longMs: Math.round(window.__long.reduce((s, x) => s + x, 0)),
    };
  });
  r.scriptMsPerS = Math.round(((b.ScriptDuration - a.ScriptDuration) * 1000) / (MS / 1000));
  r.layouts = b.LayoutCount - a.LayoutCount;
  r.recalcs = b.RecalcStyleCount - a.RecalcStyleCount;
  return { surface: name, ...r };
}

async function drag(page, from, steps, dx, dy) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(from.x + i * dx, from.y + Math.sin(i / 5) * dy);
    await page.waitForTimeout(MS / steps);
  }
  await page.mouse.up();
}

async function centre(page, selector) {
  return page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, selector);
}

(async () => {
  console.log(`load average ${os.loadavg().map((x) => x.toFixed(1)).join(" ")} on ${os.cpus().length} cores`);
  const { browser, page } = await boot();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const rows = [];
  const setBuddy = (k) => page.evaluate((v) => {
    const b = document.getElementById("avatar-buddy");
    if (b) { b.value = v; b.dispatchEvent(new Event("change", { bubbles: true })); }
  }, k);
  if (process.env.BUDDY) await setBuddy(process.env.BUDDY);
  const surfaces = [
    ["whiteboard", async () => {
      await openBoardsTab(page);
      await page.evaluate((id) => openWhiteboardBoard(id), BOARD);
      await waitForBoardOpen(page, 3);
      return () => centre(page, "#whiteboard-container .wb-object");
    }],
    ["mindmap", async () => {
      await openBoardsTab(page);
      await page.evaluate((id) => openWhiteboardBoard(id), MAP);
      await page.waitForSelector("#wb-html-layer .wb-map-node", { timeout: 20000 });
      await page.waitForTimeout(800);
      return () => centre(page, "#wb-html-layer .wb-map-node");
    }],
    ["graph", async () => {
      await page.evaluate(() => switchTab("graph"));
      await page.waitForSelector("#graph-canvas", { timeout: 20000 });
      await page.waitForTimeout(2500);
      return () => centre(page, "#graph-canvas");
    }],
    ["companion", async () => {
      await page.evaluate(() => {
        revealTab("dashboard");
      });
      await setBuddy("atlas");
      await page.waitForTimeout(2500);
      return null;
    }],
  ];
  for (const [name, open] of surfaces) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    try {
      const where = await open();
      await page.mouse.move(5, 5);
      rows.push(await phase(page, cdp, name + " rest", () => page.waitForTimeout(MS)));
      const at = where ? await where() : { x: 720, y: 450 };
      if (!at) { console.log(`${name}: nothing to drag`); continue; }
      rows.push(await phase(page, cdp, name + " drag", where ? () => drag(page, at, 60, 4, 30) : async () => {
        await page.mouse.move(at.x, at.y);
        for (let i = 0; i < 60; i++) {
          await page.mouse.move(at.x + i * 8, at.y + Math.sin(i / 5) * 60);
          await page.mouse.wheel(0, i % 2 ? 12 : -12);
          await page.waitForTimeout(MS / 60);
        }
      }));
    } catch (e) {
      console.log(`${name}: FAILED ${String(e.message).split("\n")[0]}`);
    }
  }
  for (const r of rows) console.log(JSON.stringify(r));
  let bad = 0;
  for (const r of rows.filter((x) => x.surface.endsWith(" rest"))) {
    const budget = REST_BUDGET[r.surface.split(" ")[0]];
    if (r.longTasks > budget) { bad += 1; console.log(`FAIL ${r.surface}: ${r.longTasks} long tasks at rest (budget ${budget})`); }
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
