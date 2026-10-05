// WORLD_CLASS_PLAN section 17 row 3: Settings, Filing style. The select is in
// the same grid as its sibling setting rows (label left, control right), at
// the same height as the other selects, saves through PUT /preferences, and
// reads back after a reload of the pane.
//
//   BASE=http://127.0.0.1:8841 WIDTH=390 THEME=dark \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/filingstyle.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluate(() => openSettingsModal('tasks', 'pref-filing-style'));
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => {
    const select = document.getElementById('pref-filing-style');
    const row = document.getElementById('filing-style-row');
    const other = document.getElementById('perf-mode');
    const r = select.getBoundingClientRect();
    const rr = row.getBoundingClientRect();
    const pane = row.closest('.settings-section').getBoundingClientRect();
    const sibling = document.getElementById('settings-manage-categories').getBoundingClientRect();
    return {
      visible: !!select.offsetParent,
      options: [...select.options].map((o) => o.value).join(','),
      value: select.value,
      h: Math.round(r.height),
      siblingH: Math.round(sibling.height),
      right: Math.round(rr.right),
      paneRight: Math.round(pane.right),
      selectInRow: r.left >= rr.left - 1 && r.right <= rr.right + 1,
      sideways: document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth,
    };
  });
  console.log(JSON.stringify(m));
  check('the select shows, with three styles, by topic first', m.visible && m.options === 'topic,project,time' && m.value === 'topic');
  check('it sits inside its row and the pane', m.selectInRow && m.right <= m.paneRight + 1);
  check('its height matches the Manage categories button beside it', Math.abs(m.h - m.siblingH) <= 4, `${m.h} vs ${m.siblingH}`);
  check('nothing scrolls sideways', !m.sideways);

  await page.selectOption('#pref-filing-style', 'project');
  await page.waitForTimeout(800);
  const saved = await page.evaluate(async () => (await apiJson('/preferences')).filing_style);
  check('choosing By project saves it', saved === 'project', saved);
  await page.evaluate(() => { closeSettingsModal?.(); });
  await page.evaluate(() => openSettingsModal('tasks', 'pref-filing-style'));
  await page.waitForTimeout(1000);
  const again = await page.evaluate(() => document.getElementById('pref-filing-style').value);
  check('and shows it again on reopening', again === 'project', again);
  await page.selectOption('#pref-filing-style', 'topic');
  await page.waitForTimeout(500);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
})();
