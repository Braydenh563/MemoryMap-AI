// UI Phase 11 item 2: swipe a note row on a phone. Right past the arm point
// favourites it (the row's own star), left bins it (the row menu's own
// "Move to bin", undo toast and all). A short swipe settles back and does
// nothing; a vertical drag is the page's scroll. Driven with real touch
// events through CDP, since a mouse never starts a swipe.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(2500);
  await page.evaluate(async () => { for (const t of ['Swipe row one', 'Swipe row two', 'Swipe row three']) await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: t }) }).catch(() => {}); });
  await page.evaluate(() => { switchTab('notes'); showNotesSection('browse'); });
  await page.evaluate(() => loadEntries());
  await page.waitForTimeout(2000);
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (sel, dx, dy = 0, steps = 8) => {
    const r = await page.evaluate((s) => { const b = document.querySelector(s).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + Math.min(24, b.height / 2) }; }, sel);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
    for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: r.x + (dx * i) / steps, y: r.y + (dy * i) / steps }] }); await page.waitForTimeout(16); }
    const mid = await page.evaluate((s) => { const li = document.querySelector(s); return { x: li.style.getPropertyValue('--swipe-x'), armed: li.classList.contains('swipe-armed'), before: getComputedStyle(li, '::before').width, after: getComputedStyle(li, '::after').width }; }, sel);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(600);
    return mid;
  };
  const findings = [];
  // The first row that is not already a favourite: a favourite floats to the
  // top, so on a data dir this probe has run against before the first row is
  // the last run's.
  const firstId = await page.evaluate(() => document.querySelector('#entry-list li[data-id]:not(.is-favourite-row)').dataset.id);
  const sel = `#entry-list li[data-id="${firstId}"]`;
  // 1. A short swipe: reveals, settles, does nothing.
  const short = await swipe(sel, 40);
  const afterShort = await page.evaluate((s) => { const li = document.querySelector(s); return { x: li.style.getPropertyValue('--swipe-x'), fav: li.classList.contains('is-favourite-row') }; }, sel);
  console.log('short', JSON.stringify({ short, afterShort }));
  if (parseFloat(short.before) < 30) findings.push('a 40px swipe did not reveal the underlay: ' + short.before);
  if (short.armed) findings.push('a 40px swipe armed the action');
  if (afterShort.x !== '0px') findings.push('the row did not settle back: ' + afterShort.x);
  if (afterShort.fav) findings.push('a short swipe favourited the note');
  // 2. A full swipe right favourites.
  const right = await swipe(sel, 110);
  await page.waitForTimeout(1500);
  const fav = await page.evaluate((id) => { const e = allEntries.find((x) => String(x.id) === id); return e && !!e.pinned; }, firstId);
  console.log('right', JSON.stringify({ right, fav }));
  if (!right.armed) findings.push('a 110px swipe did not arm');
  if (!fav) findings.push('a full swipe right did not favourite the note');
  // 3. A vertical drag is not a swipe.
  const vert = await swipe(sel, 6, 80);
  console.log('vertical', JSON.stringify(vert));
  if (vert.x && vert.x !== '0px') findings.push('a vertical drag moved the row: ' + vert.x);
  // 4. A full swipe left bins the note (with the menu's own undo).
  const before = await page.evaluate(() => allEntries.length);
  const left = await swipe(sel, -110);
  await page.waitForTimeout(1800);
  const after = await page.evaluate((id) => ({ n: allEntries.length, gone: !allEntries.some((x) => String(x.id) === id), toast: !!document.querySelector('.toast, [role="status"].toast, .toast-action') }), firstId);
  console.log('left', JSON.stringify({ left, before, after }));
  if (!left.armed) findings.push('a 110px swipe left did not arm');
  if (!after.gone) findings.push('a full swipe left did not bin the note');
  if (errors.length) findings.push('page errors: ' + errors.join(' | '));
  console.log(findings.length ? 'FAIL: ' + findings.join('\n  ') : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
