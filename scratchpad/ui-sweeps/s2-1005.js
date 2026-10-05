// The second round of small open items (s2-1005), one file, one MODE each so
// the scratchpad cap is not spent a sweep at a time:
//
//   MODE=listedge  INBOX 608, the list half: a held text-selection drag at the
//                  edge of the Notes list and the Library scrolls the list.
//                  Pass: scrollTop moves at least 200px in a one second hold,
//                  in both directions, at the edge, 40px inside it and past it
//                  (Chromium's own autoscroll covers only the last ~20px).
//   MODE=toolsgap  Settings at 390: the empty space inside a row's label column
//                  ("Tokens per step" first, then every row). Pass: under 20px.
//   MODE=rows      Whether a reminder row shares the notes' row class, and the
//                  render time and DOM node count of the Library, Reminders and
//                  Timeline lists with 300 rows seeded (see SEED below).
//
//   BASE=http://127.0.0.1:8804 W=1440 MODE=listedge node scratchpad/ui-sweeps/s2-1005.js
const { boot } = require('./lib.js');

const FIND = `(sel) => {
  let el = document.querySelector(sel);
  while (el && !(['auto', 'scroll'].includes(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight + 4)) el = el.parentElement;
  return el;
}`;

async function listedge(page, W) {
  const surfaces = [
    ['notes', 'switchTab("notes")', '#entry-list'],
    ['library', 'switchTab("library")', '#library-view-documents'],
  ];
  let fails = 0;
  for (const [name, open, sel] of surfaces) {
    await page.evaluate(open);
    await page.waitForTimeout(1500);
    if (name === 'library') {
      await page.click('#library-subtabs [data-target="library-view-documents"]').catch(() => {});
      await page.waitForTimeout(1200);
    }
    const scr = (fn) => page.evaluate(`(${fn})((${FIND})(${JSON.stringify(sel)}))`);
    for (const where of ['bottom-edge', 'top-edge', 'bottom-past', 'bottom-near', 'top-near']) {
      await scr(`(el) => { el.scrollTop = ${where.startsWith('top') ? 3000 : 0}; }`);
      await page.waitForTimeout(250);
      const box = await scr(`(el) => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, width: r.width }; }`);
      const x = box.left + Math.min(box.width / 2, 300);
      const startY = where.startsWith('top') ? box.top + 260 : box.top + 300;
      // 'near' is 40px inside the edge: past the ~20px band Chromium's own
      // text-selection autoscroll covers, inside the 56px band the boards use.
      const targetY = { 'bottom-edge': box.bottom - 6, 'top-edge': box.top + 6, 'bottom-past': box.bottom + 40, 'bottom-near': box.bottom - 40, 'top-near': box.top + 40 }[where];
      const st = async () => Math.round(await scr('(el) => el.scrollTop'));
      await page.mouse.move(x, startY);
      await page.mouse.down();
      for (let i = 1; i <= 12; i++) await page.mouse.move(x + 4 * i, startY + (targetY - startY) * i / 12);
      await page.waitForTimeout(100);
      const s1 = await st();
      await page.waitForTimeout(1000);
      const s2 = await st();
      const chars = await page.evaluate(() => (window.getSelection().toString() || '').length);
      await page.mouse.up();
      const moved = Math.abs(s2 - s1);
      const ok = moved >= 200 && chars > 0;
      if (!ok) fails++;
      console.log(`${name} ${where} W${W}: held 1s moved ${moved}px, selected ${chars} chars ${ok ? 'PASS' : 'FAIL'}`);
      await page.evaluate(() => getSelection().removeAllRanges());
    }
  }
  return fails;
}

// The empty space inside a settings row's label column. `.setting-label` is
// `flex: 1 1 14rem`: a basis that is a width in a row and a HEIGHT once the row
// stacks (<= 640px), so a one-line label stood 224px tall with its control at
// the bottom (the gap above "Tokens per step"). Measured as the label's box
// minus its content (last child's bottom), for the "Tokens per step" row and
// then for every row in every section. Pass: under 20px each.
async function toolsgap(page, W) {
  await page.evaluate(() => openSettingsModal('tools'));
  await page.waitForTimeout(800);
  const tokens = await page.evaluate(() => {
    const field = document.getElementById('run-budget-tokens');
    const label = field.closest('.setting-row').querySelector('.setting-label');
    const last = label.lastElementChild.getBoundingClientRect();
    return { gap: Math.round(field.getBoundingClientRect().top - last.bottom), label: Math.round(label.getBoundingClientRect().height) };
  });
  console.log(`Tokens per step W${W}: ${tokens.gap}px between the label's text and the field (label box ${tokens.label}px) ${tokens.gap < 20 ? 'PASS' : 'FAIL'}`);
  const bad = [];
  let rows = 0;
  for (const name of await page.evaluate(() => [...document.querySelectorAll('#settings-nav button[data-section]')].map((b) => b.dataset.section))) {
    await page.evaluate((n) => openSettingsModal(n), name);
    await page.waitForTimeout(350);
    const found = await page.evaluate(() => [...document.querySelectorAll('#settings-modal .setting-row > .setting-label')]
      .map((l) => ({ l, last: [...l.children].filter((c) => c.getClientRects().length).pop() }))
      .filter(({ l, last }) => l.getClientRects().length && last)
      .map(({ l, last }) => ({ id: l.parentElement.querySelector('[id]')?.id || l.textContent.trim().slice(0, 24), empty: Math.round(l.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom) })));
    rows += found.length;
    for (const f of found) if (f.empty >= 20) bad.push(`${name}/${f.id} ${f.empty}px`);
  }
  console.log(`label columns with 20px or more of empty space, ${rows} rows W${W}: ${bad.length} ${bad.length ? 'FAIL ' + bad.slice(0, 10).join('; ') : 'PASS'}`);
  return (tokens.gap < 20 ? 0 : 1) + (bad.length ? 1 : 0);
}

// Whether a reminder row shares the notes' row, and whether the Library, the
// Reminders and the Timeline stay smooth past 200 rows. Seed 300 of each first
// (notes, documents, reminders; scratchpad seeding is two curl loops), then:
//   same row?  the list class, the row's computed look and the classes inside it,
//              a note row beside a reminder row.
//   per list   render ms (the call plus two frames, fetch included), DOM nodes in
//              the list, a forced full style and layout (ms), and a 3 x 30 frame scroll
//              (worst and 95th percentile frame, ms). Pass: no frame over 50ms,
//              forced layout under 100ms.
async function rows(page, W) {
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1500);
  await page.evaluate(() => switchTab('reminders'));
  await page.waitForTimeout(1500);
  const same = await page.evaluate(() => {
    const look = (li) => {
      const c = getComputedStyle(li);
      return { list: li.parentElement.className, li: li.className, tag: li.tagName, pad: c.padding, radius: c.borderRadius, bg: c.backgroundColor, border: c.borderTopWidth + ' ' + c.borderLeftWidth, display: c.display, kids: [...li.children].map((k) => k.className).slice(0, 6) };
    };
    const note = document.querySelector('#entry-list > li:not(.skeleton)');
    const rem = document.querySelector('#tab-reminders .entry-list > li');
    return { note: note && look(note), reminder: rem && look(rem) };
  });
  console.log('same row?', JSON.stringify(same, null, 1));
  // CV='css text' adds a candidate rule through an adopted sheet (the CSP refuses
  // a style tag) to measure a fix before writing it into the stylesheets.
  if (process.env.CV) await page.evaluate((css) => { const sheet = new CSSStyleSheet(); sheet.replaceSync(css); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]; }, process.env.CV);
  const lists = [
    ['library docs', "switchTab('library'); document.querySelector('#library-subtabs [data-target=\"library-view-docs\"]').click()", () => renderLibraryDocuments(), '#library-view-docs'],
    ['reminders', "switchTab('reminders')", () => loadReminders(), '#tab-reminders'],
    ['timeline', "switchTab('timeline')", () => renderTimeline(), '.timeline-feed'],
  ];
  let fails = 0;
  for (const [name, open, render, sel] of lists) {
    // A sub-tab is pressed after its tab has settled (the tab restores the last
    // sub-tab a moment later and would undo the press: skeletons.js says so too).
    const [tab, sub] = open.split('; ');
    await page.evaluate(tab);
    await page.waitForTimeout(900);
    if (sub) { await page.evaluate(sub); await page.waitForTimeout(900); }
    const r = await page.evaluate(async ({ renderSrc, sel }) => {
      const frame = () => new Promise((res) => requestAnimationFrame(() => res(performance.now())));
      const t0 = performance.now();
      await (0, eval)(renderSrc)();
      await frame(); await frame();
      const renderMs = performance.now() - t0;
      const list = document.querySelector(sel);
      let scroller = list;
      while (scroller && !(['auto', 'scroll'].includes(getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight + 4)) scroller = scroller.parentElement;
      const rowsN = list.querySelectorAll('li, .timeline-row').length;
      const nodes = list.querySelectorAll('*').length;
      // A one pixel narrower box invalidates the subtree's layout; the read forces it.
      const w0 = list.style.width;
      list.style.width = list.offsetWidth - 1 + 'px';
      const t1 = performance.now();
      void list.offsetHeight;
      const layoutMs = performance.now() - t1;
      list.style.width = w0;
      const times = [];
      // Three passes down the list, so one slow frame is not the number.
      for (let pass = 0; pass < 3 && scroller; pass++) {
        scroller.scrollTop = 0;
        let last = await frame();
        for (let i = 0; i < 30; i++) {
          scroller.scrollTop += 400;
          const now = await frame();
          times.push(now - last);
          last = now;
        }
      }
      times.sort((a, b) => a - b);
      if (scroller) scroller.scrollTop = 0;
      return { rowsN, nodes, renderMs: Math.round(renderMs), layoutMs: +layoutMs.toFixed(1), worst: Math.round(times[times.length - 1] || 0), p95: Math.round(times[Math.floor(times.length * 0.95)] || 0), scrolled: !!scroller, scroller: scroller && (scroller.id || scroller.className) };
    }, { renderSrc: '(' + render.toString() + ')', sel });
    const ok = r.scrolled && r.worst <= 50 && r.layoutMs < 100;
    if (!ok) fails++;
    console.log(`${name} W${W}: ${r.rowsN} rows, ${r.nodes} DOM nodes, render ${r.renderMs}ms, forced layout ${r.layoutMs}ms, scroll frames worst ${r.worst}ms p95 ${r.p95}ms (scroller ${r.scroller}) ${ok ? 'PASS' : 'FAIL'}`);
  }
  return fails;
}

(async () => {
  const W = +(process.env.W || 1440);
  const MODE = process.env.MODE || 'listedge';
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  let fails = 0;
  if (MODE === 'listedge') fails = await listedge(page, W);
  if (MODE === 'toolsgap') fails = await toolsgap(page, W);
  if (MODE === 'rows') fails = await rows(page, W);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
