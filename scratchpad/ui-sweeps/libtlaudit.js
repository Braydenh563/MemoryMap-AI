// The Library's and the Timeline's ergonomics, measured rather than read
// (libtl-0926): what a sort, a kind filter and a keystroke in the search
// cost on a large notebook, how many Tab stops a card is and whether the
// arrow keys move between cards, what each empty state says and offers,
// and whether the cards in one view are one height.
//
//   BASE=http://127.0.0.1:8807 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node libtlaudit.js
//
// Prints one JSON object; writes it to OUT/libtl-audit.json.
const fs = require('fs');
const { boot, OUT } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(4000);
  const out = {};

  // Sort, filter and search: from the input to the list painted again.
  out.library = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
    const grid = document.getElementById('library-grid');
    const firstTitle = () => grid.querySelector('.library-card .library-card-title')?.textContent.trim().slice(0, 40) || '';
    const r = { items: libraryItems.length, cards: grid.querySelectorAll('.library-card').length };
    const sort = document.getElementById('library-sort');
    r.sort = {};
    for (const v of ['az', 'oldest', 'biggest', 'recent']) {
      const t0 = performance.now();
      sort.value = v; sort.dispatchEvent(new Event('change', { bubbles: true }));
      await frame();
      r.sort[v] = { ms: Math.round(performance.now() - t0), first: firstTitle() };
    }
    await wait(300);
    const search = document.getElementById('library-search');
    const keys = [];
    for (const text of ['m', 'me', 'mee', 'meet']) {
      const t0 = performance.now();
      search.value = text; search.dispatchEvent(new Event('input', { bubbles: true }));
      await frame();
      keys.push(Math.round(performance.now() - t0));
    }
    await wait(600);
    r.searchKeystrokeMs = keys;
    r.searchCards = grid.querySelectorAll('.library-card').length;
    search.value = 'zzqqxxnothing'; search.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(800);
    const empty = document.getElementById('library-empty');
    r.noMatch = { shown: !empty.classList.contains('hidden'), title: document.getElementById('library-empty-title').textContent, buttons: [...empty.querySelectorAll('button:not(.hidden)')].map((b) => b.textContent.trim()) };
    search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(800);
    // Kind chips.
    const chips = [...document.querySelectorAll('#library-filters button')];
    r.chips = chips.map((c) => c.textContent.trim().replace(/\s+/g, ' '));
    r.chipsPressed = chips.filter((c) => c.getAttribute('aria-pressed') !== null).length;
    // Tab stops per card, and the arrow keys.
    const card = grid.querySelector('.library-card');
    const focusables = card ? [...card.querySelectorAll('a, button, input, select, textarea, [tabindex]')].filter((e) => e.tabIndex >= 0 && e.getClientRects().length) : [];
    r.tabStopsPerCard = focusables.length + (card && card.tabIndex >= 0 ? 1 : 0);
    r.cardTabIndex = card?.tabIndex;
    r.cardRole = card?.getAttribute('role');
    // Heights in the grid view.
    const hs = [...grid.querySelectorAll('.library-card')].slice(0, 30).map((c) => Math.round(c.getBoundingClientRect().height));
    r.gridHeights = { min: Math.min(...hs), max: Math.max(...hs), view: libraryView() };
    return r;
  });

  // Arrow keys from the first card.
  await page.evaluate(() => document.querySelector('#library-grid .library-card')?.focus());
  const before = await page.evaluate(() => document.activeElement?.className || '');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  const afterRight = await page.evaluate(() => { const a = document.activeElement; const cards = [...document.querySelectorAll('#library-grid .library-card')]; return { cls: String(a?.className || '').slice(0, 40), index: cards.indexOf(a) }; });
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  const afterDown = await page.evaluate(() => { const a = document.activeElement; const cards = [...document.querySelectorAll('#library-grid .library-card')]; return { cls: String(a?.className || '').slice(0, 40), index: cards.indexOf(a) }; });
  out.library.arrows = { before: before.slice(0, 40), afterRight, afterDown };

  // Tab from the search until the focus is out of the grid (it was 400+
  // presses before the grid had one stop).
  await page.focus('#library-search');
  let presses = 0;
  let seenCard = false;
  for (; presses < 120; presses += 1) {
    await page.keyboard.press('Tab');
    const inGrid = await page.evaluate(() => !!document.activeElement.closest('#library-grid'));
    if (inGrid) seenCard = true;
    else if (seenCard) break;
  }
  out.library.tabsToLeaveGrid = presses + 1;

  // Each sub-tab's empty state on a no-match search is a separate surface;
  // the kinds filter "none of this kind" is the other one.
  out.librarySubtabs = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const res = {};
    for (const b of document.querySelectorAll('[data-library-subtab], #library-subtabs button, .library-subtabs button')) {
      res[b.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)] = b.dataset.librarySubtab || b.dataset.sub || b.id;
    }
    await wait(10);
    return res;
  });

  // Timeline.
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(3500);
  out.timeline = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const r = {};
    const head = document.querySelector('#tab-timeline .dock, #tab-timeline header, #tab-timeline .timeline-head');
    r.controls = head ? [...head.querySelectorAll('button, select, input, summary')].filter((e) => e.getClientRects().length).map((e) => `${e.tagName.toLowerCase()}#${e.id || ''}:${(e.getAttribute('aria-label') || e.title || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}`) : [];
    const rows = [...document.querySelectorAll('#timeline-scroll .timeline-row')];
    r.rows = rows.length;
    r.rowTabbable = rows.filter((x) => x.tabIndex >= 0).length;
    r.rowRole = rows[0]?.getAttribute('role');
    const inner = rows[0] ? [...rows[0].querySelectorAll('a, button, input, [tabindex]')].filter((e) => e.tabIndex >= 0).length : -1;
    r.innerTabStops = inner;
    const search = document.querySelector('#timeline-search, #tab-timeline input[type="search"]');
    r.search = search ? search.id : null;
    if (search) {
      search.value = 'zzqqxxnothing'; search.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(900);
      const empty = [...document.querySelectorAll('#tab-timeline .empty-state, #tab-timeline [class*="empty"]')].filter((e) => e.getClientRects().length);
      r.noMatch = empty.map((e) => ({ cls: String(e.className).slice(0, 40), text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 140), buttons: [...e.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => b.textContent.trim()) }));
      search.value = ''; search.dispatchEvent(new Event('input', { bubbles: true }));
      await wait(900);
    }
    return r;
  });
  await page.evaluate(() => document.querySelector('#timeline-scroll .timeline-row[tabindex="0"]')?.focus());
  const tBefore = await page.evaluate(() => document.activeElement?.dataset?.key || '');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  const tAfter = await page.evaluate(() => document.activeElement?.dataset?.key || document.activeElement?.className || '');
  out.timeline.arrowDown = { moved: tBefore !== tAfter && !!tAfter, from: tBefore, to: String(tAfter).slice(0, 40) };
  console.log(JSON.stringify(out, null, 1));
  const bad = [];
  if (out.library.tabsToLeaveGrid > 30) bad.push(`Tab takes ${out.library.tabsToLeaveGrid} presses through the Library grid`);
  if (!out.library.noMatch.shown || !out.library.noMatch.buttons.length) bad.push('the Library no-match state offers no way out');
  if (!out.timeline.arrowDown.moved) bad.push('ArrowDown does not move between Timeline rows');
  console.log(bad.length ? `FAIL: ${bad.join('; ')}` : 'PASS');
  process.exitCode = bad.length ? 1 : 0;
  fs.writeFileSync(`${OUT}/libtl-audit.json`, JSON.stringify(out, null, 1));
  await browser.close();
})();
