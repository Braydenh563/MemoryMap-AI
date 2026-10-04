// GRAPH_PLAN 518 (2): /graph's server time, cold then warm, on a seeded
// notebook (scratchpad/graph_payload_seed.py). Prints ms per call.
//   BASE=http://127.0.0.1:8808 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/graphpayload.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
  const times = await page.evaluate(async () => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const t = performance.now();
      const body = await (await api('/graph')).json();
      out.push([Math.round(performance.now() - t), body.nodes.length]);
    }
    return out;
  });
  console.log(JSON.stringify(times));
  await browser.close();
})();
