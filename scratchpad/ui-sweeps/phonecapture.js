// UI Phase 11 item 2: the phone's + for a new note. The Notes dock's primary
// floats above the tab bar below 600, opens Capture with the box focused,
// and hides while Capture is showing; at 1024 it is the dock's filled button.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(2500);
  await page.evaluate(() => { switchTab('notes'); showNotesSection('browse'); });
  await page.waitForTimeout(800);
  const findings = [];
  const fab = await page.evaluate(() => {
    const b = document.getElementById('notes-new-note');
    const r = b.getBoundingClientRect();
    const dock = document.getElementById('phone-tab-dock').getBoundingClientRect();
    return { floating: b.classList.contains('dock-fab') && b.parentElement.classList.contains('tab-page'), x: Math.round(r.left), right: Math.round(r.right), bottom: Math.round(r.bottom), h: Math.round(r.height), w: Math.round(r.width), dockTop: Math.round(dock.top), fixed: getComputedStyle(b).position };
  });
  console.log('fab', JSON.stringify(fab));
  if (!fab.floating) findings.push('the New note button is not floating at 390');
  if (fab.h < 44) findings.push('the + is under 44px: ' + fab.h);
  if (fab.bottom > fab.dockTop) findings.push(`the + (bottom ${fab.bottom}) overlaps the tab bar (top ${fab.dockTop})`);
  if (fab.right > 390) findings.push('the + hangs off the right edge');
  await page.click('#notes-new-note');
  await page.waitForTimeout(600);
  // The box is a live editor once mounted, so the active element is its
  // `.cm-content` inside the capture section, or the textarea before that.
  const after = await page.evaluate(() => { const ae = document.activeElement; const inBox = ae && (ae.id === 'entry-content' || (ae.classList.contains('cm-content') && !!ae.closest('#capture'))); return { capture: !document.getElementById('capture').classList.contains('hidden'), focused: inBox, active: ae && ae.tagName + '#' + ae.id + '.' + [...ae.classList].slice(0, 1), fabShown: document.getElementById('notes-new-note').getBoundingClientRect().height > 0 }; });
  console.log('after', JSON.stringify(after));
  if (!after.capture) findings.push('the + did not open Capture');
  if (!after.focused) findings.push('the capture box is not focused, active is ' + after.active);
  if (after.fabShown) findings.push('the + still shows over the Capture box');
  await page.evaluate(() => showNotesSection('browse'));
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.waitForTimeout(700);
  const desk = await page.evaluate(() => { const b = document.getElementById('notes-new-note'); return { inDock: !!b.closest('.dock-actions'), filled: !b.classList.contains('ghost'), h: Math.round(b.getBoundingClientRect().height), fab: b.classList.contains('dock-fab') }; });
  console.log('1024', JSON.stringify(desk));
  if (!desk.inDock || desk.fab) findings.push('at 1024 the button is not back in the dock');
  if (!desk.filled) findings.push('the dock primary is not filled');
  if (errors.length) findings.push('page errors: ' + errors.join(' | '));
  console.log(findings.length ? 'FAIL: ' + findings.join('\n  ') : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
