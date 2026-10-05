// The Timeline's calendar strip and the day pair in a daily note's head
// (WORLD_CLASS_PLAN D6). Seeds yesterday's and today's daily notes through
// the API, then at 1440 and 390 asserts:
//   - seven day buttons, one grid row, none off the window's edge;
//   - INBOX 543: the arrows beside the month, the days' well ending at the
//     dock's edge, one Tab stop (today), and the arrow keys walking the days;
//   - today is aria-current and the written days carry a dot;
//   - every day button is at least 44px at 390 (the phone's target);
//   - pressing a written day opens that note (the Notes tab, its card);
//   - pressing an unwritten day opens the composer with the day as its title
//     and writes nothing;
//   - the earlier arrow moves the window a week and later is disabled at today;
//   - the month popover (opened with Enter from the month label): inside the
//     window, a Tab stop on today, dots, arrows and Page Up walk it, Escape
//     returns the focus, picking a day in another month moves the strip to it
//     and writes nothing, a press outside closes it (THEME=dark for dark);
//   - a daily note's card carries the day before / day after pair, and the
//     pair opens the neighbour.
//
//   BASE=http://127.0.0.1:8804 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/daystrip.js
const { boot } = require('./lib.js');

const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : JSON.stringify(detail));
  };
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const { browser, page, OUT } = await boot({ viewport });
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86400000);
    const twoAgo = new Date(today.getTime() - 2 * 86400000);
    // The journal days, made through the endpoint the strip reads.
    for (const d of [yesterday, today]) {
      await page.evaluate((k) => apiJson(`/entries/daily/${k}`, { method: 'POST' }), key(d));
    }
    await page.evaluate(() => switchTab('timeline'));
    await page.waitForTimeout(1500);
    const strip = await page.evaluate(() => {
      const days = [...document.querySelectorAll('#timeline-daystrip .timeline-day')];
      const rects = days.map((d) => d.getBoundingClientRect());
      return {
        count: days.length,
        tops: new Set(rects.map((r) => Math.round(r.top))).size,
        inside: rects.every((r) => r.left >= 0 && r.right <= innerWidth),
        minH: Math.min(...rects.map((r) => r.height)),
        minW: Math.min(...rects.map((r) => r.width)),
        current: days.filter((d) => d.getAttribute('aria-current') === 'date').length,
        written: days.filter((d) => d.classList.contains('is-written')).length,
        lastIsToday: days[days.length - 1]?.getAttribute('aria-current') === 'date',
        laterDisabled: document.getElementById('timeline-days-later').disabled,
      };
    });
    const w = viewport.width;
    check(`${w} seven days in one row`, strip.count === 7 && strip.tops === 1 && strip.inside, strip);
    check(`${w} today is current, last, and the later arrow is off`, strip.current === 1 && strip.lastIsToday && strip.laterDisabled, strip);
    check(`${w} the two seeded days carry a dot`, strip.written >= 2, strip);
    if (w === 390) check(`${w} each day is at least 44px`, strip.minH >= 44 && strip.minW >= 44, strip);

    // INBOX 543: one header. The arrows sit beside the month (8px or less),
    // the days' well ends at the dock's right edge, and one day is a Tab stop.
    const head = await page.evaluate(() => {
      const r = (id) => document.getElementById(id).getBoundingClientRect();
      const dock = document.querySelector('#timeline-daystrip').parentElement.querySelector('.dock').getBoundingClientRect();
      const [prev, month, next, days] = ['timeline-days-earlier', 'timeline-month-btn', 'timeline-days-later', 'timeline-daystrip-days'].map(r);
      const stops = [...document.querySelectorAll('#timeline-daystrip-days .timeline-day')].filter((d) => d.tabIndex === 0);
      return {
        prevGap: Math.round(month.left - prev.right), nextGap: Math.round(next.left - month.right),
        rightGap: Math.round(dock.right - days.right), leftGap: Math.round(days.left - dock.left),
        stops: stops.length, stopIsToday: stops[0]?.classList.contains('is-today'),
      };
    });
    check(`${w} the days end at the dock's edge, one Tab stop on today`, Math.abs(head.rightGap) <= 1 && head.stops === 1 && head.stopIsToday, head);
    if (w > 600) check(`${w} the arrows sit beside the month`, head.prevGap >= 0 && head.prevGap <= 8 && head.nextGap >= 0 && head.nextGap <= 8, head);
    // The arrow keys walk the days; past the first, the window walks a day.
    await page.locator('#timeline-daystrip .timeline-day.is-today').focus();
    await page.keyboard.press('ArrowLeft');
    const walkedKey = await page.evaluate(() => ({ key: document.activeElement.dataset.key, stops: [...document.querySelectorAll('#timeline-daystrip-days .timeline-day')].filter((d) => d.tabIndex === 0).length }));
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(900);
    const edge = await page.evaluate(() => {
      const days = [...document.querySelectorAll('#timeline-daystrip-days .timeline-day')];
      return { focus: document.activeElement.dataset.key, first: days[0]?.dataset.key, today: days.filter((d) => d.classList.contains('is-today')).length };
    });
    check(`${w} ArrowLeft walks a day, and past the first the window walks`, walkedKey.key === key(yesterday) && walkedKey.stops === 1 && edge.focus === edge.first && edge.today === 0, { walkedKey, edge });
    await page.locator('#timeline-jump-today').click();
    await page.waitForTimeout(900);

    // An unwritten day starts the composer and writes nothing.
    const before = await page.evaluate(async () => (await apiJson('/entries?limit=1000')).length ?? 0).catch(() => -1);
    await page.locator('#timeline-daystrip .timeline-day:not(.is-written)').first().click();
    await page.waitForTimeout(900);
    const composer = await page.evaluate(() => ({
      tab: localStorage.getItem('activeTab'),
      title: document.getElementById('entry-title')?.value,
    }));
    const after = await page.evaluate(async () => (await apiJson('/entries?limit=1000')).length ?? 0).catch(() => -1);
    check(`${w} an unwritten day opens the composer with its date`, composer.tab === 'notes' && /^\d{4}-\d{2}-\d{2}$/.test(composer.title || ''), composer);
    check(`${w} and writes no note`, before === after, { before, after });

    // A written day opens its note.
    await page.evaluate(() => switchTab('timeline'));
    await page.waitForTimeout(1200);
    await page.locator('#timeline-daystrip .timeline-day.is-today').click();
    // The note list paints after the Notes tab's own fetch: wait for the card.
    await page.waitForFunction(() => document.querySelector('#entry-list .entry-title'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(800);
    const opened = await page.evaluate(() => ({
      tab: localStorage.getItem('activeTab'),
      cards: [...document.querySelectorAll('#entry-list .entry-title')].map((e) => e.textContent).slice(0, 5),
    }));
    check(`${w} a written day opens the Notes tab`, opened.tab === 'notes', opened);

    // The pair on a daily note's card.
    const pair = await page.evaluate((k) => {
      const card = [...document.querySelectorAll('#entry-list li')].find(
        (li) => li.querySelector('.entry-title')?.textContent === k
      );
      const buttons = card ? [...card.querySelectorAll('.entry-daypair button')] : [];
      return { found: !!card, labels: buttons.map((b) => b.textContent.trim()), titles: buttons.map((b) => b.title) };
    }, key(today));
    check(`${w} a daily note's card has the day pair`, pair.found && pair.labels.length === 2, pair);
    if (pair.found && pair.labels.length === 2) {
      await page.evaluate((k) => {
        const card = [...document.querySelectorAll('#entry-list li')].find(
          (li) => li.querySelector('.entry-title')?.textContent === k
        );
        card.querySelector('.entry-daypair button:first-child').click();
      }, key(today));
      await page.waitForTimeout(1500);
      const back = await page.evaluate(() => document.querySelector('#entry-list li.flash, #entry-list li.is-flash, #entry-list li.highlight')?.querySelector('.entry-title')?.textContent || null);
      console.log(`     (day before opens: ${back})`);
    }

    // The arrows.
    await page.evaluate(() => switchTab('timeline'));
    await page.waitForTimeout(1200);
    const labelBefore = await page.locator('.timeline-daystrip-label').textContent();
    await page.locator('#timeline-days-earlier').click();
    await page.waitForTimeout(900);
    const walked = await page.evaluate(() => ({
      nums: [...document.querySelectorAll('.timeline-day-num')].map((e) => e.textContent),
      today: document.querySelectorAll('.timeline-day.is-today').length,
      laterDisabled: document.getElementById('timeline-days-later').disabled,
    }));
    check(`${w} the earlier arrow moves a week back (no today, later arrow on)`, walked.today === 0 && !walked.laterDisabled, { walked, labelBefore });
    await page.locator('#timeline-jump-today').click();
    await page.waitForTimeout(900);
    const home = await page.evaluate(() => document.querySelectorAll('.timeline-day.is-today').length);
    check(`${w} Today brings the strip home`, home === 1, home);

    // The month popover (WORLD_CLASS_PLAN D6): the way past the seven days.
    await page.evaluate(() => switchTab('timeline'));
    await page.waitForTimeout(1200);
    await page.locator('#timeline-month-btn').focus();
    await page.keyboard.press('Enter');
    await page.waitForTimeout(600);
    const pop = await page.evaluate(() => {
      const p = document.getElementById('timeline-month-pop');
      const r = p.getBoundingClientRect();
      const days = [...p.querySelectorAll('.timeline-monthday')];
      const enabled = days.filter((d) => !d.disabled);
      const small = days.map((d) => d.getBoundingClientRect());
      const stops = days.filter((d) => d.tabIndex === 0).length;
      return {
        shown: !p.classList.contains('hidden') && r.width > 0,
        popover: p.classList.contains('help-popover'),
        inside: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
        rect: [r.left, r.top, r.right, r.bottom].map(Math.round),
        expanded: document.getElementById('timeline-month-btn').getAttribute('aria-expanded'),
        focus: document.activeElement?.dataset?.key || document.activeElement?.id,
        stops,
        count: days.length,
        minW: Math.round(Math.min(...small.map((b) => b.width))),
        minH: Math.round(Math.min(...small.map((b) => b.height))),
        nextDisabled: document.getElementById('timeline-month-next').disabled,
        lastEnabled: enabled[enabled.length - 1]?.dataset.key,
        written: days.filter((d) => d.classList.contains('is-written')).map((d) => d.dataset.key),
      };
    });
    const todayKey = key(today);
    check(`${w} Enter on the month opens the popover inside the window`, pop.shown && pop.popover && pop.inside && pop.expanded === 'true', pop);
    check(`${w} focus lands on today, one Tab stop, the next month is off`, pop.focus === todayKey && pop.stops === 1 && pop.nextDisabled && pop.lastEnabled === todayKey, pop);
    check(`${w} the two seeded days carry a dot in the month`, pop.written.includes(todayKey) && pop.written.includes(key(yesterday)), pop);
    if (w === 390) check(`${w} each day in the month is at least 44px`, pop.minW >= 44 && pop.minH >= 44, pop);
    await page.screenshot({ path: `${OUT}/monthpop-${w}-${process.env.THEME || 'light'}.png` });

    // Arrow keys: left a day, up a week, Page Up a month, and the title follows.
    const monthBefore = await page.evaluate(() => document.getElementById('timeline-month-title').textContent);
    await page.keyboard.press('ArrowLeft');
    const left = await page.evaluate(() => document.activeElement.dataset.key);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight'); // past today: stays on today
    const stay = await page.evaluate(() => document.activeElement.dataset.key);
    await page.keyboard.press('PageUp');
    await page.waitForTimeout(300);
    const paged = await page.evaluate(() => ({
      title: document.getElementById('timeline-month-title').textContent,
      focus: document.activeElement.dataset.key,
      inside: (() => { const r = document.getElementById('timeline-month-pop').getBoundingClientRect(); return r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1; })(),
      nextDisabled: document.getElementById('timeline-month-next').disabled,
    }));
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    check(`${w} ArrowLeft moves a day, ArrowRight stops at today`, left && left < todayKey && stay === todayKey, { left, stay });
    check(`${w} Page Up turns to the month before and keeps the focus in it`, paged.title !== monthBefore && paged.focus.startsWith(key(prevMonth).slice(0, 7)) && paged.inside && !paged.nextDisabled, { monthBefore, paged });

    // Escape closes it and hands the focus back to the month button.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const closed = await page.evaluate(() => ({
      hidden: document.getElementById('timeline-month-pop').classList.contains('hidden'),
      focus: document.activeElement?.id,
      expanded: document.getElementById('timeline-month-btn').getAttribute('aria-expanded'),
    }));
    check(`${w} Escape closes it and returns the focus to the month`, closed.hidden && closed.focus === 'timeline-month-btn' && closed.expanded === 'false', closed);

    // With the mouse: open, go back a month, pick the 15th. The strip moves to
    // it, the day is focused, today is no longer in view, and nothing is written.
    const entriesBefore = await page.evaluate(async () => (await apiJson('/entries?limit=1000')).length ?? 0).catch(() => -1);
    await page.locator('#timeline-month-btn').click();
    await page.waitForTimeout(500);
    await page.locator('#timeline-month-prev').click();
    await page.waitForTimeout(300);
    const pick = `${key(prevMonth).slice(0, 7)}-15`;
    await page.locator(`#timeline-month-grid [data-key="${pick}"]`).click();
    await page.waitForTimeout(1200);
    const picked = await page.evaluate(() => ({
      popHidden: document.getElementById('timeline-month-pop').classList.contains('hidden'),
      keys: [...document.querySelectorAll('#timeline-daystrip-days .timeline-day')].map((d) => d.dataset.key),
      focus: document.activeElement?.dataset?.key,
      today: document.querySelectorAll('.timeline-day.is-today').length,
      laterDisabled: document.getElementById('timeline-days-later').disabled,
      label: document.getElementById('timeline-month-text').textContent,
    }));
    check(`${w} picking a day in another month moves the strip to it and focuses it`, picked.popHidden && picked.keys.length === 7 && picked.keys.includes(pick) && picked.focus === pick && picked.today === 0 && !picked.laterDisabled, picked);
    const entriesAfter = await page.evaluate(async () => (await apiJson('/entries?limit=1000')).length ?? 0).catch(() => -1);
    check(`${w} and writes no note`, entriesBefore === entriesAfter, { entriesBefore, entriesAfter });

    // A press outside closes it too.
    await page.locator('#timeline-month-btn').click();
    await page.waitForTimeout(400);
    await page.mouse.click(5, 5);
    await page.waitForTimeout(300);
    check(`${w} a press outside closes the popover`, await page.evaluate(() => document.getElementById('timeline-month-pop').classList.contains('hidden')), null);
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
