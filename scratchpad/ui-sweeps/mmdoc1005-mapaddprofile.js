// Audit FEAT-02: a CPU profile of one Tab on an N-topic map, self time by
// function, so the add path is cut where the time is rather than guessed.
//
//   N=301 BASE=http://127.0.0.1:8844 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmdoc1005-mapaddprofile.js
const { boot } = require("./lib.js");

const N = Number(process.env.N || 301);

function outline(n) {
  const lines = ["# Profile " + n, "", "- Centre"];
  let made = 1;
  let b = 0;
  while (made < n) {
    lines.push(`  - Branch ${b}`);
    made++;
    for (let k = 0; k < 9 && made < n; k++, made++) lines.push(`    - Leaf ${b}.${k}`);
    b++;
  }
  return lines.join("\n");
}

(async () => {
  const { page, browser } = await boot();
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async (content) => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content }) });
    await openWhiteboardBoard(b.id);
    if (typeof wbMapTidyFresh === "function") await wbMapTidyFresh();
  }, outline(N));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const pick = (wbState.objects || []).find((o) => o.data?.content === "Branch 3");
    selectWbItem("object", pick.id);
    document.activeElement?.blur?.();
  });
  await page.waitForTimeout(300);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
  await cdp.send("Profiler.start");
  const t0 = Date.now();
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => document.activeElement?.classList?.contains("wb-map-text") && document.activeElement.isContentEditable, null, { timeout: 8000 });
  const wall = Date.now() - t0;
  await page.waitForTimeout(200);
  const { profile } = await cdp.send("Profiler.stop");
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas;
  const self = new Map();
  profile.samples.forEach((id, i) => {
    const n = byId.get(id);
    const key = `${n.callFrame.functionName || "(anon)"} ${(n.callFrame.url || "").split("/").pop().split("?")[0]}:${n.callFrame.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + (dt[i] || 0) / 1000);
  });
  // Inclusive time for the app's own named functions.
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const incl = new Map();
  profile.samples.forEach((id, i) => {
    const seen = new Set();
    for (let cur = id; cur != null; cur = parent.get(cur)) {
      const n = byId.get(cur);
      const name = n.callFrame.functionName;
      if (!name || seen.has(name) || !/\.js/.test(n.callFrame.url)) continue;
      seen.add(name);
      incl.set(name, (incl.get(name) || 0) + (dt[i] || 0) / 1000);
    }
  });
  // Who calls the native hot spots: the nearest app frame above each sample.
  const callers = new Map();
  profile.samples.forEach((id, i) => {
    const n = byId.get(id);
    const name = n.callFrame.functionName;
    if (!["setAttribute", "getBoundingClientRect", "querySelector", "(anon)", ""].includes(name) && !/^(offset|client)/.test(name)) return;
    if (n.callFrame.url && name !== "") return;
    let cur = parent.get(id);
    const chain = [];
    while (cur != null && chain.length < 3) {
      const f = byId.get(cur).callFrame;
      if (/\.js/.test(f.url)) chain.push(`${f.functionName || "anon"}:${f.lineNumber + 1}`);
      cur = parent.get(cur);
    }
    const key = `${name || "(native)"} <- ${chain.join(" <- ")}`;
    callers.set(key, (callers.get(key) || 0) + (dt[i] || 0) / 1000);
  });
  const top = (m, k) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([n, ms]) => `${ms.toFixed(1).padStart(8)}  ${n}`).join("\n");
  console.log(`wall to editable: ${wall}ms at ${N} topics`);
  console.log("--- self ---\n" + top(self, 25));
  console.log("--- inclusive (app functions) ---\n" + top(incl, 40));
  console.log("--- native callers ---\n" + top(callers, 25));
  await browser.close();
})();
