// The Timeline calendar's gates (TIMELINE_PLAN section 9, Brief 55).
//   BASE=http://127.0.0.1:8862 DATA=<data dir> node calendar.js
// Seeds a fresh data dir once: 48 notes back-dated over six months by
// seed-timeline.py, a day page for today, a meeting, and six reminders (four
// on one day, so "+n" shows). Then measures, per the plan's table:
//   step 1: the month at 1440: in-month cells equal the month's days, no cell
//           overflows (scrollHeight against clientHeight), no more visible chips (and "+n")
//           than the cell's measured slots, and each day's count equals the feed's rows for that day;
//   step 2: 1440, 1024, 768, 390: which grid draws, and no horizontal scroll;
//   step 3: drags a reminder a day on, reads its due time back, undoes it;
//   keys:   the arrows, Page Down, T and Enter.
const { execFileSync } = require('child_process');
const path = require('path');
const { boot, BASE } = require('./lib');
const DATA = process.env.DATA;

async function seed(page) {
  const have = await page.evaluate(async () => (await apiJson('/entries?limit=1')).length);
  if (have) return false;
  await page.evaluate(async () => {
    const day = (n, h = 9, m = 0) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, m, 0, 0); return d; };
    for (let i = 0; i < 48; i += 1) {
      await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Calendar sweep note ${i}\n\nSomething written for the sweep.`, category: 'Sweep' }) });
    }
    const today = day(0);
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `# ${key}\n\nToday's page.`, category: 'Sweep' }) });
    const two = day(2);
    const whenKey = `${two.getFullYear()}-${String(two.getMonth() + 1).padStart(2, '0')}-${String(two.getDate()).padStart(2, '0')}T14:00`;
    await apiJson('/meetings', { method: 'POST', body: JSON.stringify({ title: 'Planning meeting', when: whenKey, category: 'Sweep' }) });
    const reminders = [['Dentist', day(1, 9)], ['Call mum', day(3, 8)], ['Pay rent', day(3, 10)], ['Gym', day(3, 18)], ['Book train', day(3, 20)], ['Water plants', day(5, 7, 30)]];
    for (const [text, due] of reminders) {
      await apiJson('/reminders', { method: 'POST', body: JSON.stringify({ text, due_at: due.toISOString() }) });
    }
  });
  if (DATA) execFileSync('python3', [path.join(__dirname, 'seed-timeline.py'), path.join(DATA, 'memorymap.db')], { stdio: 'inherit' });
  return true;
}

async function openCalendar(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate(() => { localStorage.setItem('timeline-view', 'calendar'); localStorage.setItem('timeline-scale', 'day'); localStorage.setItem('timeline-cal-span', 'month'); });
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(1500);
}

function measure(page) {
  return page.evaluate(() => {
    const box = document.getElementById('timeline-calendar');
    const month = box.querySelector('.timeline-cal-month');
    const week = box.querySelector('.timeline-cal-weekwrap');
    const cells = [...box.querySelectorAll('.timeline-cal-monthcell, .timeline-cal-alldaycell, .timeline-cal-hourcell')];
    const over = cells.filter((c) => c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1).map((c) => `${c.dataset.calDay}${c.dataset.calHour ? `@${c.dataset.calHour}` : ''}`);
    //: The chip rule (TIMELINE_PLAN decision 20, `timelineCalFit`): a cell shows as many
    //: one-line chips as its height holds, the last slot "+n more" when some are left.
    //: `slotsOver` counts cells showing more than that; `rowsMax` is the most visible.
    const slotsOf = (c) => {
      const cs = getComputedStyle(c);
      const head = c.querySelector(':scope > .timeline-cal-cellhead');
      const more = c.querySelector(':scope > .timeline-cal-more');
      if (!head || !more) return Infinity;
      const gap = parseFloat(cs.rowGap) || 0;
      const row = more.hidden ? parseFloat(getComputedStyle(more).getPropertyValue('--cal-row')) || 20 : more.offsetHeight;
      const room = c.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - head.offsetHeight - gap;
      return Math.max(0, Math.floor((room + gap) / (row + gap)));
    };
    const fitted = [...box.querySelectorAll('.timeline-cal-monthcell')].map((c) => ({
      visible: c.querySelectorAll(':scope > .timeline-cal-item:not([hidden])').length + (c.querySelector(':scope > .timeline-cal-more:not([hidden])') ? 1 : 0),
      slots: slotsOf(c),
    }));
    const rowsMax = Math.max(0, ...fitted.map((f) => f.visible));
    const slotsOver = fitted.filter((f) => f.visible > f.slots).length;
    const doc = document.documentElement;
    return {
      grid: month ? 'month' : week ? (week.classList.contains('is-day') ? 'day' : 'week') : (document.getElementById('timeline-feed').classList.contains('hidden') ? 'none' : 'agenda'),
      monthCells: box.querySelectorAll('.timeline-cal-monthcell').length,
      over: over.slice(0, 5), overCount: over.length, rowsMax, slotsOver,
      more: box.querySelectorAll('.timeline-cal-more').length,
      dots: box.querySelectorAll('.timeline-cal-dot').length,
      hscroll: doc.scrollWidth - doc.clientWidth,
      title: box.querySelector('.timeline-cal-title')?.textContent || '',
      count: document.getElementById('timeline-count').textContent,
    };
  });
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (await seed(page)) await page.reload({ waitUntil: 'domcontentloaded' }).then(() => page.waitForTimeout(4000));
  const out = {};

  // Step 1: the month, and the counts against the feed's.
  await openCalendar(page, 1440);
  out.month1440 = await measure(page);
  const calCounts = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.timeline-cal-monthcell')].filter((c) => +c.dataset.count).map((c) => [c.dataset.calDay, +c.dataset.count])));
  const days = await page.evaluate(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); });
  out.daysInMonth = days;
  await page.evaluate(() => { localStorage.setItem('timeline-view', 'feed'); syncTimelineViewSeg(); paintTimeline(); });
  await page.waitForTimeout(800);
  const feedCounts = await page.evaluate((keys) => Object.fromEntries(keys.map((k) => [k, document.querySelectorAll(`.timeline-bucket[data-bucket="${k}"] .timeline-row`).length])), Object.keys(calCounts));
  out.countsEqual = JSON.stringify(calCounts) === JSON.stringify(feedCounts);
  if (!out.countsEqual) out.counts = { calCounts, feedCounts };

  // Step 2: the right grid at each width, no horizontal scroll.
  for (const w of [1440, 1024, 768, 390]) {
    await openCalendar(page, w);
    if (w !== 1440) out[`w${w}`] = await measure(page);
    if (w === 1440) {
      await page.click('[data-cal-span="week"]');
      await page.waitForTimeout(600);
      out.week1440 = await measure(page);
      await page.click('[data-cal-span="day"]');
      await page.waitForTimeout(600);
      out.day1440 = await measure(page);
      await page.click('[data-cal-span="month"]');
      await page.waitForTimeout(600);
    }
  }

  // Step 3: drag a reminder a day on, read it back, undo.
  await openCalendar(page, 1440);
  const source = page.locator('.timeline-cal-item.is-reminder', { hasText: 'Dentist' }).first();
  const fromDay = await source.evaluate((el) => el.closest('[data-cal-day]').dataset.calDay);
  const toDay = await page.evaluate((k) => timelineDayShift(k, 1), fromDay);
  const before = await page.evaluate(async () => (await apiJson('/reminders')).find((r) => r.text === 'Dentist').due_at);
  if (await page.locator(`.timeline-cal-monthcell[data-cal-day="${toDay}"]`).count()) {
    await source.dragTo(page.locator(`.timeline-cal-monthcell[data-cal-day="${toDay}"]`));
    await page.waitForTimeout(1200);
    const after = await page.evaluate(async () => (await apiJson('/reminders')).find((r) => r.text === 'Dentist').due_at);
    const moved = await page.evaluate((k) => !!document.querySelector(`.timeline-cal-monthcell[data-cal-day="${k}"] .timeline-cal-item.is-reminder`), toDay);
    await page.click('#status-undo');
    await page.waitForTimeout(1200);
    const undone = await page.evaluate(async () => (await apiJson('/reminders')).find((r) => r.text === 'Dentist').due_at);
    out.drag = { fromDay, toDay, before, after, hoursMoved: (new Date(after) - new Date(before)) / 3600000, cellShowsIt: moved, undone, undoBack: undone === before };
    // The keyboard twin: Alt+ArrowRight on the row, then its undo.
    await page.waitForTimeout(600);
    await page.focus(`.timeline-cal-item.is-reminder[data-cal-key]:has-text("Dentist")`);
    await page.keyboard.press('Alt+ArrowRight');
    await page.waitForTimeout(1500);
    const keyed = await page.evaluate(async () => (await apiJson('/reminders')).find((r) => r.text === 'Dentist').due_at);
    const focusKept = await page.evaluate(() => document.activeElement?.textContent.includes('Dentist'));
    await page.click('#status-undo');
    await page.waitForTimeout(1200);
    const keyUndone = await page.evaluate(async () => (await apiJson('/reminders')).find((r) => r.text === 'Dentist').due_at);
    out.keyMove = { hoursMoved: (new Date(keyed) - new Date(before)) / 3600000, focusKept, undoBack: keyUndone === before };
  } else {
    out.drag = 'the next day is in the next month; run again tomorrow';
  }

  // Keys: arrows, Page Down, T, Enter.
  await openCalendar(page, 1440);
  await page.focus('.timeline-cal-monthcell[tabindex="0"]');
  const k0 = await page.evaluate(() => document.activeElement.dataset.calDay);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  const k1 = await page.evaluate(() => document.activeElement.dataset.calDay);
  await page.keyboard.press('PageDown');
  await page.waitForTimeout(900);
  const k2 = await page.evaluate(() => [document.activeElement.dataset.calDay, document.querySelector('.timeline-cal-title').textContent]);
  await page.keyboard.press('t');
  await page.waitForTimeout(900);
  const k3 = await page.evaluate(() => document.activeElement.dataset.calDay);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  //: Enter opens the day in the Day view (decision 20); Enter again, in the Day view, the feed.
  const k4 = await page.evaluate(() => [timelineCalSpan(), timelineCal.focus]);
  out.keys = { start: k0, afterRightDown: k1, pageDown: k2, today: k3, enter: k4 };
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
