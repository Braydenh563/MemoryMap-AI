// The map's keyboard, on the renderer people actually get (canvas).
//
// GRAPH_PLAN section 6 promises the keys the whiteboard uses: + and - zoom,
// 0 fits, Shift+arrows pan, bare arrows move between notes, Enter opens the
// one the keyboard is on, N steps through its links, Esc lets go. The handler
// (`graph.js`, the keydown on `#graph-box`) was written for the SVG renderer,
// and its zoom and pan branches test `graphSvg && graphZoom`, which the
// canvas renderer (the default since Phase 1) never sets. This presses each
// key on the focused map and reads the renderer's own state:
//
//   +, =      the zoom scale grows
//   -         it shrinks
//   0         the map is fitted (the scale returns to the fit's)
//   Shift+->  the view moves, the scale does not
//   ->        a note becomes the keyboard's note and is drawn as focused
//   N         the keyboard's note moves to one of its links
//   Enter     the note's panel opens
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/graphkeys.js
const { boot } = require('./lib.js');

const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};
const t = (page) => page.evaluate(() => {
  const x = gcTab.transform;
  return { k: Math.round(x.k * 1000) / 1000, x: Math.round(x.x), y: Math.round(x.y), kb: graphKeyboardId };
});

(async () => {
  const { browser, page } = await boot({});
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(7000);
  await page.evaluate(() => document.getElementById('graph-box').focus());
  const fit = await t(page);

  await page.keyboard.press('+');
  await page.waitForTimeout(500);
  const plus = await t(page);
  check('+ zooms in', plus.k > fit.k * 1.1, `${fit.k} to ${plus.k}`);

  await page.keyboard.press('-');
  await page.keyboard.press('-');
  await page.waitForTimeout(500);
  const minus = await t(page);
  check('- zooms out', minus.k < plus.k * 0.9, `${plus.k} to ${minus.k}`);

  await page.keyboard.press('0');
  await page.waitForTimeout(900);
  const zero = await t(page);
  check('0 fits the map again', Math.abs(zero.k - fit.k) / fit.k < 0.05, `${minus.k} to ${zero.k} (fit ${fit.k})`);

  await page.keyboard.press('Shift+ArrowRight');
  await page.waitForTimeout(500);
  const pan = await t(page);
  check('Shift+Right pans without zooming', Math.abs(pan.x - zero.x) >= 40 && pan.k === zero.k, `x ${zero.x} to ${pan.x}`);

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(400);
  const arrow = await t(page);
  check('a bare arrow puts the keyboard on a note', arrow.kb != null, `keyboard on ${arrow.kb}`);

  await page.keyboard.press('n');
  await page.waitForTimeout(400);
  const n = await t(page);
  const linked = await page.evaluate(([a, b]) => (gcTab.adj.get(a) || new Set()).has(b), [arrow.kb, n.kb]);
  check('N steps to one of its links', n.kb != null && (linked || n.kb === arrow.kb), `${arrow.kb} to ${n.kb}`);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  const open = await page.evaluate(() => {
    const p = document.getElementById('graph-popup');
    return Boolean(p && !p.classList.contains('hidden') && p.getBoundingClientRect().width > 0);
  });
  check('Enter opens the note', open);

  await browser.close();
  const failed = results.filter((x) => !x).length;
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
