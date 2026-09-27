// The app-wide performance pass (the owner, 2026-09-27: "can you optimise
// further and reduce lag??"). One run, four tables, all from the running app:
//
//   idle      per tab, main-thread ms per second (CDP TaskDuration delta over
//             IDLE_MS after a settle) and long tasks (> 50ms, PerformanceObserver),
//             with the companion Atlas at Medium and with it off;
//   switch    per tab, the time from `switchTab` to the second frame after it,
//             cold (the first visit this boot) and warm (the second), and the
//             longest task inside that window;
//   typing    40 keys into the Notes capture box and the chat composer: the
//             Event Timing API's input-to-next-paint per key (p50, p95, max);
//   settings  open Settings to the second frame, then 3s of wheel scrolling
//             in its pane: frame p95 and long tasks.
//
// CPU at 1x unless THROTTLE is set (the sandbox is vsync-bound at 16.7ms, so
// at 1x a frame figure hides everything under a frame; ms per second and long
// tasks do not). JSON to OUT for a before/after diff.
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/perfpass.js [idle|switch|typing|settings|all]
const fs = require('fs');
const { boot } = require('./lib.js');

const WHICH = process.argv[2] || 'all';
const TABS = (process.env.TABS || 'dashboard,notes,chat,graph,library,timeline,reminders').split(',');
const IDLE_MS = Number(process.env.IDLE_MS || 5000);
const RATE = Number(process.env.THROTTLE || 1);
const OUT = process.env.OUT || '';
const r1 = (x) => Math.round(x * 10) / 10;
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };

async function metrics(cdp) {
  const { metrics: m } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(m.map((x) => [x.name, x.value]));
}

async function installObservers(page) {
  await page.evaluate(() => {
    if (window.__perfObs) return;
    window.__perfObs = true;
    window.__long = [];
    new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__long.push({ t: e.startTime, d: e.duration }); })
      .observe({ type: 'longtask', buffered: false });
    window.__events = [];
    try {
      new PerformanceObserver((list) => { for (const e of list.getEntries()) window.__events.push({ n: e.name, d: e.duration, t: e.startTime }); })
        .observe({ type: 'event', durationThreshold: 16, buffered: false });
    } catch (e) {}
  });
}

async function setCompanion(page, kind) {
  await page.evaluate((k) => {
    const size = document.getElementById('avatar-buddy-size');
    if (size && size.value !== '1') { size.value = '1'; size.dispatchEvent(new Event('change', { bubbles: true })); }
    const b = document.getElementById('avatar-buddy');
    if (b && b.value !== k) { b.value = k; b.dispatchEvent(new Event('change', { bubbles: true })); }
  }, kind);
  await page.waitForTimeout(800);
}

async function idle(page, cdp, label) {
  const rows = [];
  for (const tab of TABS) {
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(2500);
    await page.evaluate(() => { window.__long = []; });
    const a = await metrics(cdp);
    await page.waitForTimeout(IDLE_MS);
    const b = await metrics(cdp);
    const long = await page.evaluate(() => window.__long.slice());
    const secs = IDLE_MS / 1000;
    const row = {
      tab,
      msPerSec: r1(((b.TaskDuration - a.TaskDuration) * 1000) / secs),
      scriptMsPerSec: r1(((b.ScriptDuration - a.ScriptDuration) * 1000) / secs),
      styleMsPerSec: r1((((b.RecalcStyleDuration - a.RecalcStyleDuration) + (b.LayoutDuration - a.LayoutDuration)) * 1000) / secs),
      long: long.length,
      longMs: Math.round(long.reduce((s, x) => s + x.d, 0)),
    };
    rows.push(row);
    console.log(`idle ${label.padEnd(5)} ${tab.padEnd(10)} ${String(row.msPerSec).padStart(6)} ms/s (script ${row.scriptMsPerSec}, style+layout ${row.styleMsPerSec}), long tasks ${row.long} (${row.longMs}ms)`);
  }
  return rows;
}

async function switchTimes(page) {
  const rows = [];
  for (const pass of ['cold', 'warm']) {
    for (const tab of TABS) {
      // From a neutral tab, so each switch is a real arrival.
      const from = tab === 'reminders' ? 'timeline' : 'reminders';
      await page.evaluate((t) => switchTab(t), from);
      await page.waitForTimeout(1200);
      await page.evaluate(() => { window.__long = []; });
      const ms = await page.evaluate(async (t) => {
        const t0 = performance.now();
        await switchTab(t);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return performance.now() - t0;
      }, tab);
      await page.waitForTimeout(600);
      const long = await page.evaluate(() => window.__long.slice());
      const worst = long.reduce((m, x) => Math.max(m, x.d), 0);
      rows.push({ pass, tab, ms: r1(ms), worstTask: Math.round(worst), long: long.length });
      console.log(`switch ${pass} ${tab.padEnd(10)} ${String(r1(ms)).padStart(7)} ms, worst task ${Math.round(worst)}ms, long tasks ${long.length}`);
    }
  }
  return rows;
}

async function typing(page) {
  const rows = [];
  const targets = [
    { name: 'notes capture', prep: async () => { await page.evaluate(() => { switchTab('notes'); showNotesSection('capture'); }); await page.waitForTimeout(1500); await page.click('#entry-content').catch(() => {}); await page.waitForTimeout(800); } },
    // With no model the composer is disabled (it says why); typing into it
    // is what is measured, so the probe switches it on for the run.
    { name: 'chat composer', prep: async () => { await page.evaluate(() => switchTab('chat')); await page.waitForTimeout(1500); await page.evaluate(() => { document.getElementById('chat-input').disabled = false; }); await page.click('#chat-input'); await page.waitForTimeout(500); } },
  ];
  for (const t of targets) {
    await t.prep();
    await page.evaluate(() => { window.__events = []; window.__long = []; });
    const text = 'the quick brown fox jumps over the lazy dog';
    for (const ch of text.slice(0, 40)) await page.keyboard.type(ch, { delay: 60 });
    await page.waitForTimeout(500);
    const ev = await page.evaluate(() => window.__events.filter((e) => /key|input|beforeinput/.test(e.n)));
    const long = await page.evaluate(() => window.__long.length);
    const ds = ev.map((e) => e.d);
    const row = { target: t.name, slowEvents: ds.length, p50: Math.round(pct(ds, 0.5)), p95: Math.round(pct(ds, 0.95)), max: Math.round(Math.max(0, ...ds)), long };
    rows.push(row);
    console.log(`typing ${t.name.padEnd(14)} events over 16ms: ${row.slowEvents} of ~80, p50 ${row.p50}, p95 ${row.p95}, max ${row.max}ms, long tasks ${long}`);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
  }
  return rows;
}

async function settings(page) {
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => { window.__long = []; });
  const openMs = await page.evaluate(async () => {
    const t0 = performance.now();
    await openSettingsModal('appearance');
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  });
  await page.waitForTimeout(800);
  const openLong = await page.evaluate(() => window.__long.slice());
  const box = await page.evaluate(() => {
    const el = [...document.querySelectorAll('#settings-modal *')].find((n) => n.scrollHeight > n.clientHeight + 50 && /(auto|scroll)/.test(getComputedStyle(n).overflowY));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: el.id || el.className };
  });
  let scroll = null;
  if (box) {
    await page.evaluate(() => {
      window.__long = []; window.__f = []; window.__fon = true; let last = performance.now();
      const tick = (t) => { if (!window.__fon) return; window.__f.push(t - last); last = t; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    await page.mouse.move(box.x, box.y);
    for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, i < 30 ? 80 : -80); await page.waitForTimeout(40); }
    const frames = await page.evaluate(() => { window.__fon = false; return window.__f.slice(1); });
    const long = await page.evaluate(() => window.__long.slice());
    scroll = { frames: frames.length, p95: r1(pct(frames, 0.95)), max: r1(Math.max(0, ...frames)), long: long.length, longMs: Math.round(long.reduce((s, x) => s + x.d, 0)), scroller: box.id };
  }
  const row = { openMs: r1(openMs), openWorstTask: Math.round(openLong.reduce((m, x) => Math.max(m, x.d), 0)), scroll };
  console.log(`settings open ${row.openMs}ms (worst task ${row.openWorstTask}ms); scroll ${JSON.stringify(scroll)}`);
  return row;
}

(async () => {
  const { browser, page } = await boot({});
  const out = {};
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    if (RATE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    await installObservers(page);
    if (WHICH === 'all' || WHICH === 'switch') out.switch = await switchTimes(page);
    if (WHICH === 'all' || WHICH === 'idle') {
      await setCompanion(page, 'off');
      out.idleOff = await idle(page, cdp, 'off');
      await setCompanion(page, 'atlas');
      out.idleAtlas = await idle(page, cdp, 'atlas');
      await setCompanion(page, 'off');
    }
    if (WHICH === 'all' || WHICH === 'typing') out.typing = await typing(page);
    if (WHICH === 'all' || WHICH === 'settings') out.settings = await settings(page);
  } finally {
    await browser.close();
  }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
