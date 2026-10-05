// INBOX 436: the dashboard's one menu, driven. Opens the ⋯, lists its rows,
// screenshots it open, then walks Edit layout -> Done and View -> Compact ->
// Full, and New note, checking each lands where it says.
//
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=. SHOTS=../shots/dashboard-436 node dash436menu.js
const { boot } = require('./lib.js');

let failures = 0;
const check = (label, ok, detail = '') => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`);
};

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const phone = width < 600;
  const { browser, page } = await boot({
    viewport: { width, height: phone ? 844 : 900 },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  await page.evaluate(async () => {
    const names = (typeof allSkills === 'function' ? allSkills() : []).slice(0, 2).map((s) => s.name);
    if (names.length) localStorage.setItem('recentSkills', JSON.stringify(names));
    await switchTab('dashboard');
    await renderDashboard();
  });
  await page.waitForTimeout(1500);
  const opener = page.locator('#dash-more > .menu-wrap > button');
  check('one opener', (await opener.count()) === 1);
  check('opener is named', (await opener.getAttribute('aria-label')) === 'More actions');
  await opener.click();
  await page.waitForTimeout(500);
  const rows = await page.evaluate(() => {
    const list = document.querySelector('.sheet-overlay:not(.hidden) .action-menu, .action-menu:not(.hidden)');
    if (!list) return null;
    return [...list.querySelectorAll(':scope > .menu-item, :scope > .menu-group > .menu-item, :scope > .menu-sep')]
      .map((el) => (el.classList.contains('menu-sep') ? '----' : el.textContent.trim()));
  });
  console.log(JSON.stringify(rows));
  const tiles = await page.$$eval('#dash-quicklinks .quick-action', (b) => b.map((x) => x.querySelector('.quick-link-label').textContent));
  check('five Start something tiles', tiles.join('|') === 'New note|Ask AI|Sketch|Remind me|Meeting notes', tiles.join('|'));
  for (const want of ['All skills', 'Tools & features', 'Commands', 'Widgets', 'Edit layout']) {
    check(`menu has ${want}`, Boolean(rows && rows.some((r) => r.includes(want))));
  }
  check('menu has Continue', Boolean(rows && rows.some((r) => r.startsWith('Continue:'))));
  check('menu is grouped', Boolean(rows && rows.filter((r) => r === '----').length >= 3));
  check('menu does not repeat the tiles', Boolean(rows && !rows.includes('Ask AI')));
  if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/after-menu-${width}-${process.env.THEME || 'light'}.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Edit layout, then Done.
  await page.evaluate(() => $('dash-edit').click());
  await page.waitForTimeout(600);
  const editing = await page.evaluate(() => ({
    bar: !document.getElementById('dash-editbar').classList.contains('hidden'),
    done: document.getElementById('dash-edit').getBoundingClientRect().height,
    controls: document.querySelectorAll('#dash-grid .dash-widget .entry-actions').length,
  }));
  check('edit line shows', editing.bar && editing.done > 0, JSON.stringify(editing));
  await page.click('#dash-edit');
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({
    bar: !document.getElementById('dash-editbar').classList.contains('hidden'),
    focus: document.activeElement && document.activeElement.closest('#dash-more') !== null,
  }));
  check('Done closes it and hands focus to the menu', !after.bar && after.focus, JSON.stringify(after));

  if (!phone) {
    await page.evaluate(() => applyDashDensity('compact'));
    await page.waitForTimeout(300);
    const d = await page.evaluate(() => document.getElementById('tab-dashboard').dataset.density);
    check('View compact applies', d === 'compact', d);
    await page.evaluate(() => applyDashDensity('full'));
  }

  // New note lands on Capture with the box focused.
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(400);
  await page.click('#dash-quicklinks .quick-link-tinted');
  await page.waitForTimeout(1200);
  const landed = await page.evaluate(() => ({
    tab: localStorage.getItem('activeTab'),
    focus: document.activeElement && (document.activeElement.id || document.activeElement.className),
  }));
  check('New note opens Capture', landed.tab === 'notes', JSON.stringify(landed));
  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'all ok');
  process.exit(failures ? 1 : 0);
})();
