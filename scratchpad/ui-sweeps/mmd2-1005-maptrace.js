// FEAT-02 (the 100ms gate): a Chromium timeline trace of one Tab on an
// N-topic map, from the key to an editable topic: every style recalculation
// and layout with its size and the script that forced it, so the add path is
// cut where the time is.
//
//   N=301 BASE=http://127.0.0.1:8858 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmd2-1005-maptrace.js
const { boot } = require("./lib.js");
const N = Number(process.env.N || 301);
function outline(n) {
  const lines = ["# Trace " + n, "", "- Centre"];
  let made = 1, b = 0;
  while (made < n) {
    lines.push(`  - Branch ${b}`); made++;
    for (let k = 0; k < 9 && made < n; k++, made++) lines.push(`    - Leaf ${b}.${k}`);
    b++;
  }
  return lines.join("\n");
}
(async () => {
  const { page, browser } = await boot();
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(async (content) => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content }) });
    await openWhiteboardBoard(b.id);
    await wbMapTidyFresh();
  }, outline(N));
  await page.waitForTimeout(1500);
  const rounds = Number(process.env.ROUNDS || 3);
  for (let round = 0; round < rounds; round++) {
    await page.evaluate((round) => {
      const pick = (wbState.objects || []).find((o) => o.data?.content === `Branch ${3 + round}`);
      selectWbItem("object", pick.id);
      document.activeElement?.blur?.();
      window.__t0 = 0;
      document.addEventListener("keydown", (e) => { if (e.key === "Tab") window.__t0 = performance.now(); }, { capture: true, once: true });
    }, round);
    await page.waitForTimeout(300);
    const cdp = await page.context().newCDPSession(page);
    const events = [];
    cdp.on("Tracing.dataCollected", (d) => events.push(...d.value));
    const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
    await cdp.send("Tracing.start", { categories: "devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.stack,v8.execute" + (process.env.WHY ? ",disabled-by-default-devtools.timeline.invalidationTracking" : ""), transferMode: "ReportEvents" });
    const waiter = page.evaluate(() => new Promise((resolve) => {
      const start = performance.now();
      const tick = () => {
        const el = document.activeElement;
        if (el?.classList?.contains("wb-map-text") && el.isContentEditable && window.__t0) return resolve(Math.round(performance.now() - window.__t0));
        if (performance.now() - start > 4000) return resolve(-1);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }));
    await page.keyboard.press("Tab");
    const ms = await waiter;
    await cdp.send("Tracing.end");
    await done;
    await page.keyboard.type("Traced");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(800);
    const main = events.filter((e) => e.ph === "X" && e.dur);
    const sum = {};
    for (const e of main) {
      if (!["UpdateLayoutTree", "Layout", "Paint", "PrePaint", "Layerize", "FunctionCall", "EvaluateScript", "ParseHTML", "HitTest", "RecalculateStyles", "ScheduleStyleRecalculation", "TimerFire", "FireAnimationFrame", "EventDispatch", "Commit", "UpdateLayer"].includes(e.name)) continue;
      sum[e.name] = (sum[e.name] || 0) + e.dur / 1000;
    }
    console.log(`round ${round}: key to editable ${ms}ms`);
    console.log("  totals", JSON.stringify(Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, Math.round(v * 10) / 10]))));
    const heavy = main.filter((e) => (e.name === "UpdateLayoutTree" || e.name === "Layout") && e.dur > 3000).sort((a, b) => b.dur - a.dur).slice(0, 8);
    for (const e of heavy) {
      const stack = (e.args?.beginData?.stackTrace || []).slice(0, 3).map((f) => `${f.functionName}:${f.lineNumber}`).join(" < ");
      const count = e.args?.elementCount ?? e.args?.beginData?.dirtyObjects ?? "";
      console.log(`  ${e.name} ${Math.round(e.dur / 100) / 10}ms n=${count} ${stack}`);
    }
    if (process.env.WHY) {
      const why = {};
      for (const e of events) {
        if (!/InvalidationTracking/.test(e.name)) continue;
        const d = e.args?.data || {};
        const key = `${e.name.replace("InvalidationTracking", "")} ${d.reason || ""} ${(d.invalidatedSelectorId || d.selectors?.map((x) => x.selector).join("|") || "").slice(0, 80)} ${d.nodeName || ""}`;
        why[key] = (why[key] || 0) + 1;
      }
      for (const [k, n] of Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(n).padStart(6), k);
    }
    await cdp.detach();
  }
  await browser.close();
})();
