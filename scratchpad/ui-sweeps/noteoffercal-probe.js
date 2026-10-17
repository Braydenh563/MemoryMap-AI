// Probe: the calendar's shape at 390 after timelineCalendarOn (B72 step 3).
const { boot } = require('./lib');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 200)); });
  await page.waitForTimeout(3000);
  const fn = process.env.FN || 'timelineCalendarOn';
  await page.evaluate((f) => { switchTab('timeline'); timelineCalendarCall(f, '2026-10-20'); }, fn);
  await page.waitForTimeout(Number(process.env.WAIT || 2500));
  if (process.env.REPAINT) { await page.evaluate(() => paintTimelineCalendar()); await page.waitForTimeout(800); }
  console.log(JSON.stringify(await page.evaluate(() => {
    const cal = document.getElementById('timeline-calendar');
    const days = [...cal.querySelectorAll('[data-cal-day]')].map((c) => c.dataset.calDay);
    const focused = document.activeElement;
    return {
      span: timelineCal.span, focus: timelineCal.focus, days: days.slice(0, 12), n: days.length,
      classes: [...new Set([...cal.querySelectorAll('[class]')].map((c) => c.className.split(' ')[0]))].slice(0, 30),
      active: focused?.className, activeDay: focused?.dataset?.calDay,
      text: cal.textContent.replace(/\s+/g, ' ').slice(0, 300),
      html: cal.innerHTML.slice(0, 600),
      empty: document.getElementById('timeline-empty')?.textContent.trim().slice(0, 200),
      anywhere: document.querySelectorAll('[data-cal-day]').length,
      calKids: [...cal.children].map((c) => c.className),
      calRect: (() => { const r = cal.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
      url: timelineCal.url, renders: timelineCal.renders, rows: timelineCal.rows?.length,
    };
  }), null, 1));
  console.log(JSON.stringify(errs));
  await browser.close();
})();
