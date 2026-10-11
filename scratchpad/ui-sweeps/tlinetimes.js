// Timeline, reminders and the dashboard on a loaded notebook (tline-1011, ledger
// rows 970, 975, 983, 1037). Numbers, with generous bounds: the machine these were
// first run on had a load average of 25 to 60, so a bound here is "not broken",
// never a performance claim.
//   .venv/bin/python scratchpad/ui-sweeps/seed-timeline-bulk.py <db> 1000 2026-10
//   BASE=http://127.0.0.1:8803 node scratchpad/ui-sweeps/tlinetimes.js
// 1. a 1,000-note month in the calendar: paint time, rows read, cells over their height.
// 2. a day page dragged to another day (a retitle), and its Undo.
// 3. the feed's range change to rows on screen (Timeline row 8's click, at this size).
// 4. the Timeline's Options menu and the reminders' More menu at 1440: inside the window.
// 5. every dashboard button pressed once, in a notebook of plain notes: page errors.
const { boot } = require('./lib');
const log = (k, v) => console.log(k, JSON.stringify(v));
//   ONLY=3,4 runs those steps only (a loaded machine kills one long run).
const ONLY = (process.env.ONLY || '1,2,3,4,5').split(',');
const on = (n) => ONLY.includes(String(n));
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const calendar = async (focus) => {
    await page.evaluate(() => { localStorage.setItem('timeline-view', 'calendar'); localStorage.setItem('timeline-cal-span', 'month'); });
    await page.evaluate(() => switchTab('timeline'));
    await page.waitForFunction(() => typeof timelineCal !== 'undefined' && document.querySelector('.timeline-cal-head'), null, { timeout: 120000 });
    await page.evaluate((f) => { timelineCal.span = 'month'; timelineCal.focus = f; }, focus);
  };

  // 1. the 1,000-note month
  if (on(1)) {
  await calendar('2026-10-11');
  const paints = [];
  for (let i = 0; i < 3; i += 1) {
    paints.push(await page.evaluate(async () => { timelineCal.url = ''; const t = performance.now(); await paintTimelineCalendar(); return Math.round(performance.now() - t); }));
  }
  log('1000-note month', await page.evaluate((p) => ({
    paintMs: p, rows: timelineCal.rows.length, more: timelineCal.more,
    cells: document.querySelectorAll('.timeline-cal-monthcell').length,
    overflowCells: [...document.querySelectorAll('.timeline-cal-monthcell')].filter((c) => c.scrollHeight > c.clientHeight + 1).length,
    chipsShown: document.querySelectorAll('.timeline-cal-monthcell .timeline-cal-item:not([hidden])').length,
    busiestCount: Math.max(...[...document.querySelectorAll('.timeline-cal-monthcell')].map((c) => +c.dataset.count)),
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }), paints));
  log('1000-note month paint bound', { medianMs: median(paints), ok: median(paints) < 30000 });
  }

  // 2. a day page dropped on another day
  if (on(2)) {
  await calendar('2026-10-11');
  await page.evaluate(async () => {
    const have = (await apiJson('/entries?limit=300')).some((e) => e.content.startsWith('# 2026-10-05'));
    if (!have) await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: '# 2026-10-05\n\nA day page.', category: 'T' }) });
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { timelineCal.url = ''; return paintTimelineCalendar(); });
  await page.waitForTimeout(2500);
  const source = page.locator('.timeline-cal-monthcell[data-cal-day="2026-10-05"] .timeline-cal-page');
  const havePage = await source.count();
  log('day page present', { havePage });
  if (havePage) {
    await source.dragTo(page.locator('.timeline-cal-monthcell[data-cal-day="2026-10-07"]'));
    await page.waitForTimeout(3000);
    const moved = await page.evaluate(async () => (await apiJson('/entries?limit=300')).map((e) => e.content.split('\n')[0]).filter((t) => /^# 2026-10-0[57]$/.test(t)));
    await page.click('#status-undo');
    await page.waitForTimeout(3000);
    const back = await page.evaluate(async () => (await apiJson('/entries?limit=300')).map((e) => e.content.split('\n')[0]).filter((t) => /^# 2026-10-0[57]$/.test(t)));
    log('day page drop', { afterDrop: moved, afterUndo: back });
  }
  }

  // 3. the feed's range change to rows
  if (on(3)) {
  await page.evaluate(() => { localStorage.setItem('timeline-view', 'feed'); syncTimelineViewSeg(); });
  const rowMs = [];
  for (const days of ['90', '365', '0']) {
    rowMs.push(await page.evaluate(async (d) => { $('timeline-days').value = d; const t = performance.now(); await renderTimeline(); const ms = Math.round(performance.now() - t); return { days: d, ms, rows: document.querySelectorAll('.timeline-feed .timeline-row').length }; }, days));
  }
  log('feed range change', rowMs);
  log('feed range bound', { ok: rowMs.every((r) => r.ms < 30000 && r.rows > 0) });
  }

  // 4. the two menus at 1440
  if (on(4)) {
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(1500);
  log('timeline options menu', await page.evaluate(() => {
    const d = document.getElementById('timeline-options-menu'); d.open = true;
    const list = d.querySelector('.dock-menu-list, .doc-dock-menu-list') || d.lastElementChild; const r = list.getBoundingClientRect();
    return { rect: [r.left | 0, r.top | 0, r.right | 0, r.bottom | 0], insideWindow: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.top >= 0, scrolls: list.scrollHeight > list.clientHeight + 1 };
  }));
  await page.evaluate(() => { document.getElementById('timeline-options-menu').open = false; switchTab('reminders'); });
  await page.waitForTimeout(2500);
  log('reminders more menu', await page.evaluate(() => {
    const d = document.getElementById('reminders-more-menu'); d.open = true;
    const list = d.querySelector('.dock-menu-list, .doc-dock-menu-list') || d.lastElementChild; const r = list.getBoundingClientRect();
    return { rect: [r.left | 0, r.top | 0, r.right | 0, r.bottom | 0], insideWindow: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.top >= 0, scrolls: list.scrollHeight > list.clientHeight + 1 };
  }));
  }

  // 5. the dashboard, every button once
  if (on(5)) {
  await page.evaluate(() => { switchTab('dashboard'); });
  await page.waitForTimeout(3000);
  const names = await page.evaluate(() => [...document.querySelectorAll('#tab-dashboard button:not([disabled]), #tab-dashboard a[href]')].filter((b) => b.offsetParent && !/delete|clear|reset|remove|bin|sign out|lock|quit/i.test(b.textContent + (b.getAttribute('aria-label') || ''))).slice(0, 45).map((b, i) => { b.dataset.sweepIndex = String(i); return `${b.tagName.toLowerCase()}:${(b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 30)}`; }));
  const before = errors.length;
  let pressed = 0;
  for (let i = 0; i < names.length; i += 1) {
    const ok = await page.evaluate((n) => { const b = document.querySelector(`#tab-dashboard [data-sweep-index="${n}"]`); if (!b) return false; b.click(); return true; }, i);
    if (ok) pressed += 1;
    await page.waitForTimeout(250);
    await page.keyboard.press('Escape');
    await page.evaluate(() => { for (const o of document.querySelectorAll('.modal-overlay:not(.hidden)')) o.classList.add('hidden'); switchTab('dashboard'); });
    await page.waitForTimeout(250);
    if (i % 5 === 4) await page.evaluate(() => { for (const b of document.querySelectorAll('#tab-dashboard [data-sweep-index]')) delete b.dataset.sweepIndex; });
    if (i % 5 === 4) {
      // re-index the next five, the dashboard having redrawn
      await page.evaluate((from) => { [...document.querySelectorAll('#tab-dashboard button:not([disabled]), #tab-dashboard a[href]')].filter((b) => b.offsetParent && !/delete|clear|reset|remove|bin|sign out|lock|quit/i.test(b.textContent + (b.getAttribute('aria-label') || ''))).slice(from, from + 5).forEach((b, k) => { b.dataset.sweepIndex = String(from + k); }); }, i + 1);
    }
  }
  log('dashboard buttons', { found: names.length, pressed, newPageErrors: errors.slice(before), sample: names.slice(0, 8) });
  }
  log('page errors', errors);
  await browser.close();
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
