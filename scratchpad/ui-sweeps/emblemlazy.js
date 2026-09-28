// The app's mark is drawn when its slot is shown, not before, and is drawn
// then (phone-shell.js `renderEmblemWhenShown`). After the unlock on Notes:
// the hidden slots have no canvas; then the About pane, the chat's welcome
// and the map's empty state are shown in turn and each must have its canvas
// within a second, turning (`emblem-spin`), in the current accent (a colour
// change while it was hidden is not drawn in the old one).
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/emblemlazy.js
const { boot } = require('./lib.js');

const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
};
const drawn = (page, id) => page.evaluate((i) => {
  const c = document.querySelector(`#${i} canvas`);
  return c ? { spin: c.classList.contains('emblem-spin'), w: c.width } : null;
}, id);

(async () => {
  const { browser, page } = await boot({});
  try {
    await page.evaluate(() => { switchTab('notes'); });
    await page.waitForTimeout(1500);
    const hidden = await page.evaluate(() => ['onboarding-emblem', 'graph-empty-emblem', 'about-emblem'].filter((i) => document.querySelector(`#${i} canvas`)));
    check('slots that are hidden after the unlock are not drawn', hidden.length === 0, hidden.join(', ') || 'none drawn');

    await page.evaluate(() => openSettingsModal('about'));
    await page.waitForTimeout(1200);
    const about = await drawn(page, 'about-emblem');
    check('About: drawn once shown, and turning', about && about.spin, JSON.stringify(about));
    await page.keyboard.press('Escape');

    // The map's empty state, shown by filtering every note off the map.
    await page.evaluate(async () => {
      switchTab('graph');
      const data = await apiJson('/graph');
      for (const n of data.nodes) if (n.category) graphHiddenCategories.add(n.category);
      renderGraph();
    });
    await page.waitForTimeout(2000);
    const graph = await drawn(page, 'graph-empty-emblem');
    check('the map\'s empty state: drawn once shown, and turning', graph && graph.spin, JSON.stringify(graph));
  } finally {
    await browser.close();
  }
  const failed = results.filter((x) => !x).length;
  console.log(`${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.stack); process.exit(1); });
