// The quick-nav chord, driven (the owner's evening batch: the "m" hint was a
// broken toast and should be a whole-screen subtle guide, plus three new
// second keys).
//
// Measures rather than looks: the guide's box against the viewport, whether
// any of its rows wrap (the exact fault in the screenshot was a pair split
// across two lines), that it takes no pointer events, that it goes away when
// the chord resolves, and that each new second key does what it says.
//
//   BASE=http://127.0.0.1:8795 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/chordguide.js
const { boot } = require('./lib.js');

(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot(W < 600 ? { viewport: { width: W, height: 844 }, hasTouch: true, isMobile: true } : {});
  let bad = 0;

  await page.keyboard.press('m');
  await page.waitForTimeout(200);
  const shown = await page.evaluate(() => {
    const g = document.getElementById('chord-guide');
    if (!g || g.classList.contains('hidden')) return null;
    const r = g.getBoundingClientRect();
    const rows = [...g.querySelectorAll('.chord-guide-row')];
    return {
      box: `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`,
      coversViewport: r.width >= innerWidth - 1 && r.height >= innerHeight - 1,
      rows: rows.length,
      // A row taller than one line of its own text is a wrapped pair.
      wrapped: rows.filter((row) => row.getBoundingClientRect().height > parseFloat(getComputedStyle(row).lineHeight) * 2).length,
      pointerEvents: getComputedStyle(g).pointerEvents,
      keys: rows.map((row) => `${row.querySelector('kbd').textContent}:${row.querySelector('.rich-picker-label').textContent}`).join(' '),
      // INBOX 484: the keycaps are one column per group (one right edge), every
      // row has an icon tile, the panel is on the popover shell, and the hint
      // line is there.
      keyEdges: [...g.querySelectorAll('.chord-guide-group')].map((grp) =>
        new Set([...grp.querySelectorAll('.rich-picker-keys')].map((k) => Math.round(k.getBoundingClientRect().right))).size),
      tiles: rows.filter((row) => row.querySelector('.rich-picker-tile i.ph')).length,
      radius: getComputedStyle(g.querySelector('.chord-guide-panel')).borderTopLeftRadius,
      hint: !!g.querySelector('.chord-guide-hint'),
      here: [...g.querySelectorAll('.chord-guide-row.is-here')].map((r) => r.textContent.trim()),
      panelFits: (() => { const p = g.querySelector('.chord-guide-panel').getBoundingClientRect(); return p.left >= 0 && p.right <= innerWidth && p.top >= 0 && p.bottom <= innerHeight; })(),
      atPoint: (() => {
        const el = document.elementFromPoint(Math.round(innerWidth / 2), Math.round(innerHeight / 2));
        return el ? el.id || el.className || el.tagName : 'none';
      })(),
    };
  });
  if (!shown) {
    console.log('FAIL: the guide did not appear on "m"');
    bad += 1;
  } else {
    console.log(`guide: ${shown.box}, covers the viewport: ${shown.coversViewport}, ${shown.rows} rows, wrapped rows: ${shown.wrapped}, pointer-events: ${shown.pointerEvents}`);
    console.log(`   ${shown.keys}`);
    console.log(`   element under the centre of the screen: ${shown.atPoint}`);
    console.log(`   key edges per group: ${shown.keyEdges}, tiles: ${shown.tiles}, radius: ${shown.radius}, hint: ${shown.hint}, here: ${shown.here}, fits: ${shown.panelFits}`);
    if (shown.rows !== 12) { bad += 1; console.log('   FAIL: expected twelve entries (seven tabs, five actions)'); }
    if (shown.keyEdges.some((n) => n !== 1)) { bad += 1; console.log('   FAIL: the keycaps do not share one column'); }
    if (shown.tiles !== shown.rows) { bad += 1; console.log('   FAIL: a row has no icon'); }
    if (!shown.hint || shown.here.length !== 1 || !shown.panelFits) { bad += 1; console.log('   FAIL: hint line, the current tab, or the panel off screen'); }
    if (shown.wrapped) { bad += 1; console.log('   FAIL: a key and its label are split across lines'); }
    if (shown.pointerEvents !== 'none') { bad += 1; console.log('   FAIL: the guide takes pointer events'); }
    if (!shown.coversViewport) { bad += 1; console.log('   FAIL: the guide is not full screen'); }
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  }

  // The chord resolves: the guide goes, and the second key acts.
  await page.keyboard.press('t');
  await page.waitForTimeout(500);
  const afterTab = await page.evaluate(() => ({
    hidden: (document.getElementById('chord-guide') || {}).className || 'absent',
    tab: localStorage.getItem('activeTab'),
  }));
  console.log(`after "m t": activeTab=${afterTab.tab}, guide class="${afterTab.hidden}"`);
  if (afterTab.tab !== 'timeline') { bad += 1; console.log('   FAIL: m then t did not reach the timeline'); }
  if (!String(afterTab.hidden).includes('hidden')) { bad += 1; console.log('   FAIL: the guide stayed up after the chord resolved'); }

  // The three new second keys.
  for (const [key, check, label] of [
    ['s', () => !document.getElementById('settings-modal').classList.contains('hidden'), 'settings'],
    ['q', () => !document.getElementById('sketch-overlay').classList.contains('hidden'), 'quick sketch'],
  ]) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await page.keyboard.press('m');
    await page.waitForTimeout(150);
    await page.keyboard.press(key);
    await page.waitForTimeout(800);
    const open = await page.evaluate(check);
    console.log(`after "m ${key}": ${label} open = ${open}`);
    if (!open) { bad += 1; console.log(`   FAIL: m then ${key} did not open ${label}`); }
  }
  await page.keyboard.press('Escape');

  console.log(bad ? `FAIL: ${bad} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
