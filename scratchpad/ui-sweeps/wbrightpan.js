// INBOX 258: a right-drag pans the board, and does not eat a right-click
// that means something. As numbers.
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node wbrightpan.js
//
// **The gesture is not built. This is its acceptance test, written first.**
// It was built once on 2026-09-19 and taken back out: the pan itself is four
// lines in `wbZoomFilter` and measured clean at 150px, but the half that
// matters, not opening a context menu at the end of a drag, could not be
// measured reliably here. Two runs of identical code disagreed about whether
// Chromium dispatches `contextmenu` after a right-drag at all, and the menu
// that does arrive is dispatched at the `<section>` around the board rather
// than at anything inside it, so it cannot be scoped by its target either.
// Shipping a new gesture on the surface that carries the app's only context
// menu, with that half unverified, is the shape of change this project has
// spent a session undoing. Whoever builds it: make this file pass, on a
// board that has at least one card.
//
// Three things have to hold at once, and the second and third are why this
// was an INBOX entry rather than a patch. A right-drag on empty canvas pans,
// and the context menu that would open on its release does not. A right
// *click* on empty canvas, with no drag, still opens whatever it opened
// before. And a right-press on a card is not a pan at all, because that is
// where the board's own menus live.
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const box = await page.evaluate(async () => {
    const view = document.getElementById('library-view-whiteboard');
    if (!view.offsetParent) {
      for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== view);
    }
    await initWhiteboard();
    wbShowCanvasView();
    await fetchWhiteboardState();
    await new Promise((r) => setTimeout(r, 400));
    const container = document.getElementById('whiteboard-container');
    window.__menus = 0;
    //: Counted on the window in the *bubble* phase, which is where a menu
    //: that was not suppressed would arrive: the suppression runs on the
    //: container in the capture phase.
    window.addEventListener('contextmenu', (e) => { window.__menus += 1; e.preventDefault(); });
    const rect = container.getBoundingClientRect();
    const card = document.querySelector('#whiteboard-container .node-card');
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      w: Math.round(rect.width),
      before: d3.zoomTransform(container).x,
      card: card ? (() => { const r = card.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })() : null,
    };
  });

  // 1. Right-drag on empty canvas: it pans, and eats its own menu.
  await page.mouse.move(box.x, box.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(box.x + 150, box.y + 60, { steps: 20 });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(300);
  const dragged = await page.evaluate(() => ({
    x: d3.zoomTransform(document.getElementById('whiteboard-container')).x,
    menus: window.__menus,
  }));
  const moved = dragged.x - box.before;
  console.log(`258 right drag   container ${box.w}px wide, transform.x ${box.before} to ${dragged.x} (${moved.toFixed(0)}px), menus opened ${dragged.menus}`);

  // 2. Right-click with no drag: the menu still opens.
  await page.evaluate(() => { window.__menus = 0; });
  await page.mouse.move(box.x, box.y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.up({ button: 'right' });
  await page.waitForTimeout(300);
  const clicked = await page.evaluate(() => ({
    x: d3.zoomTransform(document.getElementById('whiteboard-container')).x,
    menus: window.__menus,
  }));
  console.log(`258 right click  transform.x unchanged ${clicked.x === dragged.x}, menus opened ${clicked.menus}`);

  // 3. Right-press on a card is not a pan.
  let onCard = null;
  if (box.card) {
    await page.evaluate(() => { window.__menus = 0; });
    await page.mouse.move(box.card.x, box.card.y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(box.card.x + 120, box.card.y + 40, { steps: 16 });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(300);
    onCard = await page.evaluate(() => d3.zoomTransform(document.getElementById('whiteboard-container')).x);
    console.log(`258 on a card    transform.x ${clicked.x} to ${onCard}, moved ${(onCard - clicked.x).toFixed(0)}px`);
  } else {
    console.log('258 on a card    skipped: this board has no card to press');
  }

  await browser.close();
  const findings = [];
  if (!(moved > 140)) findings.push(`a right-drag moved the board ${moved.toFixed(0)}px, expected about 150`);
  if (dragged.menus !== 0) findings.push(`a right-drag opened ${dragged.menus} context menu(s)`);
  if (clicked.menus < 1) findings.push('a right-click with no drag opened no context menu');
  if (onCard !== null && Math.abs(onCard - clicked.x) > 2) {
    findings.push(`a right-drag on a card panned the board ${(onCard - clicked.x).toFixed(0)}px`);
  }
  for (const line of findings) console.log(`    ${line}`);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
