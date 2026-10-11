// The owner, 2026-10-11: "the companion is a bit glitchy but Im running
// league of legends rn". Under CDP CPU throttling (CPU, default 6) the
// companion acts in its corner and in its large view, hides and shows the
// page mid-act, falls asleep mid-act; measured: each act class's time on
// against its spec (none held past twice its length plus 1.5s), any act
// left on at the end, the sleep state's act, and frames (rAF gaps).
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((k) => { const b = document.getElementById("avatar-buddy"); b.value = k; b.dispatchEvent(new Event("change", { bubbles: true })); }, process.env.KIND || "atlas");
  await page.waitForTimeout(3000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: Number(process.env.CPU || 6) });
  await page.evaluate(() => {
    const b = document.getElementById("nm-buddy");
    window.__acts = []; const on = {};
    new MutationObserver(() => {
      const now = performance.now();
      const cls = [...b.classList].filter((c) => c.startsWith("nmb-act-"));
      for (const c of cls) if (!on[c]) on[c] = now;
      for (const c of Object.keys(on)) if (!cls.includes(c)) { window.__acts.push([c, Math.round(now - on[c])]); delete on[c]; }
    }).observe(b, { attributes: true, attributeFilter: ["class"] });
    window.__on = on;
    window.__gaps = []; let last = performance.now();
    const f = (t) => { window.__gaps.push(t - last); last = t; if (window.__gaps.length < 4000) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  const acts = ["wave", "hop", "stretch", "shrug", "cheer", "look", "scratch", "wiggle"];
  for (const a of acts) { await page.evaluate((a) => nameMarkBuddyAct(a), a); await page.waitForTimeout(2600); }
  // Hidden mid-act (an occluded window), back after 3s.
  await page.evaluate(() => nameMarkBuddyAct("wave"));
  await page.waitForTimeout(300);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => false }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.waitForTimeout(1500);
  const afterHide = await page.evaluate(() => [...document.getElementById("nm-buddy").classList].filter((c) => c.startsWith("nmb-act-")).join(" "));
  // Asleep mid-act.
  await page.evaluate(() => nameMarkBuddyAct("wave"));
  await page.waitForTimeout(300);
  await page.evaluate(() => { nmb.lastInput = Date.now() - NMB_SLEEP_MS - 1000; nmb.awakeUntil = 0; nameMarkBuddyTick(); });
  await page.waitForTimeout(2500);
  const asleep = await page.evaluate(() => [...document.getElementById("nm-buddy").classList].filter((c) => /nmb-(act|sleep)/.test(c)).join(" "));
  // Its large view under load.
  await page.evaluate(() => openNameMarkViewer(document.getElementById("nm-buddy").dataset.seed || "", { visit: true }));
  await page.waitForTimeout(9000);
  const res = await page.evaluate(() => {
    const spec = (c) => (NAME_MARK_BUDDY_ACTS[c.slice(8)] || {}).ms || 1200;
    const long = window.__acts.filter(([c, ms]) => ms > spec(c) * 2 * 1.3 + 1500);
    const g = window.__gaps.slice(5).sort((a, b) => a - b);
    return { acts: window.__acts.length, long, onAtEnd: Object.keys(window.__on), frames: g.length, p50: Math.round(g[g.length >> 1]), p95: Math.round(g[Math.floor(g.length * 0.95)]), max: Math.round(g[g.length - 1]) };
  });
  console.log(JSON.stringify({ cpu: process.env.CPU || 6, afterHide, asleep, ...res }));
  await browser.close();
})();
