// fe1005: what a launch costs with a persistent browser profile (audit
// 2026-10-05, FE-01/FE-02). Run once (cold), restart the server, run again:
// the second run should take every script and stylesheet from the cache.
//   PROFILE=/tmp/mm-fe1005-profile BASE=http://127.0.0.1:8842 node fe1005-cachecost.js
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const BASE = process.env.BASE || "http://127.0.0.1:8842";
const PROFILE = process.env.PROFILE || "/tmp/mm-fe1005-profile";
(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, { viewport: { width: 1440, height: 900 } });
  const page = ctx.pages()[0] || (await ctx.newPage());
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  const reqs = new Map();
  const cached = new Set();
  cdp.on("Network.requestWillBeSent", (e) => reqs.set(e.requestId, { url: e.request.url, bytes: 0 }));
  cdp.on("Network.requestServedFromCache", (e) => cached.add(e.requestId));
  cdp.on("Network.responseReceived", (e) => {
    if (e.response.fromDiskCache || e.response.fromMemoryCache) cached.add(e.requestId);
  });
  cdp.on("Network.loadingFinished", (e) => {
    const r = reqs.get(e.requestId);
    if (r) r.bytes = e.encodedDataLength;
  });
  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#lock-password", { timeout: 30000 });
  const lockMs = Date.now() - t0;
  await page.waitForTimeout(1500);
  const assets = [...reqs.entries()].filter(([, r]) => /\/(js|css)\//.test(r.url));
  const fromCache = assets.filter(([id]) => cached.has(id)).length;
  const fetchedKB = Math.round(assets.filter(([id]) => !cached.has(id)).reduce((a, [, r]) => a + r.bytes, 0) / 1024);
  const pageReq = [...reqs.values()].find((r) => r.url === BASE + "/");
  console.log(
    JSON.stringify({ assets: assets.length, fromCache, fetchedKB, pageKB: pageReq ? Math.round(pageReq.bytes / 1024) : null, lockMs })
  );
  await ctx.close();
})();
