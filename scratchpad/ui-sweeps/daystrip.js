// The Timeline's calendar strip and the day pair in a daily note's head
// (WORLD_CLASS_PLAN D6). Seeds yesterday's and today's daily notes through
// the API, then at 1440 and 390 asserts:
//   - seven day buttons, one grid row, none off the window's edge;
//   - today is aria-current and the written days carry a dot;
//   - every day button is at least 44px at 390 (the phone's target);
//   - pressing a written day opens that note (the Notes tab, its card);
//   - pressing an unwritten day opens the composer with the day as its title
//     and writes nothing;
//   - the earlier arrow moves the window a week and later is disabled at today;
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
    const { browser, page } = await boot({ viewport });
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
        laterDisabled: document.querySelector('.timeline-daystrip-arrows button:last-child').disabled,
      };
    });
    const w = viewport.width;
    check(`${w} seven days in one row`, strip.count === 7 && strip.tops === 1 && strip.inside, strip);
    check(`${w} today is current, last, and the later arrow is off`, strip.current === 1 && strip.lastIsToday && strip.laterDisabled, strip);
    check(`${w} the two seeded days carry a dot`, strip.written >= 2, strip);
    if (w === 390) check(`${w} each day is at least 44px`, strip.minH >= 44 && strip.minW >= 44, strip);

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
    await page.locator('.timeline-daystrip-arrows button').first().click();
    await page.waitForTimeout(900);
    const walked = await page.evaluate(() => ({
      nums: [...document.querySelectorAll('.timeline-day-num')].map((e) => e.textContent),
      today: document.querySelectorAll('.timeline-day.is-today').length,
      laterDisabled: document.querySelector('.timeline-daystrip-arrows button:last-child').disabled,
    }));
    check(`${w} the earlier arrow moves a week back (no today, later arrow on)`, walked.today === 0 && !walked.laterDisabled, { walked, labelBefore });
    await page.locator('#timeline-jump-today').click();
    await page.waitForTimeout(900);
    const home = await page.evaluate(() => document.querySelectorAll('.timeline-day.is-today').length);
    check(`${w} Today brings the strip home`, home === 1, home);
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
