// INBOX 233: "the documents kebab button in the top right corner goes off the
// bottom of my screen."
//
//   BASE=http://127.0.0.1:8801 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/dockebab.js
//
// One document is created through the API so the editor and its dock exist,
// then `#doc-dock-menu` (the dock's ⋯, a `<details>` the stylesheet places and
// nothing measures) is opened at the reported 1440x700 and at 900, and its
// panel measured against the window: how far past the bottom edge it runs,
// what it was capped to, and whether it can scroll to its own last row. The
// last row is named, because "runs off the bottom" means exactly that a row
// cannot be reached.
const { boot } = require('./lib.js');

(async () => {
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };
  const { browser, page } = await boot({ viewport: { width: 1440, height: 700 } });

  await page.evaluate(async () => {
    await fetch('/documents', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Kebab room', content: '# Kebab room\n\nOne paragraph.', file_type: 'markdown' }),
    });
  });
  await page.evaluate(() => switchTab('documents'));
  await page.waitForTimeout(2000);

  const measure = async (height) => {
    await page.setViewportSize({ width: 1440, height });
    await page.waitForTimeout(400);
    await page.evaluate(() => { const d = document.getElementById('doc-dock-menu'); if (d) d.open = false; });
    await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelector('#doc-dock-menu > summary')?.click());
    await page.waitForTimeout(400);
    return page.evaluate(() => {
      const details = document.getElementById('doc-dock-menu');
      const list = details?._dockMenuList || details?.querySelector('.doc-dock-menu-list')
        || document.querySelector('body > .doc-dock-menu-list');
      if (!details || !list) return { open: false };
      const summary = details.querySelector('summary');
      const a = summary.getBoundingClientRect();
      const r = list.getBoundingClientRect();
      const cs = getComputedStyle(list);
      const rows = [...list.querySelectorAll('.doc-dock-menu-item')];
      const last = rows[rows.length - 1];
      const lr = last ? last.getBoundingClientRect() : null;
      // The honest test of "off the bottom": scroll the menu to its end and
      // see whether the last row is inside the window.
      list.scrollTop = list.scrollHeight;
      const lrScrolled = last ? last.getBoundingClientRect() : null;
      return {
        open: details.open,
        escaped: list.classList.contains('action-menu-escaped'),
        parent: list.parentElement.tagName.toLowerCase(),
        rows: rows.length,
        opener: `${Math.round(a.left)},${Math.round(a.bottom)}`,
        roomBelow: Math.round(window.innerHeight - a.bottom),
        rect: `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`,
        spill: Math.round(r.bottom - window.innerHeight),
        maxHeight: cs.maxHeight,
        overflowY: cs.overflowY,
        canScroll: list.scrollHeight > list.clientHeight + 1,
        wants: list.scrollHeight,
        lastRow: last ? `${last.textContent.trim().slice(0, 24)} at ${Math.round(lr.top)}-${Math.round(lr.bottom)}` : null,
        lastRowReachable: !!lrScrolled && lrScrolled.bottom <= window.innerHeight + 1 && lrScrolled.top >= -1,
        winH: window.innerHeight,
      };
    });
  };

  for (const height of [700, 900]) {
    const m = await measure(height);
    console.log(`  ${height}: ${JSON.stringify(m)}`);
    check(`1440x${height} the dock kebab stays in the window`, m.open && m.spill <= 0,
      `panel ${m.rect} (${m.rows} rows wanting ${m.wants}px) under an opener whose bottom leaves ${m.roomBelow}px, spill ${m.spill}px past a ${m.winH}px window, max-height ${m.maxHeight}, overflow-y ${m.overflowY}, scrolls ${m.canScroll}`);
    check(`1440x${height} its last row can be reached`, !!m.lastRowReachable,
      `last row "${m.lastRow}", reachable after scrolling the panel to its end: ${m.lastRowReachable}`);
  }

  // The upward branch. The dock sits near the top of the window, so the room
  // under its button is never small in normal use: the toolbar is pushed down
  // with a transform, which moves the opener's own rect, to measure the branch
  // rather than reason about it.
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const details = document.getElementById('doc-dock-menu');
    details.open = false;
    details.parentElement.style.transform = 'translateY(430px)';
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('#doc-dock-menu > summary').click());
  //: The `toggle` event is a task, not a microtask: measuring in the same turn
  //: as the click measures the menu before the handler has placed it.
  await page.waitForTimeout(400);
  const up = await page.evaluate(() => {
    const details = document.getElementById('doc-dock-menu');
    const bar = details.parentElement;
    const list = details.querySelector('.doc-dock-menu-list');
    const a = details.querySelector('summary').getBoundingClientRect();
    const r = list.getBoundingClientRect();
    const rows = [...list.querySelectorAll('.doc-dock-menu-item')];
    const last = rows[rows.length - 1];
    list.scrollTop = list.scrollHeight;
    const lr = last.getBoundingClientRect();
    const out = {
      up: details.classList.contains('doc-dock-menu-up'),
      opener: `${Math.round(a.top)}-${Math.round(a.bottom)}`,
      roomBelow: Math.round(window.innerHeight - a.bottom - 8),
      rect: `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`,
      spillBottom: Math.round(r.bottom - window.innerHeight),
      spillTop: Math.round(-r.top),
      maxHeight: getComputedStyle(list).maxHeight,
      lastRowReachable: lr.bottom <= window.innerHeight + 1 && lr.top >= -1,
    };
    details.open = false;
    bar.style.transform = '';
    return out;
  });
  console.log(`  up:  ${JSON.stringify(up)}`);
  check('with 90px under the button the panel opens upward and fits', up.up && up.spillBottom <= 0 && up.spillTop <= 0 && up.lastRowReachable,
    `opener at ${up.opener} leaving ${up.roomBelow}px below, panel ${up.rect}, max-height ${up.maxHeight}, spill ${up.spillTop}px above and ${up.spillBottom}px below, last row reachable ${up.lastRowReachable}`);

  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
