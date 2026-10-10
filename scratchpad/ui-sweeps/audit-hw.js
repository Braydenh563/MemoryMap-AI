// Old hardware (Brief 43 item 2, audit 2026-10-10): the dashboard drawn from a
// cold load with the CPU slowed 4x (CDP), against the same load unthrottled on
// the same machine in the same minute so the ratio survives a busy host; the
// page's JS heap; the server's RSS (SERVER_PID, the uvicorn process itself);
// and how many notes each list puts in the DOM at once with 5,000 seeded.
//
//   BASE=http://127.0.0.1:8787 SERVER_PID=<uvicorn pid> RUNS=3 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/audit-hw.js
const fs = require('fs');
const { boot, BASE } = require('./lib.js');
const RUNS = Number(process.env.RUNS || 3);
const median = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const rss = (pid) => {
  try { return Math.round(Number(fs.readFileSync(`/proc/${pid}/statm`, 'utf8').split(' ')[1]) * 4096 / 1048576); }
  catch (e) { return null; }
};

(async () => {
  const { browser, page } = await boot();
  const state = await page.context().storageState();
  const cold = async (rate) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: state });
    await ctx.addInitScript(() => {
      try { localStorage.setItem('activeTab', 'dashboard'); localStorage.setItem('onboardingDone', '1'); localStorage.setItem('tourDone', '1'); } catch (e) {}
      window.__ready = null;
      const tick = () => {
        const panel = document.getElementById('tab-dashboard');
        const splash = document.getElementById('boot-splash');
        const up = panel && !panel.classList.contains('hidden') && panel.checkVisibility && panel.checkVisibility()
          && panel.innerText.trim().length > 20 && (!splash || splash.classList.contains('hidden') || splash.checkVisibility() === false);
        if (up) window.__ready = Math.round(performance.now()); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const p = await ctx.newPage();
    if (rate > 1) { const c = await ctx.newCDPSession(p); await c.send('Emulation.setCPUThrottlingRate', { rate }); }
    await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => window.__ready !== null, null, { timeout: 60000, polling: 100 }).catch(() => {});
    const out = await p.evaluate(() => ({ ready: window.__ready, heapMB: Math.round((performance.memory || {}).usedJSHeapSize / 1048576) }));
    await ctx.close();
    return out;
  };
  const one = [], four = [], heaps = [];
  for (let i = 0; i < RUNS; i += 1) {
    const a = await cold(1); one.push(a.ready); heaps.push(a.heapMB);
    const b = await cold(4); four.push(b.ready);
  }
  console.log('dashboard drawn ms, unthrottled', JSON.stringify(one), 'median', median(one));
  console.log('dashboard drawn ms, 4x cpu     ', JSON.stringify(four), 'median', median(four));
  console.log('js heap MB                     ', JSON.stringify(heaps));

  // Lists: how many cards does each put in the DOM with 5,000 notes behind it?
  for (const tab of ['notes', 'timeline', 'library']) {
    await page.evaluate((t) => window.switchTab(t), tab);
    await page.waitForTimeout(3500);
    const n = await page.evaluate((t) => {
      const root = document.getElementById('tab-' + t);
      return { all: root.querySelectorAll('*').length, cards: root.querySelectorAll('.note-card, .entry-card, [data-entry-id], [data-note-id], .tl-item, .timeline-entry').length, scrollH: root.scrollHeight };
    }, tab);
    console.log('tab', tab, JSON.stringify(n));
  }
  const heap = await page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1048576));
  console.log('page heap after tabs MB', heap);
  console.log('server rss MB', rss(process.env.SERVER_PID));
  await browser.close();
})();
