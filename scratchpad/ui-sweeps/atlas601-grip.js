// INBOX 601 (the owner: "I want to be able to double tab the drag to resize
// circle on the companion to reset it to default size"). The companion made
// 140% from its handle, then: a mouse double-click on the handle, and (a
// touch laptop: hover and touch both) two taps on it. Each must bring it
// back to 100%, kept (`avatar-buddy-size` in localStorage and Appearance's
// select), never open the large view; a single press and a drag must not
// reset it. Exits 1 otherwise.
//   BASE=... KIND=atlas THEME=dark node atlas601-grip.js
const { boot } = require('./lib.js');
(async () => {
  const fails = [];
  const out = {};
  const { browser, page } = await boot({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  await page.evaluate((k) => {
    localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy');
    b.value = k;
    b.dispatchEvent(new Event('change', { bubbles: true }));
  }, process.env.KIND || 'atlas');
  await page.waitForTimeout(3500);
  // A touch context reads as `(hover: none)`, where the handle is not drawn
  // at all; a touch laptop has a pointer that hovers as well, and shows it.
  // That device, here: the handle shown, taps on it from the touchscreen.
  // (CSSOM, not a <style>: the CSP refuses inline style elements.)
  await page.evaluate(() => {
    const g = document.querySelector('#nm-buddy .nmb-size-grip');
    g.style.setProperty('display', 'block', 'important');
    g.style.setProperty('visibility', 'visible', 'important');
    g.style.setProperty('opacity', '1', 'important');
  });
  // Standing on a card mid-window, where its handle is in reach (hanging
  // from the tab bar, the bar covers it).
  await page.evaluate(() => {
    const bar = nameMarkBuddyLedges().bottom;
    nameMarkBuddyAct('');
    nameMarkBuddyMoveTo(document.getElementById('nm-buddy'), { x: 700, y: Math.round((bar ? bar.top : innerHeight) - NMB_FEET + 1), pose: 'stand', kind: 'bar' }, true);
  });
  await page.waitForTimeout(1200);
  const state = () => page.evaluate(() => ({ scale: nmb.scale, kept: localStorage.getItem('avatar-buddy-size'), select: document.getElementById('avatar-buddy-size').value, viewer: !!document.querySelector('.nm-viewer') }));
  const grip = async () => {
    const face = await page.evaluate(() => { const r = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.move(face[0], face[1]);
    await page.waitForTimeout(300);
    return page.evaluate(() => { const r = document.querySelector('#nm-buddy .nmb-size-grip').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, getComputedStyle(document.querySelector('#nm-buddy .nmb-size-grip')).visibility]; });
  };
  const size = (s) => page.evaluate((s) => { nameMarkBuddySetSize(s, true); }, s);
  await size(1.4);
  await page.waitForTimeout(300);
  let [gx, gy, vis] = await grip();
  out.gripVisible = vis;
  out.hit = await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return [x, y, JSON.stringify(document.getElementById('nm-buddy').getBoundingClientRect()), e?.className?.baseVal ?? e?.className, getComputedStyle(document.querySelector('#nm-buddy .nmb-size-grip')).pointerEvents, document.getElementById('nm-buddy').dataset.pose]; }, [gx, gy]);
  // One press: no reset.
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(500);
  out.single = await state();
  if (out.single.scale !== 1.4) fails.push(`a single press changed the size to ${out.single.scale}`);
  // A drag then a press: not a double.
  await page.mouse.down();
  await page.mouse.move(gx + 30, gy - 30, { steps: 5 });
  await page.mouse.up();
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(500);
  out.dragThenPress = await state();
  if (out.dragThenPress.scale === 1) fails.push('a drag then a press reset it');
  // Mouse double-click.
  await size(1.4);
  await page.waitForTimeout(300);
  [gx, gy] = await grip();
  await page.evaluate(() => { window.__pd = []; const g = document.querySelector('#nm-buddy .nmb-size-grip'); for (const t of ['pointerdown', 'pointerup', 'dblclick']) g.addEventListener(t, (e) => window.__pd.push([t, Math.round(e.timeStamp), e.button, e.clientX, e.clientY]), true); });
  await page.mouse.dblclick(gx, gy);
  out.events = await page.evaluate(([x, y]) => [window.__pd, x, y, JSON.stringify(document.querySelector('#nm-buddy .nmb-size-grip').getBoundingClientRect()), (() => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '#' + e.id + '.' + (e.getAttribute('class') || '') + ' in ' + (e.closest('[id]')?.id || '') : 'none'; })(), document.querySelectorAll('.nmb-size-grip').length, document.getElementById('nm-buddy').dataset.pose, getComputedStyle(document.querySelector('#nm-buddy .nmb-size-grip')).pointerEvents, document.getElementById('nm-buddy').className, getComputedStyle(document.getElementById('nm-buddy-band')).display, document.getElementById('nm-buddy-band').getBoundingClientRect().height], [gx, gy]);
  await page.waitForTimeout(1100);
  out.dblclick = await state();
  if (out.dblclick.scale !== 1 || out.dblclick.kept !== '1' || out.dblclick.select !== '1') fails.push(`double-click: ${JSON.stringify(out.dblclick)}`);
  if (out.dblclick.viewer) fails.push('double-click on the handle opened the large view');
  out.eased = await page.evaluate(() => getComputedStyle(document.querySelector('#nm-buddy .nm-buddy-face')).scale);
  // Double tap.
  await size(1.4);
  await page.waitForTimeout(300);
  [gx, gy] = await grip();
  await page.evaluate(() => { window.__pd = []; const g = document.querySelector('#nm-buddy .nmb-size-grip'); for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'click']) g.addEventListener(t, (e) => window.__pd.push([t, e.pointerType, Math.round(e.timeStamp)]), true); });
  await page.touchscreen.tap(gx, gy);
  await page.waitForTimeout(120);
  await page.touchscreen.tap(gx, gy);
  await page.waitForTimeout(1100);
  out.doubleTap = await state();
  out.tapEvents = await page.evaluate(([x, y]) => [window.__pd, (() => { const e = document.elementFromPoint(x, y); return e ? e.tagName + '.' + (e.getAttribute('class') || '') : 'none'; })()], [gx, gy]);
  if (out.doubleTap.scale !== 1 || out.doubleTap.kept !== '1') fails.push(`double tap: ${JSON.stringify(out.doubleTap)}`);
  if (out.doubleTap.viewer) fails.push('double tap on the handle opened the large view');
  out.title = await page.evaluate(() => document.querySelector('#nm-buddy .nmb-size-grip').title);
  console.log(JSON.stringify(out));
  await browser.close();
  console.log(fails.length ? `FAIL\n  ${fails.join('\n  ')}` : 'ok');
  process.exit(fails.length ? 1 : 0);
})();
