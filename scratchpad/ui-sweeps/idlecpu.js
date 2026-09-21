// What the notebook costs a CPU when nobody is touching it (INBOX 266, item 7).
//
// `idle.js` counts requests and timer wakes, which is what a poll looks like
// from the outside. This is the other half the owner asked for by name: the
// CPU itself, on both sides, over minutes rather than a snapshot.
//
//   * The tab: Chromium's own `Performance.getMetrics().TaskDuration`, the
//     seconds of main-thread task time the page has run. Sampled twice with
//     a wait in between, so the number is what this page cost during the
//     wait and not what booting it cost.
//   * The server: `/proc/<pid>/stat` utime+stime over the same window, which
//     the caller passes in as SERVER_PID. Left out if it is not given.
//
// SERVER_PID has to be the uvicorn process itself. `pgrep -f "port 8796"`
// is not it: this sandbox's own shell wrapper carries that text in its
// command line, matches first, and then exits, which is how four runs of
// this were lost to `ENOENT /proc/<pid>/stat`. Resolve it with something
// that looks at the executable, e.g.
//   for p in $(pgrep -f 'uvicorn memorymap'); do
//     head -c 200 /proc/$p/cmdline | tr '\0' ' ' | grep -q -- '--port 8796' \
//       && [ -e "/proc/$p/exe" ] && echo $p; done | head -1
//
// A settling wait first, because boot is not idle: the dashboard's widgets,
// the emblem and the first polls all land in the first few seconds, and
// including them would report a startup cost as a resting one.
//
//   BASE=http://127.0.0.1:8796 SERVER_PID=$(pgrep -f 'port 8796') \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node idlecpu.js [seconds]
const fs = require('fs');
const { boot } = require('./lib.js');
const WINDOW = Number(process.argv[2] || 180);
const SETTLE = 20;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

//: Never throws. A pid that is wrong, or that goes away mid-window, cost
//: four complete runs of this sweep once: the server number is the small
//: half of the answer and losing the tab's number with it is absurd.
const serverCpu = (pid) => {
  if (!pid) return null;
  try {
    const f = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(' ');
    return (Number(f[13]) + Number(f[14])) / 100; // CLK_TCK is 100 here
  } catch (e) {
    console.log(`(no server cpu: ${e.code || e.message} for pid ${pid})`);
    return null;
  }
};

(async () => {
  const { page, browser } = await boot();
  const pid = process.env.SERVER_PID ? process.env.SERVER_PID.trim().split(/\s+/)[0] : null;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const task = async () => {
    const { metrics } = await cdp.send('Performance.getMetrics');
    const row = metrics.find((m) => m.name === 'TaskDuration');
    return row ? row.value : 0;
  };

  //: `TAB=notes` parks the app somewhere else before settling. It matters:
  //: the Dashboard shows the animated emblem, which is a p5 draw loop that
  //: runs on purpose ("whenever the logo shows, make sure it is never
  //: static"), so measuring only the Dashboard reports a deliberate
  //: decoration as the cost of having the app open.
  if (process.env.TAB) {
    await page.evaluate((name) => {
      if (typeof switchTab === 'function') switchTab(name);
      else document.querySelector(`.tab-btn[data-tab="${name}"]`)?.click();
    }, process.env.TAB);
    await sleep(2000);
  }
  await sleep(SETTLE * 1000);
  const pageBefore = await task();
  const srvBefore = serverCpu(pid);
  console.log(`settled; measuring ${WINDOW}s of nothing`);
  await sleep(WINDOW * 1000);
  const pageAfter = await task();
  const srvAfter = serverCpu(pid);

  const pageCpu = pageAfter - pageBefore;
  console.log(`tab:    ${pageCpu.toFixed(2)}s of main-thread task time over ${WINDOW}s = ${(100 * pageCpu / WINDOW).toFixed(2)}% of one core`);
  if (srvBefore !== null && srvAfter !== null) {
    const srv = srvAfter - srvBefore;
    console.log(`server: ${srv.toFixed(2)}s cpu over ${WINDOW}s = ${(100 * srv / WINDOW).toFixed(2)}% of one core (pid ${pid})`);
    console.log(`total:  ${(100 * (pageCpu + srv) / WINDOW).toFixed(2)}% of one core`);
  }
  await browser.close();
  process.exit(0);
})();
