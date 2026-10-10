// Brief 43 item 2: what an open, untouched tab asks the server for, by
// endpoint, after boot has settled, with the server's CPU over the same window
// (SERVER_PID). idlecpu.js gives the total; this names who spends it.
//   BASE=... SERVER_PID=... node audit-poll.js [seconds]
const fs = require('fs');
const { boot, BASE } = require('./lib.js');
const W = Number(process.argv[2] || 40);
const cpu = (pid) => { const f = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(' '); return (Number(f[13]) + Number(f[14])) / 100; };
(async () => {
  const { browser, page } = await boot();
  await page.waitForTimeout(20000);
  const counts = new Map(); const times = new Map();
  page.on('requestfinished', async (r) => {
    const u = r.url().replace(BASE, '').replace(/\?.*/, '');
    counts.set(u, (counts.get(u) || 0) + 1);
    const t = r.timing(); times.set(u, (times.get(u) || 0) + Math.max(0, t.responseEnd - t.requestStart));
  });
  const pid = process.env.SERVER_PID; const c0 = pid ? cpu(pid) : 0;
  await page.waitForTimeout(W * 1000);
  console.log(`server cpu ${(cpu(pid) - c0).toFixed(2)}s over ${W}s`);
  for (const [u, n] of [...counts.entries()].sort((a, b) => (times.get(b[0]) || 0) - (times.get(a[0]) || 0)).slice(0, 10)) console.log(String(n).padStart(4), 'x', String(Math.round(times.get(u))).padStart(6), 'ms total', u);
  await browser.close();
})();
