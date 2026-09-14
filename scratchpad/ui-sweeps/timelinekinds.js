// TIMELINE_PLAN.md Phase 4's gate, as numbers: "documents, boards, reminders
// and daily notes as rows with their own kind markers; the `kind=` filter
// chips in the dock; the daily-note row gets a 'Today' action when the day has
// none".
//
//   BASE=http://127.0.0.1:8971 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     timeout 110 node scratchpad/ui-sweeps/timelinekinds.js
//
// It seeds its own notebook (a note, a board, a document and a reminder) so
// the counts are exact rather than whatever the data dir happens to hold, and
// exits non-zero on any gate line.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const seeded = await page.evaluate(async () => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    const post = async (url, body) =>
      (await fetch(url, { method: 'POST', headers: h, body: JSON.stringify(body) })).json();
    const note = await post('/entries', { content: 'Bought netting at the garden centre' });
    const document = await post('/documents', { title: 'Allotment plan', content: '# Allotment plan\nbeds and beans' });
    const due = new Date(Date.now() + 36e5).toISOString();
    const reminder = await post('/reminders', { text: 'ring the landlord back', due_at: due });
    return { note: note.id, document: document.id, reminder: reminder.id };
  });

  // The kind filter is stored per browser, so a previous run must not decide
  // this one.
  await page.evaluate(() => localStorage.removeItem('timeline-kinds'));
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(2500);

  // --- gate 1: four kinds of row, each with its own marker -------------------
  const rows = await page.evaluate(() => {
    const seen = [...document.querySelectorAll('#timeline-feed .timeline-row')].map((li) => ({
      kind: li.dataset.kind,
      key: li.dataset.key,
      glyph: (li.querySelector('.timeline-row-mark i') || {}).className || '',
      title: (li.querySelector('.timeline-row-title') || {}).textContent || '',
    }));
    return seen;
  });
  const kinds = [...new Set(rows.map((r) => r.kind))].sort();
  check('1 kinds: a note, a document and a reminder are all rows',
    ['document', 'note', 'reminder'].every((k) => kinds.includes(k)),
    `${rows.length} row(s), kinds ${kinds.join(', ')}`);
  // A note's glyph varies with its placement (written, mentioned, or the day's
  // journal note), which is the point of it, so this asserts that no glyph is
  // shared between two kinds rather than that each kind has exactly one.
  const byKind = {};
  for (const row of rows) (byKind[row.kind] = byKind[row.kind] || new Set()).add(row.glyph);
  const shared = Object.entries(byKind).filter(([kind, set]) =>
    Object.entries(byKind).some(([other, theirs]) =>
      other !== kind && [...set].some((g) => theirs.has(g))
    )
  );
  check('1 kinds: no two kinds wear the same marker',
    shared.length === 0 && (byKind.document || new Set()).has('ph ph-file-text') &&
      (byKind.reminder || new Set()).has('ph ph-bell'),
    Object.entries(byKind).map(([k, set]) => `${k}: ${[...set].join(', ')}`).join(' · '));
  check('1 kinds: a row is identified across kinds, not by a bare id',
    rows.every((r) => r.key && r.key.startsWith(r.kind + ':')) &&
      new Set(rows.map((r) => r.key)).size === rows.length,
    `${new Set(rows.map((r) => r.key)).size} distinct key(s) of ${rows.length} row(s)`);

  // --- gate 2: the daily note's Today action ---------------------------------
  // By its label, not by position: a note that mentions a future date is
  // plotted there, so the feed's first bucket can legitimately be tomorrow.
  await page.evaluate(() => {
    window.__todayHead = () =>
      [...document.querySelectorAll('#timeline-feed .timeline-bucket-head')].find(
        (h) => h.querySelector('.timeline-bucket-label').textContent === 'Today'
      );
  });
  const todayAction = await page.evaluate(() => {
    const head = window.__todayHead();
    const button = head && head.querySelector('button');
    return {
      label: head ? head.querySelector('.timeline-bucket-label').textContent : '',
      button: button ? button.textContent.trim() : '',
    };
  });
  check('2 today: the newest day is today and offers the journal note',
    todayAction.label === 'Today' && /Start today/.test(todayAction.button),
    `header "${todayAction.label}", action "${todayAction.button}"`);

  const madeDaily = await page.evaluate(() => {
    const button = window.__todayHead() && window.__todayHead().querySelector('button');
    if (!button) return false;
    button.click();
    return true;
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(2000);
  const afterDaily = await page.evaluate(() => {
    const head = [...document.querySelectorAll('#timeline-feed .timeline-bucket-head')].find(
      (h) => h.querySelector('.timeline-bucket-label').textContent === 'Today'
    );
    const iso = new Date();
    const key = `${iso.getFullYear()}-${String(iso.getMonth() + 1).padStart(2, '0')}-${String(iso.getDate()).padStart(2, '0')}`;
    const titles = [...document.querySelectorAll('#timeline-feed .timeline-row-title')].map((t) => t.textContent);
    return {
      button: head ? (head.querySelector('button') || {}).textContent || '' : '',
      hasDaily: titles.includes(key),
      marker: (() => {
        const row = [...document.querySelectorAll('#timeline-feed .timeline-row[data-kind="note"]')].find(
          (li) => li.querySelector('.timeline-row-title').textContent === key
        );
        return row ? row.querySelector('.timeline-row-mark i').className : '';
      })(),
    };
  });
  check('2 today: once the day has one, the action opens it rather than making a second',
    madeDaily && afterDaily.hasDaily && /Today's note/.test(afterDaily.button),
    `daily row present=${afterDaily.hasDaily}, action "${afterDaily.button.trim()}"`);
  check('2 today: the journal note wears the calendar marker',
    /calendar-dot/.test(afterDaily.marker), afterDaily.marker);

  // --- gate 3: the kind filter in the dock ------------------------------------
  // One dropdown since INBOX 214, not four segments: the button carries the
  // state when the menu is shut, the four toggles live in the menu.
  const shut = await page.evaluate(() => {
    const button = document.getElementById('timeline-kinds-btn');
    const search = document.getElementById('timeline-search');
    return {
      caption: document.getElementById('timeline-kinds-label').textContent,
      inDock: !!button.closest('.dock'),
      h: Math.round(button.getBoundingClientRect().height),
      w: Math.round(button.getBoundingClientRect().width),
      searchH: Math.round(search.getBoundingClientRect().height),
    };
  });
  check('3 kinds: one button in the dock, at the dock control height, saying the state',
    shut.inDock && Math.abs(shut.h - shut.searchH) <= 1 && shut.caption === 'Kinds: all',
    `"${shut.caption}", ${shut.w}x${shut.h}px, search ${shut.searchH}px`);

  await page.click('#timeline-kinds-btn');
  await page.waitForTimeout(300);
  const chips = await page.evaluate(() => {
    const box = document.getElementById('timeline-kinds');
    return [...box.querySelectorAll('[data-timeline-kind]')].map((input) => ({
      key: input.dataset.timelineKind,
      label: input.closest('label').textContent.replace(/\s+/g, ' ').trim(),
      on: input.checked,
      inMenu: !!input.closest('.doc-dock-menu-list'),
      h: Math.round(input.closest('label').getBoundingClientRect().height),
    }));
  });
  // A row carries its count when rows of that kind are loaded; a kind with
  // none loaded carries its bare label rather than "0", which would be a
  // claim about the whole notebook made from one page of it.
  const loaded = new Set(rows.map((r) => r.kind));
  check('3 kinds: four rows in the menu, all on, each loaded kind with its count',
    chips.length === 4 && chips.every((c) => c.on && c.inMenu) &&
      chips.every((c) => (loaded.has(c.key) ? /\d/.test(c.label) : true)),
    chips.map((c) => c.label).join(' · '));
  check('3 kinds: the rows are one height',
    new Set(chips.map((c) => c.h)).size === 1,
    `rows ${[...new Set(chips.map((c) => c.h))].join('/')}px`);

  // Turning one off refetches, the rows of that kind go, the caption follows,
  // and the menu stays open so the next one can be ticked without reopening.
  const requests = [];
  page.on('request', (r) => { if (r.url().includes('/timeline?')) requests.push(r.url()); });
  await page.click('#timeline-kinds input[data-timeline-kind="reminder"]');
  await page.waitForTimeout(2000);
  const afterOff = await page.evaluate(() => ({
    kinds: [...new Set([...document.querySelectorAll('#timeline-feed .timeline-row')].map((li) => li.dataset.kind))],
    checked: document.querySelector('#timeline-kinds input[data-timeline-kind="reminder"]').checked,
    caption: document.getElementById('timeline-kinds-label').textContent,
    open: document.getElementById('timeline-kinds-menu').open,
  }));
  check('3 kinds: ticking one refetches, the rows go, the caption and the menu follow',
    !afterOff.kinds.includes('reminder') && afterOff.checked === false && afterOff.open &&
      afterOff.caption === 'Kinds: notes, boards, documents' &&
      requests.some((u) => /kind=/.test(u)),
    `kinds left ${afterOff.kinds.join(', ')}, "${afterOff.caption}", menu open=${afterOff.open}, ${requests.length} request(s)`);
  await page.click('#timeline-search');

  // --- gate 4: the dock still fits, and nothing scrolls sideways ---------------
  const layout = [];
  for (const [w, h] of [[1440, 900], [1024, 820], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500);
    layout.push(await page.evaluate((width) => {
      const dock = document.querySelector('#tab-timeline .dock').getBoundingClientRect();
      return {
        width,
        dockH: Math.round(dock.height),
        overflow: Math.max(0, Math.round(document.documentElement.scrollWidth - width)),
      };
    }, w));
  }
  check('4 layout: no horizontal scroll at any width, dock heights',
    layout.every((l) => l.overflow === 0),
    layout.map((l) => `${l.width}: dock ${l.dockH}px, overflow ${l.overflow}px`).join(' · '));

  check('no page errors', errors.length === 0, `${errors.length}${errors.length ? ': ' + errors[0] : ''}`);
  console.log(`seeded note ${seeded.note}, document ${seeded.document}, reminder ${seeded.reminder}`);

  await browser.close();
  if (fails.length) {
    console.log(`\n${fails.length} gate line(s) failed: ${fails.join(', ')}`);
    process.exit(1);
  }
  console.log('\nPhase 4 gate green.');
})();
