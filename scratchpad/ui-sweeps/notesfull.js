// How long after navigation the Notes list holds the whole notebook
// (INBOX 472): `allEntries` is paged in the background after the first
// screenful paints, so this is the moment search, the sidebar counts and
// keyboard navigation see every note. Median of RUNS reloads.
//
//   BASE=http://127.0.0.1:8788 TOTAL=2018 node scratchpad/ui-sweeps/notesfull.js
const { boot } = require('./lib.js');
const RUNS = Number(process.env.RUNS || 5);
const TOTAL = Number(process.env.TOTAL || 2000);
(async () => {
  const { browser, page } = await boot();
  const out = [];
  for (let i = 0; i < RUNS; i++) {
    let n = 0;
    const count = () => n++;
    page.on('request', count);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const ms = await page.evaluate(async (total) => {
      const t0 = performance.timeOrigin;
      while (!(typeof allEntries !== 'undefined' && allEntries.length >= total)) {
        await new Promise((r) => setTimeout(r, 10));
        if (performance.now() > 30000) return -1;
      }
      return Math.round(performance.now());
    }, TOTAL);
    page.off('request', count);
    out.push(ms);
  }
  out.sort((a, b) => a - b);
  console.log(JSON.stringify({ runs: out, median: out[Math.floor(out.length / 2)] }));
  await browser.close();
})();
