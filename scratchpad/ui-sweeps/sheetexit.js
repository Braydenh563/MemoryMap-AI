// A phone action sheet (a kebab at 390 via `openSheet`) leaves with the same
// short exit a menu has: Escape and a press outside both fade it over
// --motion-fast instead of removing it in one frame, and nothing animates when
// motion is reduced. Asserts, per path: the overlay is still in the DOM with
// `.sheet-leaving` and opacity < 1 mid-exit, is gone after, takes no press
// while leaving, and the menu is back home (hidden, in its wrap) afterwards.
// Also run with the OS hint on and with Interface animations "reduced", where
// the removal must be immediate.
const { boot } = require('./lib.js');
let fails = 0;
const ok = (c, m) => { if (!c) fails++; console.log(`${c ? 'OK  ' : 'FAIL'} ${m}`); };

async function one(path, reduce, viaSetting) {
  const { browser, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  if (viaSetting) await page.evaluate(() => { document.documentElement.dataset.motion = 'reduced'; });
  // The chat head's ⋯ is a `kebabMenu`: a note card has none on a phone (a
  // swipe and the note page instead).
  await page.evaluate(() => switchTab('chat'));
  await page.waitForSelector('#chat-actions-menu button[aria-haspopup]', { timeout: 15000 });
  await page.waitForTimeout(500);
  const label = `${path}${reduce ? ' (OS reduced)' : ''}${viaSetting ? ' (setting reduced)' : ''}`;
  await page.tap('#chat-actions-menu button[aria-haspopup]');
  await page.waitForSelector('.sheet-overlay[data-sheet="action-menu"]', { timeout: 5000 });
  await page.waitForTimeout(300);
  const homeId = await page.evaluate(() => document.querySelector('.sheet-overlay .action-menu').parentElement.className);
  ok(homeId.includes('action-menu-card'), `${label}: sheet open with the menu inside`);
  // Trigger the exit and sample on the next frames.
  if (path === 'escape') await page.keyboard.press('Escape');
  else await page.touchscreen.tap(195, 20);
  const mid = await page.evaluate(() => new Promise((resolve) => {
    const t0 = performance.now();
    const samples = [];
    const tick = () => {
      const o = document.querySelector('.sheet-overlay');
      const t = Math.round(performance.now() - t0);
      samples.push(o ? { t, leaving: o.classList.contains('sheet-leaving'), op: +getComputedStyle(o).opacity, pe: getComputedStyle(o).pointerEvents } : { t, gone: true });
      if (!o || performance.now() - t0 > 600) return resolve(samples);
      requestAnimationFrame(tick);
    };
    tick();
  }));
  const first = mid[0];
  const exitMs = (mid.find((s) => s.gone) || {}).t;
  console.log(`  ${label}: first=${JSON.stringify(first)} gone at ${exitMs}ms, ${mid.length} samples`);
  if (reduce || viaSetting) {
    ok(first.gone || exitMs < 60, `${label}: removed at once (no exit)`);
  } else {
    ok(first.leaving === true, `${label}: still drawn with .sheet-leaving on the first frame`);
    ok(mid.some((s) => s.op > 0 && s.op < 1), `${label}: opacity passes through a value in (0,1)`);
    ok(first.pe === 'none', `${label}: takes no press while leaving`);
    ok(exitMs >= 100 && exitMs <= 320, `${label}: gone after ${exitMs}ms (--motion-fast 120ms + slack)`);
  }
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => {
    const menu = document.querySelector('#chat-actions-menu .action-menu');
    return { sheets: document.querySelectorAll('.sheet-overlay').length, menuHidden: !!menu && menu.classList.contains('hidden'), menuInWrap: !!menu && !!menu.closest('#chat-actions-menu') && !menu.closest('.sheet-overlay') };
  });
  ok(after.sheets === 0 && after.menuHidden && after.menuInWrap, `${label}: gone, menu home and hidden ${JSON.stringify(after)}`);
  await browser.close();
}

(async () => {
  for (const p of ['escape', 'outside']) await one(p, false, false);
  await one('escape', true, false);
  await one('outside', false, true);
  console.log(fails ? `${fails} FAILED` : 'ALL OK');
  process.exit(fails ? 1 : 0);
})();
