// Adding on a day from the calendar (TIMELINE_PLAN section 12 row 6, INBOX 904 B72).
//   BASE=http://127.0.0.1:8873 [THEME=dark] node caladd.js
// Run after calendar.js has seeded the data dir. Measures, at 1358 and 390:
//   a double click on a later day opens the sheet on that day at 09:00, the
//   words "Dentist at 3pm" move the time to 15:00, Enter saves a reminder due
//   on the cell's day at 15:00, the cell shows it, Undo bins it;
//   one press still opens the Day view; N on the focused day opens the sheet;
//   a double click on the week's 14:00 opens it at 14:00, Event saves a meeting
//   note and a reminder linked to it, Undo bins both;
//   at 390 the head's Add opens the sheet inside the window, no horizontal scroll.
const { boot } = require('./lib');

const open = async (page, width, span) => {
  await page.setViewportSize({ width, height: 900 });
  await page.evaluate((s) => { localStorage.setItem('timeline-view', 'calendar'); localStorage.setItem('timeline-cal-span', s); }, span);
  await page.evaluate((s) => { switchTab('timeline'); if (typeof timelineCal !== 'undefined') { timelineCal.url = ''; timelineCal.span = s; } paintTimeline(); }, span);
  await page.waitForTimeout(1500);
};
const sheet = (page) => page.evaluate(() => {
  const card = document.querySelector('[data-sheet="calendar-add"] .sheet-card');
  if (!card) return null;
  const r = card.getBoundingClientRect();
  const tabs = [...card.querySelectorAll('[role="tab"]')].map((t) => [t.textContent, t.getAttribute('aria-selected'), t.tabIndex]);
  const inputs = [...card.querySelectorAll('input')].filter((i) => i.offsetParent).map((i) => Math.round(i.getBoundingClientRect().height));
  //: WCAG contrast of each visible text element against the first opaque
  //: background up the tree (contrast.js's rule, inline for the sheet).
  const rgb = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] === undefined || c[3] > 0.9)) return c; } return [255, 255, 255]; };
  const low = [];
  for (const el of card.querySelectorAll('button, label, span, p, h2, input')) {
    if (!el.offsetParent || el.type === 'checkbox' || !(el.value || el.textContent).trim()) continue;
    const a = lum(rgb(getComputedStyle(el).color)); const b = lum(bgOf(el));
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 4.5) low.push([el.tagName, (el.value || el.textContent).trim().slice(0, 20), ratio.toFixed(2)]);
  }
  return {
    label: card.closest('[data-sheet]').getAttribute('aria-label'),
    date: document.getElementById('timeline-cal-add-date').value,
    time: document.getElementById('timeline-cal-add-time').value,
    rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)],
    inWindow: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
    overflowX: card.scrollWidth - card.clientWidth,
    tabs, inputs, lowContrast: low,
    hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    focus: document.activeElement?.id || document.activeElement?.className,
  };
});
const reminders = (page, text) => page.evaluate(async (t) => (await apiJson('/reminders')).filter((r) => r.text === t), text);

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1358, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(3000);
  const out = { theme: process.env.THEME || 'light' };
  const key = await page.evaluate(() => timelineDayShift(timelineBucketKey(new Date(), 'day'), 4));
  out.key = key;

  // The month at 1358: a double click on a later day.
  await open(page, 1358, 'month');
  let cell = page.locator(`.timeline-cal-monthcell[data-cal-day="${key}"]`);
  if (!(await cell.count())) {
    await page.evaluate((k) => { timelineCal.focus = k; paintTimelineCalendar(); }, key);
    await page.waitForTimeout(1200);
    cell = page.locator(`.timeline-cal-monthcell[data-cal-day="${key}"]`);
  }
  const box = await cell.boundingBox();
  await page.mouse.dblclick(box.x + box.width - 6, box.y + box.height - 6);
  await page.waitForTimeout(500);
  out.dbl = await sheet(page);
  await page.keyboard.type('Dentist at 3pm');
  await page.waitForTimeout(900);
  out.typed = await sheet(page);
  out.chips = await page.evaluate(() => [...document.querySelectorAll('[data-sheet="calendar-add"] .qa-chip')].map((c) => c.textContent.trim()));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const saved = await reminders(page, 'Dentist');
  const made = saved.find((r) => r.due_at && new Date(r.due_at).getHours() === 15);
  out.saved = made ? { dueDay: await page.evaluate((d) => timelineBucketKey(new Date(d), 'day'), made.due_at), hour: new Date(made.due_at).getHours(), sheetClosed: !(await sheet(page)) } : saved;
  out.cellShows = await page.evaluate((k) => [...document.querySelectorAll(`.timeline-cal-monthcell[data-cal-day="${k}"] .timeline-cal-item.is-reminder`)].map((i) => i.textContent.trim()), key);
  await page.click('#status-undo');
  await page.waitForTimeout(1200);
  out.undone = (await reminders(page, 'Dentist')).filter((r) => new Date(r.due_at).getHours() === 15).length;

  // One press still opens the Day view (decision 20), after the double-click wait.
  await open(page, 1358, 'month');
  const b2 = await page.locator(`.timeline-cal-monthcell[data-cal-day="${key}"]`).boundingBox();
  await page.mouse.click(b2.x + b2.width - 6, b2.y + b2.height - 6);
  await page.waitForTimeout(150);
  const at150 = await page.evaluate(() => timelineCalSpan());
  await page.waitForTimeout(500);
  out.single = { at150, at650: await page.evaluate(() => [timelineCalSpan(), timelineCal.focus]), sheet: !!(await sheet(page)) };

  // N on the focused day.
  await open(page, 1358, 'month');
  await page.focus('.timeline-cal-monthcell[tabindex="0"]');
  const focused = await page.evaluate(() => document.activeElement.dataset.calDay);
  await page.keyboard.press('n');
  await page.waitForTimeout(500);
  out.n = { focused, sheet: await sheet(page) };
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // The week's 14:00, an event with its reminder.
  await open(page, 1358, 'week');
  await page.evaluate((k) => { timelineCal.focus = k; paintTimelineCalendar(); }, key);
  await page.waitForTimeout(1200);
  const hour = page.locator(`.timeline-cal-hourcell[data-cal-day="${key}"][data-cal-hour="14"]`);
  await hour.scrollIntoViewIfNeeded();
  const hb = await hour.boundingBox();
  await page.mouse.dblclick(hb.x + hb.width - 6, hb.y + hb.height - 4);
  await page.waitForTimeout(500);
  out.hour = await sheet(page);
  await page.click('[data-sheet="calendar-add"] [data-add-kind="event"]');
  await page.waitForTimeout(300);
  await page.keyboard.type('Lunch with Sam');
  await page.waitForTimeout(700);
  out.eventSheet = await sheet(page);
  await page.click('[data-sheet="calendar-add"] .space-dialog-actions .accent');
  await page.waitForTimeout(2000);
  out.event = await page.evaluate(async (k) => {
    const rs = (await apiJson('/reminders')).filter((r) => r.text === 'Lunch with Sam');
    const items = [...document.querySelectorAll(`[data-cal-day="${k}"] .timeline-cal-item`)].map((i) => i.textContent.trim()).filter((t) => /Lunch/.test(t));
    return { reminders: rs.map((r) => [r.entry_id, new Date(r.due_at).getHours()]), items };
  }, key);
  await page.click('#status-undo');
  await page.waitForTimeout(1500);
  out.eventUndone = await page.evaluate(async () => ({
    reminders: (await apiJson('/reminders')).filter((r) => r.text === 'Lunch with Sam').length,
    notes: (await apiJson('/entries?limit=200')).filter((e) => /Lunch with Sam/.test(e.content || e.preview || '')).length,
  }));

  // The phone: the agenda's head Add.
  await open(page, 390, 'month');
  const add = page.locator('#timeline-calendar [data-cal-act="add"]');
  out.phoneAdd = await add.evaluate((el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), visible: !!el.offsetParent }; });
  await add.click();
  await page.waitForTimeout(600);
  out.phone = await sheet(page);
  await page.keyboard.press('Escape');
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
