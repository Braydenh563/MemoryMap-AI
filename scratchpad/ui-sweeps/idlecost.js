// INBOX 266: "are things running when they arent necessary and taking up
// extra compute??"
//
// The frontend half, as a rate rather than an impression: with the app open
// and nobody touching it, how many requests does it make a minute, which
// endpoints, and how much of the main thread does it use? A desktop app that
// talks to its own backend once a second is a laptop that never idles, and
// this is the number that says whether it does.
//
// Measured per tab, because the answer is not the same on the dashboard as on
// a board: the point is to find the surface that costs the most when it is
// doing nothing.
const { boot } = require('./lib.js');

const WINDOW_MS = 30000;

(async () => {
  const { page, browser } = await boot({});
  await page.waitForTimeout(4000);

  const findings = [];
  for (const tab of ['dashboard', 'notes', 'chat', 'graph', 'library']) {
    await page.evaluate((t) => switchTab(t), tab).catch(() => {});
    await page.waitForTimeout(2500);

    const seen = [];
    const onReq = (r) => {
      const u = new URL(r.url());
      if (u.origin !== new URL(page.url()).origin) return;
      // Assets are fetched once on load, not on a timer.
      if (/\.(js|css|woff2?|png|svg|ico)(\?|$)/.test(u.pathname)) return;
      seen.push(u.pathname);
    };
    page.on('request', onReq);
    const client = await page.context().newCDPSession(page);
    await client.send('Profiler.enable');
    await client.send('Profiler.setSamplingInterval', { interval: 1000 });
    await client.send('Profiler.start');
    await page.waitForTimeout(WINDOW_MS);
    const { profile } = await client.send('Profiler.stop');
    await client.detach();
    page.off('request', onReq);

    const total = (profile.timeDeltas || []).reduce((a, b) => a + b, 0) / 1000;
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    let idle = 0;
    for (let i = 0; i < (profile.samples || []).length; i++) {
      const f = byId.get(profile.samples[i])?.callFrame;
      if (f && (f.functionName === '(idle)' || f.functionName === '(program)')) idle += (profile.timeDeltas[i] || 0) / 1000;
    }
    const busy = Math.max(0, total - idle);
    const counts = {};
    for (const p of seen) counts[p] = (counts[p] || 0) + 1;
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const perMin = (seen.length / (WINDOW_MS / 60000)).toFixed(1);
    console.log(`${tab.padEnd(10)} ${String(seen.length).padStart(3)} requests in ${WINDOW_MS / 1000}s (${perMin}/min), main thread busy ${busy.toFixed(0)}ms of ${total.toFixed(0)}ms (${(100 * busy / total).toFixed(1)}%)`);
    for (const [path, n] of top) console.log(`             ${String(n).padStart(3)}x ${path}`);
    // A request a second while idle is a poll nobody asked for.
    if (Number(perMin) > 30) findings.push(`${tab}: ${perMin} requests a minute while idle`);
    if (busy / total > 0.05) findings.push(`${tab}: ${(100 * busy / total).toFixed(1)}% of the main thread while idle`);
  }
  for (const line of findings) console.log(`    ${line}`);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
