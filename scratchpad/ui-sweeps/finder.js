// INBOX 270: the universal search ("a full application wide semantic search
// which shows content as well as features and actions etc").
//
// The engine is `/search` and it was already there; what is new is the door.
// So this drives the door: open it the three ways it opens, type, and read
// what lands on the page. Nothing in the Python suite can see any of it.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(3000);

  await page.evaluate(async () => {
    for (let i = 0; i < 3; i++) {
      await apiJson('/entries', {
        method: 'POST',
        body: JSON.stringify({ content: `Sourdough starter note ${i}: fed with rye flour every morning.`, category: 'General' }),
      }).catch(() => {});
    }
    await apiJson('/documents', {
      method: 'POST', body: JSON.stringify({ title: 'Bread notes', content: 'Rye flour and sourdough method.' }),
    }).catch(() => {});
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(2000);

  const doorways = await page.evaluate(() => {
    const vis = (el) => el && el.getBoundingClientRect().height > 0;
    return {
      dashField: vis(document.getElementById('dash-find')),
      statusButton: vis(document.getElementById('status-find')),
      overlayExists: !!document.getElementById('finder-overlay'),
    };
  });
  console.log('doorways', JSON.stringify(doorways));

  // Door one: the dashboard field.
  await page.click('#dash-find');
  await page.waitForTimeout(500);
  await page.fill('#finder-input', 'sourdough');
  await page.waitForTimeout(1800);

  const read = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#finder-results .finder-row')].map((r) => ({
      title: r.querySelector('.finder-row-title')?.textContent.replace(/\s+/g, ' ').trim().slice(0, 50),
      why: [...r.querySelectorAll('.finder-why')].map((c) => c.textContent),
      openable: r.tagName === 'BUTTON',
    }));
    const chips = [...document.querySelectorAll('#finder-filters .finder-chip')].map((c) => c.textContent.trim());
    return {
      open: !document.getElementById('finder-overlay').classList.contains('hidden'),
      rows, chips,
      summary: document.getElementById('finder-summary')?.textContent,
    };
  });
  console.log('open:', read.open, '| summary:', read.summary);
  console.log('chips:', JSON.stringify(read.chips));
  console.log(`rows: ${read.rows.length}`);
  for (const row of read.rows.slice(0, 6)) console.log('  ', JSON.stringify(row));

  // An action, not a note: the half the route has never heard of.
  await page.fill('#finder-input', 'zoom in');
  await page.waitForTimeout(1800);
  const actions = await page.evaluate(() =>
    [...document.querySelectorAll('#finder-results .finder-row')]
      .map((r) => r.querySelector('.finder-row-title')?.textContent.trim()));
  console.log('actions for "zoom in":', JSON.stringify(actions.slice(0, 4)));

  // The keyboard: down, down, and the highlight moves without losing the caret.
  await page.fill('#finder-input', 'sourdough');
  await page.waitForTimeout(1500);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const kb = await page.evaluate(() => ({
    active: document.querySelectorAll('#finder-results .finder-row.is-active').length,
    focusStillInput: document.activeElement?.id === 'finder-input',
    selected: [...document.querySelectorAll('#finder-results .finder-row')]
      .findIndex((r) => r.getAttribute('aria-selected') === 'true'),
  }));
  console.log('keyboard:', JSON.stringify(kb));

  // Escape closes, and the filter chips narrow.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const closed = await page.evaluate(() =>
    document.getElementById('finder-overlay').classList.contains('hidden'));

  // Door two: the status bar button, and a kind filter.
  await page.click('#status-find');
  await page.waitForTimeout(500);
  await page.fill('#finder-input', 'sourdough');
  await page.waitForTimeout(1800);
  const filtered = await page.evaluate(async () => {
    const chip = [...document.querySelectorAll('#finder-filters .finder-chip')]
      .find((c) => c.textContent.trim().startsWith('Documents'));
    if (!chip) return { chip: false };
    chip.click();
    await new Promise((r) => setTimeout(r, 1800));
    return {
      chip: true,
      pressed: chip.getAttribute('aria-pressed'),
      rows: [...document.querySelectorAll('#finder-results .finder-row')].length,
      titles: [...document.querySelectorAll('#finder-results .finder-row-title')].map((t) => t.textContent.trim().slice(0, 30)),
    };
  });
  console.log('filtered to documents:', JSON.stringify(filtered));

  //: And the density switch, in the same run: it is the other half of INBOX
  //: 270 and it is about the same page. Measured, not looked at: how tall the
  //: chrome above the widget grid is in each of the three.
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(1200);
  const density = {};
  for (const want of ['full', 'compact', 'focused']) {
    density[want] = await page.evaluate(async (value) => {
      //: A select now, not a segmented control: the three segments sat taller
      //: than the buttons beside them and none read as chosen.
      const seg = document.getElementById('dash-density');
      if (seg) {
        seg.value = value;
        seg.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise((r) => setTimeout(r, 500));
      const grid = document.getElementById('dash-grid');
      const page_ = document.getElementById('tab-dashboard');
      const find = document.getElementById('dash-find');
      return {
        attr: page_?.dataset.density,
        pressed: seg ? [seg.value] : [],
        //: The control has to line up with the two buttons beside it: as a
        //: `.seg` it stood taller than both, which is what the report saw.
        alignedWithToolbar: (() => {
          const box = document.querySelector('.dash-density');
          const other = document.getElementById('dash-widgets-open');
          if (!box || !other) return null;
          return Math.abs(box.getBoundingClientRect().height - other.getBoundingClientRect().height) <= 6;
        })(),
        //: The number that matters: how far down the page the first widget
        //: starts, which is what "a lot is happening on it" was about.
        chromeHeight: grid ? Math.round(grid.getBoundingClientRect().top - page_.getBoundingClientRect().top) : null,
        findVisible: !!find && find.getBoundingClientRect().height > 0,
      };
    }, want);
  }
  console.log('density:', JSON.stringify(density, null, 1));

  //: **The layout complaints, as numbers.** Reported with a screenshot:
  //: "the ui for the popup search bar is messy, not modernised, unclean, not
  //: aligned, not using propper sizing... elements are pushed onto a new
  //: line, there is no scrollbar, and the results could have better
  //: Information Architecture".
  //: The overlay from the filter check above is still open, and it covers
  //: the dashboard field: without this the click below waits thirty seconds
  //: for an element behind a modal and the whole probe reports a timeout.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(800);
  await page.click('#dash-find');
  await page.waitForTimeout(500);
  const layout = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const chips = [...document.querySelectorAll('#finder-filters .library-chip')];
    const tops = new Set(chips.map((c) => Math.round(c.getBoundingClientRect().top)));
    const input = document.getElementById('finder-input');
    const cs = input ? getComputedStyle(input) : null;
    return {
      //: One row means one distinct top. Two means the row wrapped.
      chipRows: tops.size,
      chipCount: chips.length,
      //: A zero on a chip before anything has been searched is a confident
      //: claim about a notebook nobody has queried.
      zeroesBeforeSearching: chips.filter((c) => /\s0$/.test(c.textContent.trim())).length,
      chipClass: chips[0]?.className || '',
      //: The field must not be a second box inside the bordered bar.
      inputBorder: cs ? cs.borderTopWidth : null,
      inputBackground: cs ? cs.backgroundColor : null,
      //: The sort control beside the filters, not on a line of its own.
      sameRowAsSort: (() => {
        const sort = document.querySelector('.finder-sort');
        if (!sort || !chips.length) return null;
        return Math.abs(sort.getBoundingClientRect().top - chips[0].getBoundingClientRect().top) < 24;
      })(),
      results: box(document.getElementById('finder-results')),
      card: box(document.querySelector('.finder-card')),
    };
  });
  console.log('layout:', JSON.stringify(layout));

  //: And with enough results to need one, a scrollbar.
  await page.fill('#finder-input', 'note');
  await page.waitForTimeout(1800);
  const scrolling = await page.evaluate(() => {
    const list = document.getElementById('finder-results');
    return {
      rows: list.querySelectorAll('.finder-row').length,
      groups: list.querySelectorAll('.finder-group').length,
      scrollable: list.scrollHeight > list.clientHeight,
      overflowY: getComputedStyle(list).overflowY,
      //: The card must not grow with the list: a dialog that changes height
      //: on every keystroke moves the row under the pointer between frames.
      cardHeight: Math.round(document.querySelector('.finder-card').getBoundingClientRect().height),
    };
  });
  console.log('scrolling:', JSON.stringify(scrolling));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  const findings = [];
  if (layout.chipRows > 1) findings.push(`the filter chips wrap onto ${layout.chipRows} rows`);
  if (layout.zeroesBeforeSearching) findings.push(`${layout.zeroesBeforeSearching} chip(s) show a count before anything was searched`);
  if (!/library-chip/.test(layout.chipClass)) findings.push(`the filter chips do not use the app's own chip recipe: ${layout.chipClass}`);
  if (layout.inputBorder && layout.inputBorder !== '0px') findings.push(`the search field draws its own border (${layout.inputBorder}) inside the bordered bar`);
  if (layout.sameRowAsSort === false) findings.push('the sort control sits on a row of its own below the filters');
  if (scrolling.overflowY !== 'auto' && scrolling.overflowY !== 'scroll') findings.push(`the results list does not scroll (overflow-y: ${scrolling.overflowY})`);
  for (const [name, read] of Object.entries(density)) {
    if (read.attr !== name) findings.push(`density ${name} did not take (attribute is ${read.attr})`);
    if (read.pressed.length !== 1 || read.pressed[0] !== name) {
      findings.push(`density ${name}: ${read.pressed.length} segment(s) read as pressed, ${JSON.stringify(read.pressed)}`);
    }
    if (!read.findVisible) findings.push(`the search field is hidden in ${name}, and it is the one thing every density keeps`);
    if (read.alignedWithToolbar === false) findings.push(`the view picker does not line up with the toolbar buttons beside it in ${name}`);
  }
  //: A tenth off, not a pixel off. A "compact" that saves 50px of 610 is a
  //: setting nobody would notice they had changed, which is how a density
  //: control becomes decoration.
  if (density.full.chromeHeight != null && density.compact.chromeHeight > density.full.chromeHeight * 0.9) {
    findings.push(`compact barely differs from full (${density.compact.chromeHeight}px vs ${density.full.chromeHeight}px above the widgets)`);
  }
  if (density.focused.chromeHeight >= density.compact.chromeHeight) {
    findings.push(`focused is not smaller than compact (${density.focused.chromeHeight}px vs ${density.compact.chromeHeight}px)`);
  }
  if (!doorways.dashField) findings.push('the dashboard has no visible search field');
  if (!doorways.statusButton) findings.push('the status bar has no Find button');
  if (!read.open) findings.push('the dashboard field did not open the finder');
  if (read.rows.length < 4) findings.push(`only ${read.rows.length} results for a query that matches three notes and a document`);
  if (!read.rows.some((r) => r.why.length)) findings.push('no result says why it matched');
  if (!read.rows.every((r) => r.openable)) findings.push('a result row is not openable');
  if (!actions.some((a) => /zoom in/i.test(a || ''))) findings.push('searching for an app action found no action');
  if (kb.active !== 1 || kb.selected !== 1) findings.push(`the keyboard highlight is wrong (${JSON.stringify(kb)})`);
  if (!kb.focusStillInput) findings.push('arrowing through results moved focus out of the input');
  if (!closed) findings.push('Escape did not close the finder');
  if (!filtered.chip) findings.push('no Documents filter chip');
  else if (filtered.pressed !== 'true') findings.push('the filter chip does not report itself pressed');
  else if (!filtered.titles.every((t) => /Bread/.test(t))) findings.push(`filtering to documents still shows ${JSON.stringify(filtered.titles)}`);
  if (errors.length) findings.push(`${errors.length} page error(s): ${errors.slice(0, 2)}`);
  for (const line of findings) console.log(`    ${line}`);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
