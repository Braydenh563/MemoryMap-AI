// The phone's five-item bar and its More sheet (UI_MODERNISATION_PLAN Phase 11,
// items 1 and 11).
//
// What it asserts, at 390, 360 and 320:
//   * five columns in the bar, each at least 44px wide, on one row, pinned to
//     the bottom edge, with no sideways scroll on the page;
//   * every caption that is shown is whole (the element's own scrollWidth
//     against its clientWidth), because a bar that says where you are with a
//     cut word is the defect this replaced in another form;
//   * More opens a sheet, the sheet comes from the bottom edge, its rows are
//     44px targets, and it does not cover the whole window;
//   * Escape closes it and focus goes back to the button that opened it;
//   * a tab behind More lights the More column, so the bar says where you are
//     on all seven tabs rather than on the four it shows;
//   * two taps to anything: the four in the bar are one, the three in the
//     sheet and Settings are two.
//
//   BASE=http://127.0.0.1:8943 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/phonemore.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const PW = 'testpassword123';
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
const MIN = 44;
const WIDTHS = (process.env.WIDTHS || '390,360,320').split(',').map(Number);

(async () => {
  const browser = await chromium.launch();
  let bad = 0;
  const fail = (msg) => { bad += 1; console.log(`    FAIL ${msg}`); };

  for (const width of WIDTHS) {
    const ctx = await browser.newContext({
      viewport: { width, height: 844 },
      deviceScaleFactor: 1,
      hasTouch: true,
      isMobile: true,
    });
    await ctx.addInitScript(() => {
      try { localStorage.setItem('theme', 'light'); localStorage.setItem('onboardingDone', '1'); } catch (e) {}
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
    await page.fill('#lock-password', PW); await page.click('#lock-submit'); await page.waitForTimeout(2500);
    if (await page.$('#lock-password') && await page.isVisible('#lock-password')) {
      await page.fill('#lock-password', PW); await page.click('#lock-submit'); await page.waitForTimeout(2500);
    }
    await page.evaluate(() => { const o = document.getElementById('onboarding-overlay'); if (o) o.classList.add('hidden'); });
    await page.waitForTimeout(800);

    const bar = await page.evaluate(() => {
      const dock = document.getElementById('phone-tab-dock');
      const strip = document.getElementById('tab-bar');
      const more = document.getElementById('phone-more-btn');
      const cols = [...document.querySelectorAll('#tab-bar button')]
        .filter((b) => b.getClientRects().length)
        .concat(more && more.getClientRects().length ? [more] : []);
      const box = dock.getBoundingClientRect();
      return {
        stripInDock: strip.parentElement === dock,
        dock: { h: +box.height.toFixed(1), bottom: +box.bottom.toFixed(1) },
        innerH: window.innerHeight,
        rows: new Set(cols.map((c) => Math.round(c.getBoundingClientRect().top))).size,
        columns: cols.map((c) => {
          const r = c.getBoundingClientRect();
          const label = c.querySelector('.tab-label');
          const shown = label ? getComputedStyle(label).display !== 'none' : false;
          return {
            name: (label && label.textContent.trim()) || c.getAttribute('aria-label') || '?',
            w: +r.width.toFixed(1), h: +r.height.toFixed(1),
            caption: shown,
            clipped: shown && label.scrollWidth > label.clientWidth + 1,
          };
        }),
        sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    console.log(`${width}  columns ${bar.columns.length}  rows ${bar.rows}  bar ${bar.dock.h}px  bottom ${bar.dock.bottom}/${bar.innerH}  sideways ${bar.sideways}`);
    bar.columns.forEach((c) => console.log(`    ${c.name} ${c.w}x${c.h}  caption ${c.caption}${c.clipped ? ' CLIPPED' : ''}`));
    if (!bar.stripInDock) fail('the tab strip is not inside #phone-tab-dock');
    if (bar.columns.length !== 5) fail(`${bar.columns.length} columns, not five`);
    if (bar.rows !== 1) fail(`the bar is ${bar.rows} rows`);
    if (Math.abs(bar.dock.bottom - bar.innerH) > 1) fail('the bar is not flush to the bottom edge');
    if (bar.sideways) fail('the page scrolls sideways');
    bar.columns.forEach((c) => {
      if (c.w < MIN || c.h < MIN) fail(`${c.name} is ${c.w}x${c.h}, under ${MIN}px`);
      if (c.clipped) fail(`${c.name}'s caption is cut`);
    });

    // The sheet.
    await page.click('#phone-more-btn');
    await page.waitForTimeout(500);
    const sheet = await page.evaluate(() => {
      const overlay = document.querySelector('.sheet-overlay[data-sheet="more"]');
      if (!overlay) return { missing: true };
      const card = overlay.querySelector('.sheet-card');
      const cardBox = card.getBoundingClientRect();
      const rows = [...card.querySelectorAll('.sheet-row')].map((r) => {
        const b = r.getBoundingClientRect();
        return { name: r.textContent.trim(), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
      });
      return {
        role: overlay.getAttribute('role'),
        modal: overlay.getAttribute('aria-modal'),
        expanded: document.getElementById('phone-more-btn').getAttribute('aria-expanded'),
        card: { top: +cardBox.top.toFixed(1), bottom: +cardBox.bottom.toFixed(1), h: +cardBox.height.toFixed(1), w: +cardBox.width.toFixed(1) },
        innerH: window.innerHeight,
        focusIn: card.contains(document.activeElement),
        rows,
      };
    });
    if (sheet.missing) { fail('More opened no sheet'); }
    else {
      console.log(`    sheet ${sheet.card.w}x${sheet.card.h} top ${sheet.card.top}/${sheet.innerH}  rows ${sheet.rows.length}  focus inside ${sheet.focusIn}`);
      sheet.rows.forEach((r) => console.log(`      ${r.name} ${r.w}x${r.h}`));
      if (sheet.role !== 'dialog' || sheet.modal !== 'true') fail('the sheet is not a modal dialog');
      if (sheet.expanded !== 'true') fail('the More button does not report aria-expanded');
      if (Math.abs(sheet.card.bottom - sheet.innerH) > 1) fail('the sheet is not against the bottom edge');
      if (sheet.card.top < 40) fail(`the sheet covers the window (top ${sheet.card.top})`);
      if (sheet.rows.length !== 4) fail(`${sheet.rows.length} rows in the sheet, not four`);
      if (!sheet.focusIn) fail('the sheet did not take focus');
      sheet.rows.forEach((r) => { if (r.h < MIN) fail(`sheet row ${r.name} is ${r.h}px tall`); });
    }

    // Escape closes it and gives the focus back.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closed = await page.evaluate(() => ({
      gone: !document.querySelector('.sheet-overlay'),
      focused: document.activeElement?.id || '',
      expanded: document.getElementById('phone-more-btn').getAttribute('aria-expanded'),
    }));
    if (!closed.gone) fail('Escape did not close the sheet');
    if (closed.focused !== 'phone-more-btn') fail(`focus went to "${closed.focused}" rather than back to More`);
    if (closed.expanded !== 'false') fail('aria-expanded stayed true after closing');

    // Two taps to a tab behind More, and the bar says where you are.
    await page.click('#phone-more-btn');
    await page.waitForTimeout(400);
    await page.click('.sheet-row:has-text("Timeline")');
    await page.waitForTimeout(800);
    const after = await page.evaluate(() => ({
      shown: [...document.querySelectorAll('.tab-page')].filter((p) => !p.classList.contains('hidden')).map((p) => p.id),
      moreLit: document.getElementById('phone-more-btn').classList.contains('active'),
      current: document.getElementById('phone-more-btn').getAttribute('aria-current'),
      sheetGone: !document.querySelector('.sheet-overlay'),
    }));
    console.log(`    two taps -> ${after.shown.join(',')}  More lit ${after.moreLit}  aria-current ${after.current}`);
    if (!after.shown.includes('tab-timeline')) fail('the Timeline row did not open the Timeline');
    if (!after.moreLit) fail('More is not lit while a tab behind it is showing');
    if (after.current !== 'page') fail('More does not report aria-current');
    if (!after.sheetGone) fail('the sheet stayed open behind the tab it opened');

    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `FAIL: ${bad} findings` : 'PASS: 0 findings');
  process.exit(bad ? 1 : 0);
})();
