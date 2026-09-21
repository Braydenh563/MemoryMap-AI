// Three owner reports about three surfaces, measured rather than looked at.
//
//   INBOX 289  "in the files subtab, I want the expanded text box to be
//              slightly taller as it is quite short vertically"
//   INBOX 296  "improve the ui of the hero section in the dashboard when on
//              focused mode"
//   INBOX 307  "I feel like the navigation and undo/redo buttons keep getting
//              pushed further and further to the left on the bottom bar, is
//              there a better way to restructure the right side of the bottom
//              bar??"
//
// One probe rather than three because all three are geometry read off one
// booted app, and booting is most of the cost.
//
// Seed first, or the Files half has an empty state to measure and the numbers
// mean nothing:
//
//   node scratchpad/ui-sweeps/seed-libtext.js
//   python scratchpad/ui-sweeps/seed-libtext.py <data dir>/memorymap.db
//
//   BASE=http://127.0.0.1:8806 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules SCRATCH=/tmp/mm-uitrio \
//     timeout 115 node scratchpad/ui-sweeps/uitrio.js
const { boot } = require('./lib.js');

let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`);
};
const round = (n) => Math.round(n * 10) / 10;

// --- 289: the Files sub-tab's extracted-text box ------------------------------
//
// The number the report is about is *lines shown*, not pixels: "quite short
// vertically" is a person counting the lines they can read before they have to
// scroll. So the box's own height is divided by its computed line height, and
// the second number is what the row below costs, because a taller box that
// pushes the next row off the screen is a worse answer than a short one.
async function filesBox(page, width) {
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button, [data-subtab]')].find(
      (e) => /file/i.test(e.textContent || e.dataset.subtab || '')
    );
    if (b) b.click();
  });
  await page.waitForTimeout(1600);
  await page.evaluate(() => {
    const d = document.querySelector('.library-image-tile .library-image-reading');
    if (d) d.open = true;
  });
  await page.waitForTimeout(500);
  return page.evaluate((w) => {
    const r = (n) => Math.round(n * 10) / 10;
    const box = document.querySelector('.library-file-reading-text');
    if (!box) return { width: w, missing: true };
    const cs = getComputedStyle(box);
    const rect = box.getBoundingClientRect();
    // The line box, resolved: `line-height: 1.5` computes to a pixel string in
    // Chromium, but "normal" would not, so fall back to the font size rather
    // than write NaN into a division (CLAUDE.md's "invalid where it is used").
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
    const tiles = [...document.querySelectorAll('.library-image-tile')];
    const mine = box.closest('.library-image-tile');
    const next = tiles[tiles.indexOf(mine) + 1] || null;
    const scroller =
      document.querySelector('#tab-library .library-file-rows')?.closest('[class]') || document.scrollingElement;
    return {
      width: w,
      boxH: r(rect.height),
      maxH: cs.maxHeight,
      lineH: r(lh),
      lines: Math.round((rect.height / lh) * 100) / 100,
      scrollH: box.scrollHeight,
      clipped: box.scrollHeight > box.clientHeight + 1,
      tileH: r(mine.getBoundingClientRect().height),
      // Where the row below starts, against the viewport: the "pushed out of
      // view" half of the brief.
      nextTop: next ? r(next.getBoundingClientRect().top) : null,
      viewportH: window.innerHeight,
      nextVisible: next ? next.getBoundingClientRect().top < window.innerHeight : null,
      scrollerTag: scroller ? scroller.tagName : null,
    };
  }, width);
}

// --- 296: the dashboard's focused hero ----------------------------------------
//
// Not "is focused shorter" (it is), but **what focused puts in front of you**.
// Every band is listed shown or dropped at each density, so the three levels
// can be read as one sequence, and the hero's own controls are counted: a hero
// that shows least has to still be the one thing you came for.
const BANDS = [
  ['emblem', '#dash-hero-emblem'],
  ['wordmark', '.dash-wordmark'],
  ['greeting', '#dash-greeting'],
  ['submessage', '#dash-submessage'],
  ['clock', '.dash-clock'],
  ['find', '#dash-find'],
  ['quicklinks', '#dash-quicklinks'],
  ['stats', '#dash-stats'],
];

async function hero(page, density) {
  return page.evaluate(async (args) => {
    const { density, BANDS } = args;
    applyDashDensity(density);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const r = (n) => Math.round(n * 10) / 10;
    const heroEl = document.getElementById('dash-hero');
    const grid = document.getElementById('dash-grid');
    const pageEl = document.getElementById('tab-dashboard');
    const top = pageEl.getBoundingClientRect().top;
    const bands = {};
    for (const [name, sel] of BANDS) {
      const el = document.querySelector(sel);
      if (!el) { bands[name] = 'absent'; continue; }
      const box = el.getBoundingClientRect();
      const shown = box.height > 0 && getComputedStyle(el).display !== 'none';
      bands[name] = shown ? r(box.height) : 'off';
    }
    const heroBox = heroEl.getBoundingClientRect();
    const findEl = document.getElementById('dash-find');
    const findBox = findEl ? findEl.getBoundingClientRect() : null;
    return {
      density,
      hero: r(heroBox.height),
      chrome: grid ? r(grid.getBoundingClientRect().top - top) : null,
      bands,
      // The head, as one number: the top of the banner to the bottom of the
      // search doorway, whether those are one row or two bands.
      head: findBox ? r(findBox.bottom - heroBox.top) : null,
      // On one line, or one above the other. A tolerance of a pixel, not zero:
      // stretch aligns the boxes, sub-pixel layout does the rest.
      oneRow: findBox ? Math.abs(findBox.top - heroBox.top) < 1.5 : null,
      findH: findBox ? r(findBox.height) : null,
      heroRadius: getComputedStyle(heroEl).borderTopLeftRadius,
      findRadius: findEl ? getComputedStyle(findEl).borderTopLeftRadius : null,
      // Every control a person can press inside the hero, which is the measure
      // of "the one thing you came here for" against "a banner".
      heroControls: [...heroEl.querySelectorAll('button, a, input')]
        .filter((e) => e.offsetParent)
        .map((e) => (e.id || e.className || e.tagName).toString().split(' ')[0]),
      greetingSize: getComputedStyle(document.getElementById('dash-greeting')).fontSize,
    };
  }, { density, BANDS });
}

// --- 307: the right end of the status bar -------------------------------------
//
// The drift complaint, as a list: every drawn item in the bar in DOM order,
// with its left edge, so "pushed further to the left" is a coordinate. The
// items right of `.status-spacer` are the run the report is about.
async function statusBar(page) {
  return page.evaluate(() => {
    const r = (n) => Math.round(n * 10) / 10;
    const bar = document.getElementById('status-bar');
    const items = [];
    let side = 'left';
    for (const el of bar.children) {
      const box = el.getBoundingClientRect();
      const shown = box.width > 0 && getComputedStyle(el).display !== 'none';
      if (el.classList.contains('status-spacer')) { side = 'right'; continue; }
      if (!shown) continue;
      items.push({
        id: el.id || el.className.toString().split(' ')[0],
        side,
        left: r(box.left),
        right: r(box.right),
        w: r(box.width),
        zone: el.dataset.statusZone || null,
      });
    }
    const nav = document.querySelector('.status-nav');
    const redo = document.getElementById('status-redo');
    return {
      barW: r(bar.getBoundingClientRect().width),
      items,
      // The two numbers the report is about: how far the navigation pair's
      // right edge sits from the right edge of the bar, and the same for redo.
      navFromRight: nav ? r(bar.getBoundingClientRect().right - nav.getBoundingClientRect().right) : null,
      redoFromRight: redo ? r(bar.getBoundingClientRect().right - redo.getBoundingClientRect().right) : null,
      rightCount: items.filter((i) => i.side === 'right').length,
    };
  });
}

(async () => {
  const widths = [1440, 390];
  const out = {};
  for (const width of widths) {
    const { browser, page } = await boot({ viewport: { width, height: width === 390 ? 844 : 950 } });

    console.log(`\n=== ${width} ===`);
    const files = await filesBox(page, width);
    out[`files${width}`] = files;
    if (files.missing) console.log('files: no reading box on screen (seed first)');
    else
      console.log(
        `289 files box: ${files.boxH}px (max-height ${files.maxH}), line ${files.lineH}px, ` +
          `${files.lines} lines, content ${files.scrollH}px, tile ${files.tileH}px, ` +
          `next row top ${files.nextTop} of ${files.viewportH}`
      );

    const bar = await statusBar(page);
    out[`bar${width}`] = bar;
    console.log(
      `307 bar ${bar.barW}px, ${bar.rightCount} items right of the spacer, ` +
        `nav ends ${bar.navFromRight}px from the right edge, redo ${bar.redoFromRight}px`
    );
    for (const i of bar.items.filter((x) => x.side === 'right'))
      console.log(`      ${i.id.padEnd(22)} left ${String(i.left).padStart(7)}  w ${i.w}  zone ${i.zone}`);

    {
      await page.evaluate(() => switchTab('dashboard'));
      await page.waitForTimeout(900);
      // At 390 only the level the report is about: the question down there is
      // whether the head row wraps back into two bands rather than squeezing
      // a banner and a field into 390px.
      for (const d of width === 1440 ? ['full', 'compact', 'focused'] : ['focused']) {
        const h = await hero(page, d);
        out[`hero-${d}${width === 1440 ? '' : width}`] = h;
        console.log(
          `296 hero ${d.padEnd(8)} ${String(h.hero).padStart(6)}px, chrome ${h.chrome}px, ` +
            `head ${h.head}px, one row ${h.oneRow}, find ${h.findH}px ` +
            `(radius ${h.heroRadius} / ${h.findRadius}), greeting ${h.greetingSize}`
        );
        console.log(`      bands ${JSON.stringify(h.bands)}`);
      }
    }
    await browser.close();
  }

  // --- the checks ------------------------------------------------------------
  //
  // 289: the box shows at least four lines of the reading. Three was the
  // measured complaint; the cap is still a cap, so the row below has to stay on
  // screen with the box open.
  const f = out.files1440;
  check(
    '289: the Files reading box shows at least four lines',
    !f.missing && f.lines >= 3.9,
    `${f.lines} lines (${f.boxH}px at ${f.lineH}px)`
  );
  check(
    '289: and the row below the open one is still on screen',
    f.missing || f.nextTop === null || f.nextVisible,
    `next row top ${f.nextTop} of ${f.viewportH}`
  );
  const fp = out.files390;
  check(
    '289: the same box on a phone is not taller than half the screen',
    fp.missing || fp.boxH < fp.viewportH / 2,
    `${fp.boxH}px of ${fp.viewportH}`
  );

  // 296: the three levels read as one sequence, smallest hero at the level that
  // shows least, and focused still carries the identity and one way in.
  const [full, compact, focused] = [out['hero-full'], out['hero-compact'], out['hero-focused']];
  check(
    '296: the heroes shrink with the level',
    full.hero > compact.hero && compact.hero > focused.hero,
    `${full.hero} / ${compact.hero} / ${focused.hero}`
  );
  check(
    '296: focused keeps the greeting and the one number',
    focused.bands.greeting !== 'off' && focused.bands.submessage !== 'off',
    JSON.stringify(focused.bands)
  );
  // The judgement this report turns on: focused is "the one thing you came here
  // for", so the head at that level has to *carry* that one thing rather than
  // stack a thinner banner above it.
  check(
    '296: focused puts the banner and the search doorway on one row',
    focused.oneRow === true,
    `one row ${focused.oneRow}, head ${focused.head}px`
  );
  check(
    '296: and the two read as one row, same height and same corner',
    Math.abs(focused.hero - focused.findH) < 1.5 && focused.heroRadius === focused.findRadius,
    `${focused.hero} / ${focused.findH}px, ${focused.heroRadius} / ${focused.findRadius}`
  );
  check(
    '296: full and compact keep the banner and the doorway as two bands',
    full.oneRow === false && compact.oneRow === false,
    `full ${full.oneRow}, compact ${compact.oneRow}`
  );
  // A phone is 390px of line: the head row has to give up and stack, or the
  // banner and the field share a line neither of them fits on.
  const focused390 = out['hero-focused390'];
  check(
    '296: the focused head row wraps back into two bands on a phone',
    focused390.oneRow === false,
    `one row ${focused390.oneRow}, head ${focused390.head}px`
  );

  // 307: the right end has an owner. Navigation and undo end the bar, so no
  // later feature can push them left: their distance from the right edge is
  // bounded by the width of the pair itself.
  for (const width of widths) {
    const b = out[`bar${width}`];
    check(
      `307 at ${width}: every item right of the spacer declares its zone`,
      b.items.filter((i) => i.side === 'right').every((i) => i.zone),
      b.items.filter((i) => i.side === 'right' && !i.zone).map((i) => i.id).join(', ') || 'all zoned'
    );
    check(
      `307 at ${width}: the navigation pair ends the bar`,
      b.redoFromRight !== null && b.redoFromRight <= 4,
      `redo ends ${b.redoFromRight}px from the right edge`
    );
  }

  console.log(failures ? `\nFAILURES ${failures}` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
