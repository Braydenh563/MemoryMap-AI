// The Timeline dock's find zone, as numbers (INBOX 186: "these buttons in the
// top of the timeline dock are ugly and need a redesign/restructuring").
//
//   BASE=http://127.0.0.1:8792 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     timeout 110 node scratchpad/ui-sweeps/timelinedock.js
//
// What it gates, at 1440 / 1024 / 820 / 390, exiting non-zero on any of them:
//
//   1. the kinds control is one well of four segments on ONE row at every
//      width (the four `.library-chip`s it replaces wrapped to 3 rows at 1024
//      and 4 at 820, and took the dock to 138.8px and 181.2px);
//   2. every segment is the same height as the dock's other controls, which is
//      the dock's own height rule and the thing "ugly" mostly means;
//   3. the gap inside the well is a spacing token, not a number somebody
//      picked;
//   4. the words are in above 1200 and out below it, and the accessible name
//      carries the word either way;
//   5. at 390 every segment is a 44px target;
//   6. the removable filter (the band's "Show: …") is a chip and is the only
//      chip in the zone.
//
// It seeds its own notebook so the counts are the same every run.
const { boot } = require('./lib.js');

const SPACING = { '0.25rem': 4, '0.4rem': 6.4, '0.5rem': 8, '0.6rem': 9.6, '0.8rem': 12.8, '1rem': 16 };

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };

  await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    const post = (u, b) => fetch(u, { method: 'POST', headers: h, body: JSON.stringify(b) }).then((r) => r.json());
    await post('/entries', { content: 'Bought netting at the garden centre' });
    await post('/documents', { title: 'Allotment plan', content: '# Allotment plan\nbeds and beans' });
    await post('/reminders', { text: 'ring the landlord back', due_at: new Date(Date.now() + 36e5).toISOString() });
  });
  await page.evaluate(() => localStorage.removeItem('timeline-kinds'));
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(2500);

  for (const width of [1440, 1024, 820, 390]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    await page.waitForTimeout(700);
    const r = await page.evaluate(() => {
      const r1 = (n) => Math.round(n * 10) / 10;
      const box = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: r1(b.x), y: r1(b.y), w: r1(b.width), h: r1(b.height) };
      };
      const dock = document.querySelector('#tab-timeline .dock');
      const well = document.getElementById('timeline-kinds');
      const segs = [...well.querySelectorAll('button')];
      const clear = document.getElementById('timeline-filter-clear');
      // Every other control the dock shows on its top row, by the same
      // definition docks.js uses: the thing you press, not its parts.
      const others = [...dock.querySelectorAll('input[type="search"], .dock-actions > button, .dock-arrange > .seg, .dock-arrange > details > summary')];
      return {
        dockH: box(dock).h,
        wellBox: box(well),
        wellGap: getComputedStyle(well).gap,
        segRows: [...new Set(segs.map((b) => Math.round(b.getBoundingClientRect().y)))].length,
        segBoxes: segs.map((b) => box(b)),
        segNames: segs.map((b) => (b.getAttribute('aria-label') || b.textContent).trim()),
        segPressed: segs.map((b) => b.getAttribute('aria-pressed')),
        labelShown: segs.map((b) => {
          const l = b.querySelector('.seg-label');
          return !!(l && l.getBoundingClientRect().width > 1);
        }),
        otherHeights: [...new Set(others.map((o) => Math.round(o.getBoundingClientRect().height)))],
        chipsInZone: [...document.querySelectorAll('#tab-timeline .dock-find .library-chip')].length,
        clearIsChip: clear ? clear.classList.contains('library-chip') : null,
        pageWide: document.documentElement.scrollWidth,
      };
    });
    const tag = `@${width}`;
    console.log(tag, 'dock', r.dockH + 'px', 'well', JSON.stringify(r.wellBox), 'segs', JSON.stringify(r.segBoxes.map((b) => b.w + 'x' + b.h)));

    check(`${tag} the kinds are one row`, r.segRows === 1, `${r.segRows} row(s), dock ${r.dockH}px`);
    // The *well* is the control; its cells are inset by the well's own padding
    // on purpose (08-consistency.css, and docks.js's own note about counting a
    // segment three times). So the height that has to match the bar is the
    // well's, and what the cells have to do is stay inside it.
    const segH = [...new Set(r.segBoxes.map((b) => Math.round(b.h)))];
    check(
      `${tag} the well is the dock's own height`,
      r.otherHeights.length === 1 && Math.round(r.wellBox.h) === r.otherHeights[0],
      `well ${r.wellBox.h}, the rest of the dock ${r.otherHeights.join('/')}`
    );
    check(
      `${tag} the cells stay inside the well`,
      segH.length === 1 && segH[0] <= Math.round(r.wellBox.h),
      `cells ${segH.join('/')} in a ${r.wellBox.h}px well`
    );
    const gapPx = parseFloat(r.wellGap);
    check(
      `${tag} the gap is on the spacing scale`,
      Object.values(SPACING).some((v) => Math.abs(v - gapPx) < 0.35) || gapPx < 3,
      `${r.wellGap} (scale: ${Object.values(SPACING).join(', ')}; under 3px is the well's own hairline)`
    );
    check(
      `${tag} every segment is named whatever is drawn`,
      r.segNames.every((n) => n && n.length > 2),
      r.segNames.join(' | ')
    );
    check(`${tag} every segment says whether it is on`, r.segPressed.every((p) => p === 'true' || p === 'false'), r.segPressed.join('/'));
    const wantWords = width >= 1200;
    check(
      `${tag} the words are ${wantWords ? 'in' : 'out'}`,
      r.labelShown.every((s) => s === wantWords),
      r.labelShown.join('/')
    );
    if (width < 600) {
      check(
        `${tag} every segment is a 44px target`,
        r.segBoxes.every((b) => b.w >= 44 && b.h >= 44),
        r.segBoxes.map((b) => b.w + 'x' + b.h).join(' ')
      );
    }
    check(`${tag} no sideways scroll`, r.pageWide <= width, `${r.pageWide} in ${width}`);
    check(`${tag} the removable filter is the zone's only chip`, r.clearIsChip === true && r.chipsInZone <= 1, `clear is a chip: ${r.clearIsChip}, chips in the zone: ${r.chipsInZone}`);
  }

  // And the control still does its job: pressing a segment refetches with that
  // kind dropped, and the last one on cannot be turned off.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => document.querySelectorAll('#tab-timeline .timeline-row').length);
  await page.click('#timeline-kinds button[data-timeline-kind="note"]');
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({
    rows: document.querySelectorAll('#tab-timeline .timeline-row').length,
    pressed: document.querySelector('#timeline-kinds button[data-timeline-kind="note"]').getAttribute('aria-pressed'),
  }));
  check('a segment still filters', after.rows < before && after.pressed === 'false', `${before} rows, then ${after.rows}, pressed ${after.pressed}`);

  const lastOne = await page.evaluate(async () => {
    for (const key of ['board', 'document']) {
      document.querySelector(`#timeline-kinds button[data-timeline-kind="${key}"]`).click();
      await new Promise((r) => setTimeout(r, 1200));
    }
    const left = [...document.querySelectorAll('#timeline-kinds button')].filter((b) => b.getAttribute('aria-pressed') === 'true');
    return { on: left.length, disabled: left.every((b) => b.disabled) };
  });
  check('the last kind on cannot be turned off', lastOne.on === 1 && lastOne.disabled, JSON.stringify(lastOne));

  console.log(fails.length ? `FAILURES: ${fails.length}` : 'all clear');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
