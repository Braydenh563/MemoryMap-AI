// measure-1010 item 9: server CPU and resident memory over 60 s with one tab open and nothing happening.
//   BASE=http://127.0.0.1:8794 SERVER_PID=NNN PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/measure-idle.js
// CPU = (utime+stime ticks) / CLK_TCK(100) over the window, as % of one core. Also the 4-core machine load average.
const fs = require('fs');
const { boot } = require('./lib.js');
const pid = process.env.SERVER_PID;
const ticks = () => { const f = fs.readFileSync(`/proc/${pid}/stat`, 'utf8').split(')')[1].trim().split(/\s+/); return (+f[11] + +f[12]); };
const rss = () => +fs.readFileSync(`/proc/${pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/)[1];
(async () => {
  const win = +(process.env.SECS || 60);
  const { browser, page } = await boot();
  await page.waitForTimeout(15000);
  console.log('tab', await page.evaluate(() => document.querySelector('.tab-page:not(.hidden)')?.id), 'RSS kB after boot', rss());
  for (const label of ['dashboard tab open', 'notes tab open']) {
    if (label.startsWith('notes')) { await page.evaluate(() => switchTab('notes')); await page.waitForTimeout(10000); }
    const a = ticks(), t0 = Date.now(), la = fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0];
    await page.waitForTimeout(win * 1000);
    const b = ticks(), dt = (Date.now() - t0) / 1000;
    console.log(label, 'server CPU', ((b - a) / 100 / dt * 100).toFixed(1) + '% of one core over', dt.toFixed(0) + 's', 'RSS kB', rss(), 'load avg at start', la);
  }
  await browser.close();
})();
