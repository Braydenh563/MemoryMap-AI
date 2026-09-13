// INBOX 167: a middle-button drag pans the board, with the press's default
// (the browser's autoscroll on Windows) prevented. As numbers.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node wbpan.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const box = await page.evaluate(async () => {
    const v = document.getElementById('library-view-whiteboard');
    if (!v.offsetParent) for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== v);
    await initWhiteboard(); wbShowCanvasView(); await fetchWhiteboardState(); await new Promise((r) => setTimeout(r, 400));
    const c = document.getElementById('whiteboard-container');
    window.__prevented = null;
    // Capture phase on the window, read after dispatch: d3-zoom stops immediate propagation on the container.
    window.addEventListener('mousedown', (e) => { if (e.button === 1) queueMicrotask(() => { window.__prevented = e.defaultPrevented; }); }, true);
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: Math.round(r.width), before: d3.zoomTransform(c).x };
  });
  await page.mouse.move(box.x, box.y);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(box.x + 150, box.y + 60, { steps: 20 });
  await page.mouse.up({ button: 'middle' });
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => ({ x: d3.zoomTransform(document.getElementById('whiteboard-container')).x, prevented: window.__prevented }));
  console.log(`167 middle pan  container ${box.w}px wide, transform.x ${box.before} to ${after.x}, mousedown default prevented ${after.prevented}`);
  await browser.close();
  if (box.w > 0 && after.x - box.before < 140) { console.log('FAIL: no pan'); process.exit(1); }
  if (after.prevented !== true) { console.log('FAIL: middle mousedown not prevented'); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
