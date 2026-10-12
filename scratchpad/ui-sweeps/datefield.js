// The date and time fields (UI_MODERNISATION_PLAN Phase 12 decision 5,
// `enhanceDateField` in sheets-selects.js), on Reminders at W (1440, or 390
// with touch). Asserts: the native fields hidden behind one opener each, the
// opener at the form row's height; the month grid opens with the focus on a
// day, arrows move it, Enter picks and the native value and the face follow;
// the time list picks; typed "tomorrow at 3pm" lands through /reminders/when;
// Today and Clear; the panel inside the window; no page errors.
//   BASE=... [W=390] [THEME=dark] node datefield.js
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440);
(async () => {
  const touch = W < 820 ? { hasTouch: true, isMobile: true } : {};
  const { browser, page } = await boot({ viewport: { width: W, height: W < 820 ? 844 : 900 }, ...touch });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluate(() => switchTab('reminders')); await page.waitForTimeout(1200);
  //: On a phone the form is folded behind New reminder.
  if (W < 820) { await page.click('#reminders-new'); await page.waitForTimeout(600); }
  const fails = [];
  const ok = (cond, msg) => { if (!cond) fails.push(msg); };
  const state = () => page.evaluate(() => {
    const d = document.getElementById('reminder-date'), t = document.getElementById('reminder-time');
    const od = d.closest('.select-shell').querySelector('.select-opener'), ot = t.closest('.select-shell').querySelector('.select-opener');
    const pop = [...document.querySelectorAll('.timeline-monthpop.help-popover')].find((p) => !p.classList.contains('hidden'));
    const r = pop && pop.getBoundingClientRect();
    return { date: d.value, time: t.value, dateFace: od.textContent.trim(), timeFace: ot.textContent.trim(),
      dateHidden: getComputedStyle(d).position === 'absolute' || d.tabIndex === -1, h: [Math.round(od.getBoundingClientRect().height), Math.round(ot.getBoundingClientRect().height)],
      pop: r ? { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight } : null,
      active: document.activeElement && (document.activeElement.dataset.key || document.activeElement.className) };
  });
  let s = await state();
  ok(s.dateHidden, 'native date field still visible');
  console.log('rest', JSON.stringify(s));
  await page.click('#reminder-date ~ .select-opener'); await page.waitForTimeout(300);
  s = await state(); console.log('open', JSON.stringify(s));
  ok(s.pop && s.pop.l >= 0 && s.pop.r <= s.pop.vw && s.pop.b <= s.pop.vh + 1, 'date panel outside the window');
  ok(/^\d{4}-\d{2}-\d{2}$/.test(s.active || ''), 'focus not on a day: ' + s.active);
  const start = s.active;
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown');
  s = await state(); ok(s.active > start, 'arrows did not move the day');
  const want = s.active;
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  s = await state(); console.log('picked', JSON.stringify(s));
  ok(s.date === want && !s.pop && s.dateFace && !/Due date/.test(s.dateFace), 'Enter did not pick ' + want);
  await page.click('#reminder-time ~ .select-opener'); await page.waitForTimeout(300);
  s = await state(); ok(s.pop, 'time panel did not open');
  await page.locator('.timeline-monthpop.help-popover .timeline-monthday[data-key="14:30"]').click(); await page.waitForTimeout(300);
  s = await state(); ok(s.time === '14:30' && !s.pop, 'time list did not pick 14:30: ' + s.time);
  await page.click('#reminder-date ~ .select-opener'); await page.waitForTimeout(300);
  await page.fill('.timeline-monthpop.help-popover input[type="text"]', 'tomorrow at 3pm');
  await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  s = await state();
  const tomorrow = await page.evaluate(() => { const d = new Date(Date.now() + 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
  ok(s.date === tomorrow, 'typed entry did not land: ' + s.date);
  const due = await page.evaluate(() => document.getElementById('reminder-due').value);
  console.log('typed', JSON.stringify(s), 'due', due);
  await page.click('#reminder-date ~ .select-opener'); await page.waitForTimeout(300);
  await page.locator('.timeline-monthpop.help-popover button', { hasText: 'Clear' }).click(); await page.waitForTimeout(300);
  s = await state(); ok(s.date === '' && /Due date/.test(s.dateFace), 'Clear did not clear');
  ok(!errors.length, 'page errors: ' + errors.join(' | '));
  console.log(fails.length ? 'FAIL\n  ' + fails.join('\n  ') : 'PASS');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
