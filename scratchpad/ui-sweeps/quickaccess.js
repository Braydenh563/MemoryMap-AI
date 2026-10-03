// INBOX 461: the dashboard's Quick access row, driven end to end.
//
//   BASE=http://127.0.0.1:8824 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     SCRATCH=. WIDTH=1440 THEME=dark node quickaccess.js
//
// Default five, Customise, add from the picker, move by keyboard, remove,
// reset, and a reload that keeps the arrangement (stored in preferences).
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
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const labels = () => page.$$eval('#dash-quicklinks .quick-link:not(.quick-edit-add) .quick-link-label', (n) => n.map((x) => x.textContent));
  const shot = (name) => process.env.SHOTS && page.screenshot({ path: `${process.env.SHOTS}/qa-${name}-${width}-${process.env.THEME || 'light'}.png` });
  const go = async () => {
    await page.evaluate(async () => {
      await switchTab('dashboard');
      await renderDashboard();
    });
    await page.waitForTimeout(800);
  };
  const clickMenu = async (scope, text) => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    //: Scrolled to first and let settle: Playwright's own scroll-to-click on a
    //: phone's sideways row fires a scroll event that closes a menu opened in
    //: the same frame (menus.js `closeActionMenusOnScroll`); a finger does not.
    const opener = page.locator(`${scope} .menu-wrap > button`).first();
    await opener.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await opener.click();
    await page.waitForTimeout(300);
    await page.locator('.menu-item:visible', { hasText: text }).first().click({ timeout: 4000 }).catch(async (e) => { await page.screenshot({ path: `${process.env.SHOTS}/fail.png` }); throw e; });
    await page.waitForTimeout(500);
  };

  await page.evaluate(async () => { prefsCache = await apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ dashboard_quick_access: [] }) }); });
  await go();
  check('default five', (await labels()).join('|') === 'New note|Ask AI|Sketch|Remind me|Meeting notes', (await labels()).join('|'));
  check('named Quick access', (await page.textContent('#dash-quicklinks .launch-label')) === 'Quick access');
  check('no row menu "Start something"', !(await page.textContent('#dash-quicklinks')).includes('Start something'));
  await shot('default');

  // Customise.
  await clickMenu('#dash-quicklinks .launch-head', 'Customise');
  check('editing: five wrapped tiles + add', (await page.locator('.quick-edit-tile').count()) === 5 && (await page.locator('.quick-edit-add').count()) === 1);
  check('count shown', (await page.textContent('.launch-count')) === '5 of 8');
  await shot('editing');

  // Add from the picker.
  await page.locator('.quick-edit-add').click();
  await page.waitForTimeout(400);
  const rows = await page.locator('.quick-pick .rich-picker-row').count();
  check('picker lists commands', rows > 20, `${rows} rows`);
  check('picker leaves out existing tiles', (await page.locator('.quick-pick .rich-picker-label', { hasText: /^New note$/ }).count()) === 0);
  await shot('picker');
  await page.fill('.quick-pick-search', 'graph');
  await page.waitForTimeout(200);
  const first = await page.locator('.quick-pick .rich-picker-row').first().locator('.rich-picker-label').textContent();
  await page.locator('.quick-pick .rich-picker-row').first().click();
  await page.waitForTimeout(700);
  check('picker closed', (await page.locator('.quick-pick').count()) === 0);
  let now = await labels();
  check('added at the end', now.length === 6 && now[5] === first, now.join('|'));
  check('focus returns to the new tile menu', await page.evaluate(() => document.activeElement?.closest('.quick-edit-tile')?.dataset.id?.length > 0));

  // Move by keyboard: the new tile's menu, Move left.
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.locator('.menu-item:visible', { hasText: 'Move left' }).click();
  await page.waitForTimeout(700);
  now = await labels();
  check('moved left', now[4] === first && now[5] === 'Meeting notes', now.join('|'));
  check('focus survives the redraw', await page.evaluate(() => document.activeElement?.closest('.quick-edit-tile')?.dataset.id?.length > 0));

  // Drag (a pointer; the phone has the menu).
  if (!phone) {
    await page.dragAndDrop('.quick-edit-tile[data-id="meeting-notes"]', '.quick-edit-tile[data-id="ask-ai"]', { targetPosition: { x: 20, y: 30 } });
    await page.waitForTimeout(900);
    now = await labels();
    check('dragged before Ask AI', now.indexOf('Meeting notes') < now.indexOf('Ask AI'), now.join('|'));
  }

  // Remove Sketch.
  await clickMenu('.quick-edit-tile[data-id="sketch"]', 'Remove');
  now = await labels();
  check('removed', !now.includes('Sketch') && now.length === 5, now.join('|'));

  // Done, then reload: the arrangement is stored.
  await page.locator('.launch-done').click();
  await page.waitForTimeout(400);
  check('done leaves editing', (await page.locator('.quick-edit-tile').count()) === 0);
  const arranged = (await labels()).join('|');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const pw = await page.$('#lock-password');
  if (pw && (await pw.isVisible())) {
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
    await page.waitForTimeout(2500);
  }
  await go();
  check('reload keeps it', (await labels()).join('|') === arranged, (await labels()).join('|'));
  await shot('arranged');

  // A tile still runs its command.
  await page.locator('#dash-quicklinks .quick-link', { hasText: first }).first().click();
  await page.waitForTimeout(800);
  const tab = await page.evaluate(() => document.querySelector('.tab-page:not(.hidden)')?.id);
  check('an added tile runs', tab && tab !== 'tab-dashboard', tab);
  await go();

  // Reset.
  await clickMenu('#dash-quicklinks .launch-head', 'Reset to default');
  check('reset', (await labels()).join('|') === 'New note|Ask AI|Sketch|Remind me|Meeting notes', (await labels()).join('|'));

  // Eight at most.
  await page.evaluate(async () => { prefsCache = await apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ dashboard_quick_access: ['new-note', 'ask-ai', 'sketch', 'remind-me', 'meeting-notes', 'tab:graph', 'tab:timeline', 'tab:library'] }) }); });
  await go();
  check('eight tiles', (await labels()).length === 8, (await labels()).join('|'));
  await clickMenu('#dash-quicklinks .launch-head', 'Customise');
  check('no add tile at eight', (await page.locator('.quick-edit-add').count()) === 0);
  check('no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await shot('eight');
  await page.locator('.launch-done').click();
  await page.waitForTimeout(300);
  await shot('eight-done');
  const box = await page.evaluate(() => {
    const row = document.querySelector('#dash-quicklinks .launch-row');
    return { sw: row.scrollWidth, cw: row.clientWidth, h: row.getBoundingClientRect().height };
  });
  console.log('row', JSON.stringify(box));
  await page.evaluate(async () => { prefsCache = await apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ dashboard_quick_access: [] }) }); });

  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  console.log(failures ? `${failures} FAILED` : 'all ok');
  process.exit(failures ? 1 : 0);
})();
