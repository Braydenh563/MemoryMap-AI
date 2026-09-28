// Notes list density with realistic notes (3-5 lines of body, tags, links)
// at 1093x614. Measures how many note cards fit above the fold, before any
// change, in the Notes > Browse view (list layout, whichever is default).
const { boot } = require('./lib.js');

const NOTES = [
  {
    content: [
      '# Kitchen renovation plan',
      '',
      'Spoke to the contractor about the kitchen renovation today. We agreed',
      'on knocking through the wall to the dining room and moving the sink',
      'under the window. Need to get three quotes before committing to',
      'anyone, and check whether the load-bearing wall needs an engineer.',
      '',
      'Budget is tight so cabinets will probably be IKEA rather than custom.',
      '#home #renovation #budget',
      'https://example.com/kitchen-ideas',
    ].join('\n'),
    category: 'Home',
  },
  {
    content: [
      '# Quarterly planning notes',
      '',
      'Reviewed Q3 numbers with the team this morning. Revenue is up 12%',
      'year over year but churn ticked up slightly in the enterprise tier.',
      'Need to dig into why before the board meeting next week.',
      '',
      'Action items: pull the churn cohort data, draft retention proposal,',
      'schedule a follow-up with customer success.',
      '#work #quarterly-planning #q3',
    ].join('\n'),
    category: 'Work',
  },
  {
    content: [
      '# Book notes: Atomic Habits',
      '',
      "Finished chapter 4. The core idea is that habits form through a loop",
      'of cue, craving, response and reward, and you change a habit by making',
      'the cue invisible or the response harder, not by relying on willpower.',
      '',
      'Want to try the two-minute rule for the habits I keep dropping.',
      '#reading #habits #self-improvement',
      'https://example.com/atomic-habits-summary',
    ].join('\n'),
    category: 'Personal',
  },
  {
    content: [
      '# Trip to Portugal, day 3',
      '',
      'Walked along the coast this morning before it got too hot. Had lunch',
      'at a small place near the marina, grilled sardines and a jug of',
      'vinho verde. Tomorrow we are driving out to the vineyards, so an',
      'early start.',
      '',
      'Note to self: book the train back a day earlier if seats are available.',
      '#travel #portugal #vacation',
    ].join('\n'),
    category: 'Personal',
  },
  {
    content: [
      '# Server migration checklist',
      '',
      'Drafted the checklist for the weekend migration. Order is: snapshot',
      'the database, freeze writes, run the migration script, verify row',
      'counts, flip DNS, then monitor error rates for an hour before telling',
      'the team it is done.',
      '#work #infra #migration',
      'https://example.com/migration-runbook',
    ].join('\n'),
    category: 'Work',
  },
  {
    content: [
      '# Weekly grocery list draft',
      '',
      'Running low on the basics again. Need oats, milk, eggs, spinach,',
      'chicken thighs, and the good olive oil from the deli, not the',
      'supermarket one. Also should pick up a birthday card for mum.',
      '#home #groceries',
    ].join('\n'),
    category: 'Home',
  },
];

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1093, height: 614 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });

  const seedResults = await page.evaluate(async (notes) => {
    const out = [];
    for (const n of notes) {
      try {
        const res = await apiJson('/entries', { method: 'POST', body: JSON.stringify(n) });
        out.push({ ok: true, id: res.id });
      } catch (e) {
        out.push({ ok: false, error: e.message });
      }
    }
    return out;
  }, NOTES);
  console.log('SEED', JSON.stringify(seedResults));

  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1200);

  const measured = await page.evaluate(() => {
    const list = document.getElementById('entry-list');
    const cards = [...(list ? list.querySelectorAll('li') : [])];
    const viewportH = window.innerHeight;
    // The list's own scrollable ancestor: whichever ancestor between the
    // list and <body> actually clips overflow (its scrollHeight exceeds its
    // clientHeight, or it is the nearest one with overflow-y set).
    let scroller = null;
    let el = list && list.parentElement;
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY)) { scroller = el; break; }
      el = el.parentElement;
    }
    const foldBottom = scroller ? scroller.getBoundingClientRect().bottom : viewportH;
    const rects = cards.map((li) => {
      const r = li.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
    });
    const aboveFold = rects.filter((r) => r.top >= 0 && r.bottom <= foldBottom).length;
    const partiallyVisible = rects.filter((r) => r.top < foldBottom && r.bottom > 0).length;
    return {
      isRows: !!(list && list.classList.contains('is-rows')),
      listClass: list ? list.className : null,
      scrollerTag: scroller ? scroller.tagName + '.' + scroller.className : null,
      cardCount: cards.length,
      foldBottom: Math.round(foldBottom),
      viewportH,
      rects: rects.slice(0, 8),
      aboveFold,
      partiallyVisible,
    };
  });
  console.log(JSON.stringify({ theme: process.env.THEME || 'light', measured, errors }, null, 2));
  await browser.close();
})().catch((e) => { console.error('SWEEP_ERROR', e.message, e.stack); process.exit(1); });
