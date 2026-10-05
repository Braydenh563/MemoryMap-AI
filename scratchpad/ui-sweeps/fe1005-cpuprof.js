// fe1005: CPU profile of one expression in the app (self time by function).
//   EXPR="renderEntries()" TAB=notes BASE=... node fe1005-cpuprof.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, ctx, page } = await boot();
  const tab = process.env.TAB || "notes";
  await page.click(`[data-tab="${tab}"]`).catch(() => {});
  if (tab === "notes") {
    await page.waitForFunction(() => typeof entriesComplete !== "undefined" && entriesComplete, null, { timeout: 120000 });
  }
  await page.waitForTimeout(Number(process.env.WAIT || 2000));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
  await cdp.send("Profiler.start");
  const expr = process.env.EXPR || "renderEntries()";
  const runs = Number(process.env.RUNS || 3);
  if (process.env.IDLE) await page.waitForTimeout(Number(process.env.IDLE));
  else await page.evaluate(`(async () => { for (let i = 0; i < ${runs}; i++) await (${expr}); })()`);
  const { profile } = await cdp.send("Profiler.stop");
  const self = new Map();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dt = profile.timeDeltas;
  const counts = new Map();
  profile.samples.forEach((id, i) => counts.set(id, (counts.get(id) || 0) + (dt[i] || 0)));
  for (const [id, us] of counts) {
    const n = byId.get(id);
    const f = n.callFrame;
    const key = `${f.functionName || "(anon)"} ${(f.url || "").split("/").pop().split("?")[0]}:${f.lineNumber + 1}`;
    self.set(key, (self.get(key) || 0) + us);
  }
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, Number(process.env.TOP || 18));
  for (const [k, us] of top) console.log(String(Math.round(us / 1000)).padStart(6), "ms", k);
  await browser.close();
})();
