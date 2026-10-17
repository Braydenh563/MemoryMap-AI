// A future day written in a note, offered as a reminder that lands on the
// timeline and the calendar (INBOX 904 B72).
//   BASE=http://127.0.0.1:8873 [THEME=dark] node noteoffercal.js
// At 1358 and 390 measures: the offer chip under Capture (label, title, size);
// taking it: the notice's words and its "Show on calendar"; the button opens
// the calendar on the reminder's day with the reminder's chip in that cell;
// the reminder is a row on the feed above today; undo bins it; no hscroll.
const { boot } = require('./lib');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1358, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(3000);
  const out = { theme: process.env.THEME || 'light' };
  const words = ['Dinner with Sam on Friday at 7pm.', 'Pay the gas bill next Tuesday at 10am.'];
  for (const [i, width] of [1358, 390].entries()) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    await page.evaluate(() => switchTab('notes'));
    await page.waitForTimeout(800);
    await page.evaluate(() => [...document.querySelectorAll('#tab-notes button')].find((x) => x.textContent.trim() === 'Capture' && x.offsetParent)?.click());
    await page.waitForTimeout(600);
    await page.evaluate(() => { const b = document.getElementById('entry-content'); b.value = ''; b.dispatchEvent(new Event('input')); });
    //: The rich editor sits over the box; typing goes into it.
    const rich = await page.evaluate(() => !!document.getElementById('entry-content').closest('.note-composer, form')?.querySelector('.cm-content'));
    await page.click(rich ? '.note-composer .cm-content' : '#entry-content');
    await page.keyboard.type(words[i]);
    await page.waitForFunction(() => document.querySelector('.note-offer[data-kind="reminder"]')?.offsetParent, null, { timeout: 8000 }).catch(() => {});
    const chip = await page.evaluate(() => {
      const el = document.querySelector('.note-offer[data-kind="reminder"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { label: el.textContent.trim(), title: el.title, w: Math.round(r.width), h: Math.round(r.height), inside: r.right <= innerWidth + 0.5 };
    });
    const res = { chip };
    if (chip) {
      const before = await page.evaluate(async () => (await apiJson('/reminders?status=pending')).length ?? null).catch(() => null);
      await page.click('.note-offer[data-kind="reminder"]');
      await page.waitForTimeout(1200);
      res.toast = await page.evaluate(() => {
        const notes = [...document.querySelectorAll('.toast')].filter((n) => n.textContent.includes('Reminder set'));
        const n = notes[notes.length - 1];
        return n ? { text: n.querySelector('.toast-msg')?.textContent, buttons: [...n.querySelectorAll('button')].map((b) => b.textContent.trim()).filter(Boolean) } : null;
      });
      const due = await page.evaluate(async () => {
        const list = await apiJson('/reminders');
        const all = Array.isArray(list) ? list : list.reminders || list.items || [];
        const mine = all.filter((r) => /Dinner with Sam|Pay the gas bill/.test(r.text)).sort((a, b) => b.id - a.id)[0];
        return mine ? { id: mine.id, text: mine.text, due_at: mine.due_at, key: timelineBucketKey(new Date(mine.due_at), 'day') } : null;
      });
      res.saved = due;
      res.before = before;
      await page.evaluate(() => {
        const n = [...document.querySelectorAll('.toast')].filter((x) => x.textContent.includes('Reminder set')).pop();
        [...(n?.querySelectorAll('button') || [])].find((b) => b.textContent.trim() === 'Show on calendar')?.click();
      });
      await page.waitForTimeout(2500);
      res.calendar = await page.evaluate((key) => {
        const cal = document.getElementById('timeline-calendar');
        const cells = key && cal ? [...cal.querySelectorAll(`[data-cal-day="${key}"]`)] : [];
        const cell = cells[0];
        const chips = cells.flatMap((c) => [...c.querySelectorAll('*')]).filter((c) => !c.children.length).map((c) => c.textContent.trim()).filter((t) => /Dinner|gas bill/.test(t));
        //: Below 768 the calendar is its agenda: the feed's day sections for the month.
        const sec = document.querySelector(`#timeline-feed:not(.hidden) .timeline-bucket[data-bucket="${key}"]`);
        const box = document.getElementById('timeline-scroll');
        const agenda = sec ? {
          rows: [...sec.querySelectorAll('.timeline-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)).filter((t) => /Dinner|gas bill/.test(t)),
          fromTop: Math.round(sec.getBoundingClientRect().top - box.getBoundingClientRect().top),
          inView: sec.getBoundingClientRect().top < box.getBoundingClientRect().bottom && sec.getBoundingClientRect().bottom > box.getBoundingClientRect().top,
        } : null;
        return {
          agenda, span: typeof timelineCalSpan === 'function' ? timelineCalSpan() : null,
          tab: !document.getElementById('tab-timeline')?.classList.contains('hidden'),
          view: timelineViewMode(), shown: !!cal && cal.offsetParent !== null,
          focus: typeof timelineCal !== 'undefined' ? timelineCal.focus : null, only: typeof timelineCal !== 'undefined' ? timelineCal.only : 'x',
          cellFound: !!cell, chips,
          hscroll: document.documentElement.scrollWidth - innerWidth,
        };
      }, due?.key);
      // The reminder is on the feed too, above today.
      await page.evaluate(() => { localStorage.setItem('timeline-view', 'feed'); syncTimelineViewSeg(); });
      await page.evaluate(() => renderTimeline());
      await page.waitForTimeout(2500);
      res.feed = await page.evaluate((key) => {
        const sec = document.querySelector(`#timeline-feed .timeline-bucket[data-bucket="${key}"]`);
        const rows = sec ? [...sec.querySelectorAll('.timeline-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)) : [];
        const today = timelineBucketKey(new Date(), 'day');
        return { found: !!sec, aboveToday: key > today, rows: rows.filter((t) => /Dinner|gas bill/.test(t)) };
      }, due?.key);
      if (due) {
        await page.evaluate(() => performUndo());
        await page.waitForTimeout(800);
        res.afterUndo = await page.evaluate(async (id) => {
          const list = await apiJson('/reminders');
          const all = Array.isArray(list) ? list : list.reminders || list.items || [];
          return all.some((r) => r.id === id);
        }, due.id);
      }
    }
    out[width] = res;
  }
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
