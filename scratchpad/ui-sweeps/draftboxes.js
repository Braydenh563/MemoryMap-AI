// INBOX 240: "when I clicked on the 'your thoughts' text box in the write with
// ai notes subtab, the box instantly shortened in height from what it was. same
// with the 'the draft' textbox as well." The height before the first focus and
// after it, for both boxes.
//
//   BASE=http://127.0.0.1:8802 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node draftboxes.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  const bad = [];
  //: The documents tab first, and that is not incidental: documents.js is
  //: loaded lazily and the note-surface mount lives in it, so a profile that
  //: has never opened Documents keeps plain textareas here and sees none of
  //: this. The owner had been in Documents (INBOX 232, 239, the same morning).
  await page.evaluate(() => switchTab('documents'));
  await page.waitForTimeout(2500);
  await page.evaluate(() => { switchTab('notes'); showNotesSection('writing-room'); });
  await page.waitForTimeout(1500);
  const box = (id) => page.evaluate((boxId) => {
    const el = document.getElementById(boxId);
    const wrap = el.closest('.note-surface');
    const target = wrap || el;
    const r = target.getBoundingClientRect();
    const col = el.closest('.draft-column');
    return {
      h: +r.height.toFixed(1), w: +r.width.toFixed(1),
      mounted: !!wrap,
      colH: col ? +col.getBoundingClientRect().height.toFixed(1) : null,
      scroller: wrap ? (() => { const s = wrap.querySelector('.cm-scroller'); const cs = getComputedStyle(s);
        return { h: +s.getBoundingClientRect().height.toFixed(1), min: cs.minHeight, max: cs.maxHeight }; })() : null,
    };
  }, id);

  for (const id of ['draft-thoughts', 'draft-text']) {
    const before = await box(id);
    await page.evaluate((boxId) => document.getElementById(boxId).focus(), id);
    await page.waitForTimeout(1200);
    const after = await box(id);
    const delta = +(after.h - before.h).toFixed(1);
    console.log(`${id.padEnd(14)} before ${JSON.stringify(before)}`);
    console.log(`${' '.repeat(14)} after  ${JSON.stringify(after)}  delta ${delta}`);
    if (delta < -1) bad.push(`${id} lost ${-delta}px on focus`);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.waitForTimeout(300);
  }

  // The two columns still end level, which is what the layout was built for.
  const level = await page.evaluate(() => {
    const cols = [...document.querySelectorAll('.draft-column')];
    return cols.map((c) => +c.getBoundingClientRect().height.toFixed(1));
  });
  console.log(`columns        ${JSON.stringify(level)}`);
  if (Math.abs(level[0] - level[1]) > 1) bad.push(`the two columns are ${level[0]} and ${level[1]}`);

  // A long draft scrolls inside its box rather than pushing the footer away:
  // that is what `min-height: 0` on the stretch rules buys, and it is the way
  // this fix could go wrong without shrinking anything.
  const long = await page.evaluate(async () => {
    const el = document.getElementById('draft-text');
    const wrap = el.closest('.note-surface');
    const before = +wrap.getBoundingClientRect().height.toFixed(1);
    const view = wrap.querySelector('.cm-editor');
    const scroller = wrap.querySelector('.cm-scroller');
    // through the mirror, which the surface owns and mirrors into the view
    el.value = Array.from({ length: 80 }, (_, i) => `line ${i} of a long draft`).join('\n');
    el.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 600));
    return {
      before,
      after: +wrap.getBoundingClientRect().height.toFixed(1),
      col: +el.closest('.draft-column').getBoundingClientRect().height.toFixed(1),
      scrolls: scroller.scrollHeight > scroller.clientHeight + 1,
      view: +view.getBoundingClientRect().height.toFixed(1),
    };
  });
  console.log(`long draft     ${JSON.stringify(long)}`);
  if (!long.scrolls) bad.push('a long draft does not scroll inside its box');
  if (long.after > long.before + 2) bad.push(`a long draft grew the box by ${(long.after - long.before).toFixed(1)}px`);

  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
