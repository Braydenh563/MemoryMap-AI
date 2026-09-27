// The conventions a list is expected to keep, driven in Chromium
// (docs/roadmap/agent-remaining/pass2.md, micro-conventions). Seed first:
// seed.js, seed-images.js, seed-file.js, seed-links.js, seed-libtext.js.
//
//   BASE=http://127.0.0.1:8799 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/listconventions.js
//
// Measured before the work: right-click opened the browser's menu on a
// Library card, a Documents row and a note; arrows did nothing on a card;
// Shift+click ticked one box; Ctrl+A with a selection open selected 1,876
// characters of page text; Escape kept the selection; the Library came back
// from another tab at the top. One line per check, PASS or FAIL.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  let failed = 0;
  const check = (name, ok, detail) => {
    if (!ok) failed++;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : ' ' + JSON.stringify(detail)}`);
  };
  await page.evaluate(() => { window.addEventListener('contextmenu', (e) => { window.__ctx = e.defaultPrevented; }); });
  const openMenus = () => page.evaluate(() => [...document.querySelectorAll('.action-menu')]
    .filter((m) => !m.classList.contains('hidden') && m.getBoundingClientRect().height > 0).length);
  const sub = async (i) => {
    await page.evaluate((i) => document.querySelectorAll('#library-subtabs [role=tab]')[i].click(), i);
    await page.waitForTimeout(1200);
  };
  const rightClick = async (sel) => {
    const box = await (await page.$(sel)).boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height - 12, { button: 'right' });
    await page.waitForTimeout(300);
    const r = { prevented: await page.evaluate(() => window.__ctx), menus: await openMenus() };
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    return r;
  };

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(1500);
  await sub(0);
  let r = await rightClick('#library-grid .library-card');
  check('library card right-click opens its menu', r.prevented && r.menus === 1, r);

  await page.evaluate(() => document.querySelector('#library-grid .library-card').focus());
  const ids = [await page.evaluate(() => document.activeElement.dataset.id)];
  await page.keyboard.press('ArrowRight');
  ids.push(await page.evaluate(() => document.activeElement.dataset.id));
  await page.keyboard.press('ArrowDown');
  ids.push(await page.evaluate(() => document.activeElement.dataset.id));
  check('arrow keys move between cards', new Set(ids).size === 3, ids);

  await page.evaluate(() => document.querySelectorAll('#library-grid .library-card-tick').forEach((t) => { t.style.opacity = '1'; }));
  const ticks = await page.$$('#library-grid .library-card-tick');
  await ticks[0].click();
  await ticks[3].click({ modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  const ranged = await page.evaluate(() => document.querySelectorAll('#library-grid .library-card-tick:checked').length);
  check('Shift+click ticks the run between two cards', ranged > 2, ranged);
  await page.mouse.click(5, 450);
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
  const all = await page.evaluate(() => [
    document.querySelectorAll('#library-grid .library-card-tick:checked').length,
    document.querySelectorAll('#library-grid .library-card-tick').length,
    String(window.getSelection()).length,
  ]);
  check('Ctrl+A with a selection open ticks every card, not the page text', all[0] === all[1] && all[2] === 0, all);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('Escape clears the selection', await page.evaluate(() => !document.querySelector('#library-grid .library-card-tick:checked')));

  await page.fill('#library-search', 'zzzqqq');
  await page.waitForTimeout(700);
  check('an empty search offers to clear itself', await page.evaluate(() => {
    const b = document.getElementById('library-empty-clear');
    return Boolean(b && !b.classList.contains('hidden') && b.offsetParent);
  }));
  await page.click('#library-empty-clear');
  await page.waitForTimeout(700);

  await page.mouse.move(700, 600);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => document.getElementById('library-view-documents').scrollTop);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1000);
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => document.getElementById('library-view-documents').scrollTop);
  check('the Library keeps its place across a tab switch', before > 0 && after === before, { before, after });

  await sub(1);
  r = await rightClick('#library-docs-list .doc-list-item');
  check('document row right-click opens its menu', r.prevented && r.menus === 1, r);
  await page.evaluate(() => document.querySelector('#library-docs-list .doc-list-item').focus());
  await page.keyboard.press('F2');
  await page.waitForTimeout(500);
  check('F2 renames the focused row', await page.evaluate(() => Boolean(document.activeElement.closest('.prompt-card'))));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check('focus goes back to the row after the dialog', await page.evaluate(() => document.activeElement.classList.contains('doc-list-item')));

  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1200);
  r = await rightClick('#entry-list > li[data-id]');
  check('note right-click opens its menu', r.prevented && r.menus === 1, r);
  await page.click('#select-btn');
  await page.waitForTimeout(500);
  const lis = await page.$$('#entry-list > li[data-id]');
  await lis[0].click();
  await lis[3].click({ modifiers: ['Shift'] });
  await page.waitForTimeout(200);
  const notesRanged = await page.evaluate(() => document.querySelectorAll('#entry-list .select-check:checked').length);
  check('Shift+click selects the run of notes', notesRanged === 4, notesRanged);
  await page.mouse.click(5, 450);
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
  const notesAll = await page.evaluate(() => [document.querySelectorAll('#entry-list .select-check:checked').length, document.querySelectorAll('#entry-list .select-check').length]);
  check('Ctrl+A selects every note in select mode', notesAll[0] === notesAll[1], notesAll);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Escape leaves select mode', await page.evaluate(() => !selectMode));

  for (const t of ['notes', 'chat', 'library', 'dashboard']) {
    await page.evaluate((t) => switchTab(t), t);
    await page.waitForTimeout(800);
    await page.mouse.click(700, 850);
    const prevented = await page.evaluate(() => {
      const e = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true });
      document.body.dispatchEvent(e);
      return e.defaultPrevented;
    });
    check(`Ctrl+S never reaches the browser on ${t}`, prevented);
  }

  console.log(failed ? `${failed} FAILED` : 'all passed');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
