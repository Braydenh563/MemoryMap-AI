// The bottom tab bar at phone widths (UI_MODERNISATION_PLAN Phase 11, item 1).
//
// The bar itself was built in Phase 9, and the measurement that matters here is
// not whether it is pinned (it is) but whether it says anything: at 360 and 390
// every one of the seven captions was hidden, so which tab you are on was
// carried by colour alone on seven identical glyphs.
//
// Four questions, per width, and per tab, because the answer changes with which
// tab is selected (the selected one is the one that keeps its caption):
//
//   1. Is the strip on one row, not scrolling sideways? A caption that grows a
//      column is how a seven-column bar starts scrolling.
//   2. Does the selected tab show its whole caption, unclipped?
//   3. Are the other six captions off?
//   4. Is every column still a 44px target, and the bar still flush to the
//      bottom edge?
//
//   BASE=http://127.0.0.1:8961 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node phonetabs.js
//
// Non-zero on any of the four. 320 is in the set because it is the narrowest
// width the shell is held to (Phase 11 item 10).
const { boot } = require('./lib.js');

const WIDTHS = [320, 360, 390, 430];
const MIN_TARGET = 44;
// Every tab, because "Dashboard" and "Reminders" are the two captions the
// blanket-hide rule was written for and they are the two that decide this.
const TABS = ['dashboard', 'notes', 'chat', 'graph', 'library', 'timeline', 'reminders'];

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTHS[0], height: 844 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  let failures = 0;

  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(500);
    console.log(`\n--- ${width}x844`);
    for (const tab of TABS) {
      await page.evaluate((t) => switchTab(t), tab);
      await page.waitForTimeout(350);
      const r = await page.evaluate((min) => {
        const bar = document.getElementById('tab-bar');
        const box = bar.getBoundingClientRect();
        const buttons = [...bar.querySelectorAll('button')];
        const active = buttons.find((b) => b.classList.contains('active'));
        const label = active?.querySelector('.tab-label');
        const shown = buttons.filter((b) => {
          const l = b.querySelector('.tab-label');
          return l && getComputedStyle(l).display !== 'none';
        }).length;
        const small = buttons.filter((b) => {
          const r = b.getBoundingClientRect();
          return r.width + 0.5 < min || r.height + 0.5 < min;
        }).map((b) => `${b.id} ${b.getBoundingClientRect().width.toFixed(1)}x${b.getBoundingClientRect().height.toFixed(1)}`);
        return {
          active: active ? active.id.replace('tab-btn-', '') : null,
          caption: label ? (label.textContent || '').trim() : null,
          captionClipped: label ? label.scrollWidth > label.clientWidth + 0.5 : false,
          captionWidth: label ? +label.getBoundingClientRect().width.toFixed(1) : 0,
          shownCaptions: shown,
          activeWidth: active ? +active.getBoundingClientRect().width.toFixed(1) : 0,
          widest: Math.max(...buttons.map((b) => +b.getBoundingClientRect().width.toFixed(1))),
          narrowest: Math.min(...buttons.map((b) => +b.getBoundingClientRect().width.toFixed(1))),
          scrolls: bar.scrollWidth > bar.clientWidth + 1,
          needs: bar.scrollWidth,
          has: bar.clientWidth,
          atBottom: Math.abs(box.bottom - innerHeight) < 1.5,
          pageSlides: document.documentElement.scrollWidth > document.documentElement.clientWidth + 0.5,
          small,
        };
      }, MIN_TARGET);

      const bad = [];
      if (r.scrolls) bad.push(`the strip scrolls sideways (${r.needs} in ${r.has})`);
      if (r.pageSlides) bad.push('the page scrolls sideways');
      if (!r.atBottom) bad.push('the bar is not flush to the bottom edge');
      // **Below 360 no caption is the right answer, and it is arithmetic rather
      // than a concession**: seven columns at the 44px floor need 308px, which
      // fits 320, and one of them carrying "Reminders" needs 344.2px, which does
      // not. So the narrowest band trades the caption for the hit target, and a
      // sweep that demanded a caption there would be demanding a 40px tab.
      const wantsCaption = width >= 360;
      if (wantsCaption && r.shownCaptions !== 1) bad.push(`${r.shownCaptions} captions shown, expected only the selected tab's`);
      if (!wantsCaption && r.shownCaptions !== 0) bad.push(`${r.shownCaptions} captions shown below 360, where seven 44px columns leave no room for one`);
      if (wantsCaption && !r.caption) bad.push('the selected tab has no caption');
      if (wantsCaption && r.captionClipped) bad.push(`the selected caption is clipped ("${r.caption}")`);
      if (r.small.length) bad.push(`under ${MIN_TARGET}px: ${r.small.join(', ')}`);
      failures += bad.length;
      console.log(`  ${String(r.active).padEnd(10)} "${r.caption}" ${r.captionWidth}px in a ${r.activeWidth}px column`
        + `  others ${r.narrowest}..${r.widest}  strip ${r.needs}/${r.has}  captions shown ${r.shownCaptions}`);
      for (const line of bad) console.log(`      ${line}`);
    }
  }

  for (const line of errs) console.log(`    console: ${line}`);
  failures += errs.length;
  console.log(failures ? `\nFAIL: ${failures} findings` : '\nPASS: 0 findings');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
