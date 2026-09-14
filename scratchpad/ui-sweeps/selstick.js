// Do the selection bars stay with the selection? (INBOX 165)
//
// The owner, verbatim: "I want the selected bars to be sticky to the top of the
// screen when scrolling", with a screenshot of the Library's "1 selected, Open,
// Delete, Done". It is the same fault on every one of them, so this drives all
// five that a sweep can reach and asks two questions of each:
//
//   1. With the bar's own scroller run to its end, is the bar still on screen,
//      parked at the top of that scroller? A bar that is not sticky ends up at
//      a negative y, which is the whole report.
//   2. Is the ground opaque? `--accent-soft` is a 14% wash, and a sticky bar
//      has the list moving under it. `.doc-toolbar` was reported for exactly
//      this ("the bar is clear so it is hard to see"), so the resting ground is
//      read back and the alpha of the bottom layer has to be 1.
//
// And one question of the pair that shares a scroller, because that is the trap
// commit 27167e3 records: the Notes sub-tab strip is sticky at top 0 in the
// same scroller as the Notes bar, so a bar that also took 0 would park in the
// strip's band and be painted over.
//
//   BASE=http://127.0.0.1:8961 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node selstick.js
//
// Needs seed.js (notes, documents) and a picture in the gallery for the Images
// bar; it seeds the picture itself. Prints one line per bar, non-zero on any
// failure.
const { boot } = require('./lib.js');

// A bar may end up a few pixels above its scroller's top edge: sticky rounds,
// and the strip it stops under is measured in whole pixels. More than this and
// it is not sticking, it is scrolling.
const SLACK = 2;

// The measurement runs in the page: find the bar's scrolling ancestor, run it
// to the end, and read where the bar landed relative to that scroller's own
// top edge.
const PROBE = `((id) => {
  const bar = document.getElementById(id);
  if (!bar) return { missing: true };
  if (bar.classList.contains('hidden')) return { hidden: true };
  let sc = bar.parentElement;
  while (sc && sc !== document.body) {
    const cs = getComputedStyle(sc);
    if (/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 1) break;
    sc = sc.parentElement;
  }
  const cs = getComputedStyle(bar);
  // No scroller above it: nothing can carry the bar off the screen, so there is
  // no parked position to measure. The recipe still has to be on the element,
  // which is what the caller checks in this case, because a list short today is
  // a list long tomorrow. The timeline's table is the one that lands here: it
  // pages, so its own page never overflows at 1440x900.
  if (!sc || sc === document.body) return { noScroll: true, position: cs.position, top: cs.top };
  const before = bar.getBoundingClientRect().top;
  const was = sc.scrollTop;
  sc.scrollTop = sc.scrollHeight;
  const box = bar.getBoundingClientRect();
  const scTop = sc.getBoundingClientRect().top;
  // What is actually painted behind the text, bottom layer first: a sticky bar
  // over moving content needs that layer to be opaque.
  const ground = cs.backgroundImage + ' | ' + cs.backgroundColor;
  const translucent = /rgba\\([^)]*,\\s*0?\\.\\d+\\s*\\)\\s*$/.test(cs.backgroundColor)
    || cs.backgroundColor === 'rgba(0, 0, 0, 0)';
  // Is anything else sticky in this scroller, and does it overlap us?
  const rivals = [...sc.querySelectorAll('*')].filter((e) => e !== bar
    && getComputedStyle(e).position === 'sticky' && e.getBoundingClientRect().height > 0);
  const overlapped = rivals.filter((e) => {
    const r = e.getBoundingClientRect();
    return r.bottom > box.top + 1 && r.top < box.bottom - 1;
  }).map((e) => (e.id || e.className.split(' ')[0]) + ' ' + Math.round(e.getBoundingClientRect().top));
  sc.scrollTop = was;
  return {
    position: cs.position, top: cs.top, scrollable: Math.round(sc.scrollHeight - sc.clientHeight),
    scroller: sc.id || sc.className.split(' ')[0],
    before: +before.toFixed(1), after: +box.top.toFixed(1), scTop: +scTop.toFixed(1),
    offset: +(box.top - scTop).toFixed(1), ground, translucent, overlapped,
  };
})`;

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=';

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  let failures = 0;

  // Enough pictures that the gallery scrolls, and enough notes that the list
  // does: an empty list cannot answer the question this sweep asks.
  const seeded = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    let n = 0;
    for (let i = 0; i < 30; i += 1) {
      const fd = new FormData();
      fd.append('file', new File([bytes], `sticky-${i}.png`, { type: 'image/png' }));
      fd.append('direct', 'true');
      const r = await fetch('/media/upload', {
        method: 'POST', body: fd,
        headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
      });
      if (r.ok) n += 1;
    }
    for (let i = 0; i < 24; i += 1) {
      await api('/entries', { method: 'POST', body: JSON.stringify({ content: `Sticky bar probe note ${i}`, tags: ['probe'] }) });
    }
    for (let i = 0; i < 10; i += 1) {
      await api('/documents', { method: 'POST', body: JSON.stringify({ title: `Probe document ${i}`, content: '# Probe\n\nOne paragraph.' }) });
    }
    return n;
  }, PNG);
  console.log(`seeded ${seeded} pictures, 24 notes, 10 documents`);

  const report = async (label, id) => {
    const r = await page.evaluate(`${PROBE}(${JSON.stringify(id)})`);
    if (r.missing || r.hidden) {
      console.log(`${label.padEnd(18)} SKIPPED (${r.missing ? 'not in the page' : 'nothing selected'})`);
      failures += 1;
      return;
    }
    if (r.noScroll) {
      const ok = r.position === 'sticky';
      if (!ok) failures += 1;
      console.log(`${label.padEnd(18)} ${r.position} top:${r.top}, nothing scrolls under it `
        + `(this list pages rather than scrolls)${ok ? '' : '  NOT STICKY'}`);
      return;
    }
    const stuck = r.offset <= SLACK + Math.max(0, parseFloat(r.top) || 0)
      && r.offset >= -SLACK;
    const bad = [];
    if (r.position !== 'sticky') bad.push(`position: ${r.position}`);
    if (!stuck) bad.push(`parked ${r.offset}px from its scroller's top edge`);
    if (r.translucent) bad.push(`translucent ground: ${r.ground}`);
    if (r.overlapped.length) bad.push(`overlapped by ${r.overlapped.join(', ')}`);
    failures += bad.length;
    console.log(`${label.padEnd(18)} ${r.position} top:${r.top} in #${r.scroller} `
      + `(${r.scrollable}px of scroll)  y ${r.before} -> ${r.after}  offset ${r.offset}`);
    for (const line of bad) console.log(`    ${line}`);
  };

  // Notes: select mode, then tick the first row.
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(900);
  await page.click('#select-btn').catch(() => {});
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const cb = document.querySelector('#entry-list input[type="checkbox"]');
    if (cb) cb.click();
  });
  await page.waitForTimeout(500);
  await report('Notes', 'batch-bar');

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(1000);
  const sub = async (match) => {
    await page.evaluate((m) => {
      const b = [...document.querySelectorAll('#library-subtabs button')]
        .find((e) => new RegExp(m, 'i').test(e.textContent || ''));
      if (b) b.click();
    }, match);
    await page.waitForTimeout(1000);
  };
  const tick = async (sel) => {
    await page.evaluate((s) => {
      const cb = document.querySelector(s);
      if (cb) cb.click();
    }, sel);
    await page.waitForTimeout(500);
  };

  // The Library's own list ("All"), where the report came from.
  await tick('#library-grid input[type="checkbox"]');
  await report('Library all', 'library-selectbar');

  await sub('^Documents$');
  await tick('#library-docs-list .doc-list-tick');
  await report('Library docs', 'library-docs-selectbar');

  await sub('Images');
  await tick('#library-images-grid .library-tile-tick');
  await report('Library images', 'library-media-selectbar');

  // Timeline's table view, the one place outside Notes with the same bar.
  await page.evaluate(() => switchTab('timeline'));
  // The timeline builds its own rows from the whole notebook on first open, and
  // 900ms was not enough: the view toggle clicked before the table existed and
  // the bar stayed hidden, which the sweep correctly reported as a skip.
  await page.waitForTimeout(1800);
  // `.click()` rather than a real tap for these two: the table toggle is an
  // icon in a seg and Select lives inside the dock's closed `details` menu, so
  // a pointer would have to open the menu first. What this sweep is measuring
  // is the bar once it exists, not the route to it; `menus.js` owns that.
  await page.evaluate(() => document.getElementById('timeline-view-table')?.click());
  await page.waitForTimeout(1200);
  // **Select mode is one flag for both tabs.** `selectMode` in app.js is shared
  // between the Notes list and the timeline table, so the Notes bar left on
  // above turns this one *off* on the first click. Found by this sweep
  // reporting "nothing selected" while the same clicks worked on their own.
  // Clicking until the bar is actually out is the honest way round it here; the
  // shared flag itself is a finding for the plan, not for the sweep.
  for (let i = 0; i < 2; i += 1) {
    await page.evaluate(() => document.getElementById('timeline-select-btn')?.click());
    await page.waitForTimeout(600);
    if (!await page.evaluate(() => document.querySelector('.timeline-col-select input') === null)) break;
  }
  await page.evaluate(() => {
    const cb = document.querySelector('.timeline-col-select input[type="checkbox"]');
    if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
  });
  await page.waitForTimeout(500);
  await report('Timeline table', 'timeline-batch-bar');

  for (const line of errs) console.log(`    console: ${line}`);
  failures += errs.length;
  console.log(failures ? `FAIL: ${failures} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
