// INBOX 66, measured rather than reasoned: "I clicked to view a document
// while in the graph fullscreen" and the lightbox appeared only after
// leaving it.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=/opt/node22/lib/node_modules \
//     BASE=http://127.0.0.1:8931 node scratchpad/ui-sweeps/graphfslightbox.js
//
// The entry blamed the Fullscreen API; this app's full screen is a class
// (`.graph-fullscreen`, `position: fixed; z-index: 1000`), so what decides is
// stacking, and stacking is a thing a probe can read. The question is not
// "does the element exist" (it always did) but "is it the thing under the
// pointer in the middle of the screen", which is what the person was
// clicking on.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2500);

  const before = await page.evaluate(() => {
    document.getElementById('graph-fullscreen')?.click();
    return null;
  });
  await page.waitForTimeout(900);
  const fs = await page.evaluate(() => {
    const card = document.getElementById('graph-card');
    return {
      on: card.classList.contains('graph-fullscreen'),
      bodyClass: document.body.classList.contains('graph-fullscreen-on'),
      cardZ: getComputedStyle(card).zIndex,
      cardRect: (() => {
        const r = card.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      })(),
    };
  });

  const light = await page.evaluate(() => {
    // A one-item lightbox is the same object the node panel's attachment
    // opens; what it holds does not matter to a stacking question.
    openLightbox([{ filename: 'A picture.png', getUrl: () => '/icon-512.png' }], 0);
    const box = document.querySelector('.lightbox');
    if (!box) return { built: false };
    const r = box.getBoundingClientRect();
    const mid = document.elementFromPoint(
      Math.round(window.innerWidth / 2),
      Math.round(window.innerHeight / 2)
    );
    return {
      built: true,
      z: getComputedStyle(box).zIndex,
      w: Math.round(r.width),
      h: Math.round(r.height),
      visible: box.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true }),
      // The whole question: what would the click in the middle of the screen
      // land on now?
      midPointIsInside: Boolean(mid && box.contains(mid)),
      midPoint: mid ? mid.tagName + (mid.className ? '.' + String(mid.className).split(' ')[0] : '') : 'null',
      closeReachable: Boolean(document.querySelector('.lightbox-close')?.getClientRects().length),
    };
  });

  // And it closes without having to leave full screen first.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    lightboxGone: !document.querySelector('.lightbox'),
    stillFullscreen: document.getElementById('graph-card').classList.contains('graph-fullscreen'),
  }));

  const ok = (v) => (v ? 'PASS' : 'FAIL');
  console.log(JSON.stringify({ fullscreen: fs, lightbox: light, afterEscape: after, errors: errs }, null, 1));
  console.log(`fullscreen on: ${ok(fs.on)}`);
  console.log(`lightbox over the fullscreen card (${light.z} vs ${fs.cardZ}): ${ok(Number(light.z) > Number(fs.cardZ))}`);
  console.log(`a click in the middle of the screen lands in the lightbox: ${ok(light.midPointIsInside)} (${light.midPoint})`);
  console.log(`Escape closes it and leaves full screen on: ${ok(after.lightboxGone && after.stillFullscreen)}`);
  await browser.close();
  process.exit(
    fs.on && Number(light.z) > Number(fs.cardZ) && light.midPointIsInside && after.lightboxGone && after.stillFullscreen
      ? 0
      : 1
  );
})();
