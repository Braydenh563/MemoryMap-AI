// INBOX 524: the Quick access manager. Opens it, toggles several, reorders by
// keyboard (Alt+Down) and by drag, searches, saves once with Done, and checks
// what was stored. W / THEME as the other sweeps.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
  const shot = (n) => page.screenshot({ path: (process.env.SCRATCH || '.') + `/shots/${n}-${W}-${process.env.THEME || 'light'}.png` });
  const stored = () => page.evaluate(async () => (await apiJson('/preferences')).dashboard_quick_access);
  const ids = () => page.$$eval('.quick-manage-list:first-of-type .quick-manage-item, #dash-quicklinks', () => 0).catch(() => 0);
  const added = () => page.$$eval('.quick-manage-item', (els) => els.filter((e) => e.draggable).map((e) => e.dataset.id));
  await page.evaluate(() => switchTab('dashboard')); await page.waitForTimeout(800);
  await page.evaluate(() => { quickEditing = true; renderQuickLinks(); });
  await page.waitForTimeout(800);
  console.log('edit tiles', await page.$$eval('.quick-edit-tile', (e) => e.length), 'add tile', await page.$$eval('.quick-edit-add', (e) => e.length));
  await page.click('.quick-edit-add'); await page.waitForTimeout(400);
  await shot('qm-open');
  console.log('added', JSON.stringify(await added()));
  const m = await page.evaluate(() => {
    const card = document.querySelector('.quick-pick'), sc = document.querySelector('.quick-manage-scroll');
    const r = card.getBoundingClientRect();
    return { card: [Math.round(r.width), Math.round(r.height)], scrollH: [sc.scrollHeight, sc.clientHeight], overflowX: card.scrollWidth > card.clientWidth,
      checked: [...document.querySelectorAll('.note-picker-box')].filter((b) => b.checked).length, boxes: document.querySelectorAll('.note-picker-box').length,
      tabStops: [...document.querySelectorAll('.note-picker-box')].filter((b) => b.tabIndex === 0).length, active: document.activeElement.className };
  });
  console.log('open', JSON.stringify(m));
  // keyboard: into the list, Alt+Down on the first added
  await page.keyboard.press('ArrowDown');
  console.log('focus on first box', await page.evaluate(() => document.activeElement.className));
  await page.keyboard.press('Alt+ArrowDown');
  console.log('after Alt+Down', JSON.stringify(await added()), 'focus kept', await page.evaluate(() => document.activeElement.closest('.quick-manage-item')?.dataset.id));
  // uncheck the focused one (Space) then check two others by click
  await page.keyboard.press('Space');
  console.log('after Space', JSON.stringify(await added()));
  const more = () => page.$$('ul[aria-label="More commands"] .note-picker-row');
  await (await more())[0].click(); await (await more())[1].click();
  console.log('after two clicks', JSON.stringify(await added()));
  // drag the last added to the top
  const items = await page.$$('ul[aria-label="On your dashboard"] .quick-manage-item');
  const a = await items[items.length - 1].boundingBox(), b = await items[0].boundingBox();
  await page.mouse.move(a.x + 20, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + 40, b.y + 4, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(200);
  console.log('after drag', JSON.stringify(await added()));
  await page.fill('.quick-pick-search', 'graph'); await page.waitForTimeout(200);
  console.log('search graph rows', await page.$$eval('.quick-manage-item', (e) => e.map((x) => x.dataset.id)));
  await shot('qm-search');
  await page.fill('.quick-pick-search', '');
  await shot('qm-state');
  const draft = await added();
  console.log('stored before Done', JSON.stringify(await stored()));
  await page.click('.quick-manage-foot .accent'); await page.waitForTimeout(800);
  console.log('stored after Done', JSON.stringify(await stored()), 'same as draft', JSON.stringify(await stored()) === JSON.stringify(draft));
  console.log('tiles in row', await page.$$eval('.quick-edit-tile', (e) => e.map((x) => x.dataset.id)));
  await shot('qm-after');
  // the cap: fill to 8 then try a ninth
  await page.click('.quick-edit-add'); await page.waitForTimeout(300);
  for (let i = 0; i < 8; i++) { const rows = await page.$$('ul[aria-label="More commands"] .note-picker-row'); if (!rows.length || (await added()).length >= 8) break; await rows[0].click(); }
  console.log('filled', (await added()).length);
  const rows = await page.$$('ul[aria-label="More commands"] .note-picker-row'); if (rows.length) await rows[0].click();
  console.log('ninth refused', (await added()).length, 'toast', await page.$$eval('.toast', (e) => e.map((x) => x.textContent.trim()).slice(-1)));
  await shot('qm-full');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  console.log('esc discards', JSON.stringify(await stored()) === JSON.stringify(draft));
  await browser.close();
})();
