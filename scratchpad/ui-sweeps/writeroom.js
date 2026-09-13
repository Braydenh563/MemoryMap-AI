// INBOX 141: the Write with AI footer rows keep their shape when a field is
// focused, and the two footers end on one edge. Each as a number.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node writeroom.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  const bad = [];
  await page.evaluate(() => { switchTab('notes'); showNotesSection('writing-room'); });
  await page.waitForTimeout(600);
  const rows = () => page.evaluate(() => {
    const m = (sel) => {
      const r = document.querySelector(sel);
      const kids = [...r.children].filter((k) => !k.classList.contains('hidden'));
      // A wrapped child starts below every child before it; centred children
      // of different heights on one line do not.
      let lines = 1; let floor = -Infinity;
      for (const k of kids) { const b = k.getBoundingClientRect(); if (b.top >= floor - 1 && floor !== -Infinity) lines += 1; floor = Math.max(floor, b.bottom); }
      return { h: Math.round(r.getBoundingClientRect().height), lines, field: Math.round(r.querySelector('input').getBoundingClientRect().width) };
    };
    const actions = document.querySelector('.draft-actions-row');
    const save = document.getElementById('draft-save').getBoundingClientRect();
    const draftIt = document.getElementById('draft-compose').getBoundingClientRect();
    const tagsRow = document.querySelector('.draft-tags-row').getBoundingClientRect();
    const composeRow = document.querySelector('.draft-compose-row').getBoundingClientRect();
    return { compose: m('.draft-compose-row'), tags: m('.draft-tags-row'), saveRight: Math.round(save.right), tagsRight: Math.round(tagsRow.right), draftItRight: Math.round(draftIt.right), composeRight: Math.round(composeRow.right), actionsJustify: getComputedStyle(actions).justifyContent };
  });
  const before = await rows();
  await page.click('#draft-instruction');
  await page.waitForTimeout(250);
  const focusedInstruction = await rows();
  await page.click('#draft-tags');
  await page.waitForTimeout(250);
  const focusedTags = await rows();
  console.log(`141 instruction row: ${before.compose.h}px/${before.compose.lines} line(s)/field ${before.compose.field}px before, ${focusedInstruction.compose.h}px/${focusedInstruction.compose.lines}/${focusedInstruction.compose.field}px focused`);
  console.log(`141 tags row:        ${before.tags.h}px/${before.tags.lines} line(s)/field ${before.tags.field}px before, ${focusedTags.tags.h}px/${focusedTags.tags.lines}/${focusedTags.tags.field}px focused`);
  console.log(`141 footers:         Save as note ends at ${before.saveRight}, the tags row at ${before.tagsRight}; Draft it ends at ${before.draftItRight}, its row at ${before.composeRight}; actions ${before.actionsJustify}`);
  if (focusedInstruction.compose.h !== before.compose.h || focusedInstruction.compose.lines !== 1) bad.push('instruction row reshapes on focus');
  if (focusedTags.tags.h !== before.tags.h || focusedTags.tags.lines !== 1) bad.push('tags row reshapes on focus');
  if (Math.abs(before.saveRight - before.tagsRight) > 12) bad.push('draft actions do not end at the column edge');
  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
