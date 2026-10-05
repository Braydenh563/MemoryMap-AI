// perf2-1005 (audit FE-10): what putting the Settings panes in a <template>
// would buy, measured before building it. The page is served as is, or with
// every `.settings-section` wrapped in one <template> (route interception),
// and the time to DOMContentLoaded and to the lock screen is read from the
// Performance API, N runs each, interleaved.
//   BASE=http://127.0.0.1:8859 RUNS=6 node perf2-1005-settingstpl.js
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const BASE = process.env.BASE || "http://127.0.0.1:8859";
const RUNS = Number(process.env.RUNS || 6);

function templated(html) {
  const first = html.indexOf('<section class="settings-section"');
  const lastOpen = html.lastIndexOf('<section class="settings-section"');
  // the end of the last section: its matching </section> (sections do not nest)
  const end = html.indexOf("</section>", lastOpen) + "</section>".length;
  if (first < 0 || end < first) return html;
  return html.slice(0, first) + '<template id="settings-sections">' + html.slice(first, end) + "</template>" + html.slice(end);
}

(async () => {
  const browser = await chromium.launch();
  const results = { asIs: [], templated: [] };
  for (let run = 0; run < RUNS; run++) {
    for (const mode of ["asIs", "templated"]) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      if (mode === "templated") {
        await page.route(`${BASE}/`, async (route) => {
          const response = await route.fetch();
          const body = await response.text();
          await route.fulfill({ response, body: templated(body), headers: { ...response.headers(), "content-length": undefined } });
        });
      }
      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("#lock-password", { state: "visible", timeout: 30000 }).catch(() => {});
      const t = await page.evaluate(() => {
        const nav = performance.getEntriesByType("navigation")[0];
        return {
          dcl: Math.round(nav.domContentLoadedEventEnd),
          lock: Math.round(performance.now()),
          nodes: document.getElementsByTagName("*").length,
        };
      });
      results[mode].push(t);
      await ctx.close();
    }
  }
  const med = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  for (const mode of Object.keys(results)) {
    const r = results[mode];
    console.log(mode, "dcl", med(r.map((x) => x.dcl)), "lock", med(r.map((x) => x.lock)), "nodes", r[0].nodes);
  }
  await browser.close();
})();
