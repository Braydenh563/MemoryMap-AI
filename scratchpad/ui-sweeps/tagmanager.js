// The tag manager, the bulk tag dialog and the two chip menus (INBOX 447),
// driven by mouse and by keyboard, with axe-core on the manager.
//
//   bash scratchpad/ui-sweeps/serve.sh 8791 /tmp/mm-tags
//   BASE=http://127.0.0.1:8791 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     AXE_JS=/tmp/axe-core/package/axe.min.js node scratchpad/ui-sweeps/tagmanager.js
//
// Seeds its own notes (tagged "tm-*" in a category of its own) so it can run
// over any data dir, and prints one line per check. Exit 1 if any fails.
const fs = require('fs');
const { boot } = require('./lib.js');

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' :: ' + detail : ''}`);
  if (!ok) failed += 1;
};

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const api = (path, method = 'GET', body = null) =>
    page.evaluate(async ([p, m, b]) => apiJson(p, { method: m, body: b ? JSON.stringify(b) : undefined }), [path, method, body]);

  // --- seed ---------------------------------------------------------------
  const seeds = [
    ['tm note one about bread', ['tm-draft', 'tm-bake'], 'TM Kitchen'],
    ['tm note two about soup', ['tm-draft'], 'TM Kitchen'],
    ['tm note three about code', ['tm-wip', 'tm-bake'], 'TM Work'],
    ['tm note four about plans', ['tm-wip'], 'TM Work'],
    ['tm note five about nothing', [], 'TM Work'],
  ];
  const ids = [];
  for (const [content, tags, category] of seeds) {
    const made = await api('/entries', 'POST', { content, tags, category });
    ids.push(made.id);
  }
  const tagsOf = async (id) => (await api(`/entries/${id}`)).tags;
  await page.evaluate(async () => { await switchTab('notes'); showNotesSection('browse'); await loadEntries(); });
  await page.waitForTimeout(600);
  const card = (id) => `#entry-list > li[data-id="${id}"]`;
  const settle = () => page.waitForTimeout(500);

  // --- (5) the category chip ------------------------------------------------
  await page.click(`${card(ids[0])} .chip.category`);
  await page.waitForSelector('.action-menu:not(.hidden) .menu-item');
  let items = await page.$$eval('.action-menu:not(.hidden) .menu-item', (els) => els.map((e) => e.textContent.trim()));
  check('category chip menu has three rows', items.length === 3, items.join(' | '));
  check('first row is Show notes in <category>', /Show notes in TM Kitchen/.test(items[0]));
  await page.keyboard.press('Escape');
  await settle();
  const focusedChip = await page.evaluate(() => document.activeElement?.classList.contains('category'));
  check('Escape returns the focus to the chip', focusedChip);

  // Keyboard: Enter opens, Down + Enter picks the second row (Move), Escape closes the sheet.
  await page.focus(`${card(ids[0])} .chip.category`);
  await page.keyboard.press('Enter');
  await page.waitForSelector('.action-menu:not(.hidden) .menu-item');
  const firstFocused = await page.evaluate(() => document.activeElement?.textContent.trim());
  check('the menu focuses its first row', /Show notes in/.test(firstFocused), firstFocused);
  await page.keyboard.press('Enter');
  await settle();
  const filtered = await page.$$eval('#entry-list > li[data-id]', (els) => els.map((e) => e.dataset.id));
  check('Show notes in filters the list to the category', filtered.length === 2 && filtered.every((i) => [ids[0], ids[1]].includes(Number(i))), filtered.join(','));
  const lit = await page.$eval('#category-list li.active, #category-list li[aria-current="true"], #category-list li.current', (e) => e.textContent).catch(() => '');
  check('the sidebar row for it is lit', /TM Kitchen/.test(lit), lit);

  await page.focus(`${card(ids[0])} .chip.category`);
  await page.keyboard.press('Space');
  await page.waitForSelector('.action-menu:not(.hidden) .menu-item');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.sheet-overlay[data-sheet="note-category"]');
  check('Move to another category opens the move sheet', true);
  await page.keyboard.press('Escape');
  await settle();

  await page.click(`${card(ids[0])} .chip.category`);
  await page.waitForSelector('.action-menu:not(.hidden) .menu-item');
  await page.click('.action-menu:not(.hidden) .menu-item:nth-of-type(3)');
  await page.waitForSelector('.sheet-overlay[data-sheet="categories"]');
  check('Manage categories… opens the panel', true);
  await page.keyboard.press('Escape');
  await settle();
  // Clear the filter for what follows.
  await page.evaluate(() => { activeCategory = null; renderSidebar(); renderEntries(); });
  await settle();

  // --- (4) the tag chip's menu ------------------------------------------------
  await page.click(`${card(ids[0])} .chip.hashtag >> text=tm-draft`, { button: 'right' });
  await page.waitForSelector('.action-menu:not(.hidden) .menu-item');
  items = await page.$$eval('.action-menu:not(.hidden) .menu-item', (els) => els.map((e) => e.textContent.trim()));
  check('tag chip menu has four rows', items.length === 4, items.join(' | '));
  await page.click('.action-menu:not(.hidden) .menu-item >> text=Remove from this note');
  await settle();
  check('Remove from this note takes only that tag, from only that note',
    JSON.stringify(await tagsOf(ids[0])) === '["tm-bake"]' && JSON.stringify(await tagsOf(ids[1])) === '["tm-draft"]');
  const hist = await api(`/entries/${ids[0]}/history`);
  check('and the note history shows it', hist.items.some((i) => i.detail === 'tags') && hist.revisions.length >= 1);
  await page.click('#toast-region button:has-text("Undo"), .toast button:has-text("Undo")');
  await settle();
  check('Undo puts the tag back', JSON.stringify(await tagsOf(ids[0])) === '["tm-draft","tm-bake"]', JSON.stringify(await tagsOf(ids[0])));

  // Keyboard: the menu key on a focused chip.
  await page.focus(`${card(ids[0])} .chip.hashtag >> text=tm-bake`);
  await page.keyboard.press('ContextMenu');
  await page.waitForSelector('.action-menu:not(.hidden) .menu-item');
  check('the menu key opens the tag chip menu', true);
  await page.keyboard.press('Escape');
  await settle();
  check('Escape returns the focus to the tag chip', await page.evaluate(() => /tm-bake/.test(document.activeElement?.textContent || '')));

  // --- the manager ---------------------------------------------------------------
  await page.click('#notes-more-menu > summary');
  await page.click('#notes-manage-tags');
  await page.waitForSelector('.sheet-overlay[data-sheet="tags"] .manage-cat-row');
  const rows = await page.$$eval('.sheet-overlay[data-sheet="tags"] .manage-cat-row', (els) => els.map((e) => [e.dataset.tag, e.querySelector('.manage-cat-count').textContent]));
  const asMap = Object.fromEntries(rows);
  check('rows show each tag with its count', asMap['tm-draft'] === '2' && asMap['tm-bake'] === '2' && asMap['tm-wip'] === '2', JSON.stringify(asMap));

  // filter
  await page.fill('.sheet-overlay[data-sheet="tags"] .manage-cat-filter', 'tm-w');
  check('the filter narrows the rows', (await page.$$('.sheet-overlay[data-sheet="tags"] .manage-cat-row')).length === 1);
  await page.fill('.sheet-overlay[data-sheet="tags"] .manage-cat-filter', '');

  // axe on the manager
  if (fs.existsSync(process.env.AXE_JS || '/tmp/axe-core/package/axe.min.js')) {
    await page.evaluate(fs.readFileSync(process.env.AXE_JS || '/tmp/axe-core/package/axe.min.js', 'utf8'));
    const result = await page.evaluate(async () => {
      const out = await axe.run(document.querySelector('.sheet-overlay[data-sheet="tags"]'), { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] });
      return out.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' ; ')}`);
    });
    check('axe finds nothing on the manager', result.length === 0, result.join(' || '));
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${process.env.SCRATCH || '.'}/tagmanager-sheet.png` });
  } else console.log('skip axe (AXE_JS missing)');

  // rename by keyboard (F2)
  const row = (name) => `.sheet-overlay[data-sheet="tags"] [data-tag="${name}"] > .manage-cat-main`;
  await page.focus(row('tm-wip'));
  await page.keyboard.press('F2');
  await page.waitForSelector('.prompt-card input[type="text"]');
  await page.fill('.prompt-card input[type="text"]', 'tm-active');
  await page.keyboard.press('Enter');
  await settle();
  check('F2 renames a tag on every note that has it', JSON.stringify(await tagsOf(ids[2])) === '["tm-bake","tm-active"]' && JSON.stringify(await tagsOf(ids[3])) === '["tm-active"]');
  check('the manager redraws with the new name', (await page.$$(row('tm-active'))).length === 1 && (await page.$$(row('tm-wip'))).length === 0);
  await page.click('.toast button:has-text("Undo"), #toast-region button:has-text("Undo")');
  await settle();
  check('Undo restores the old name', JSON.stringify(await tagsOf(ids[2])) === '["tm-wip","tm-bake"]');

  // merge via the row's menu: tm-wip into tm-draft
  await page.hover(`.sheet-overlay[data-sheet="tags"] [data-tag="tm-wip"]`);
  await page.click(`.sheet-overlay[data-sheet="tags"] [data-tag="tm-wip"] .manage-cat-menu > button`);
  await page.click('.action-menu:not(.hidden) .menu-item >> text=Merge into');
  await page.waitForSelector('.sheet-overlay[data-sheet="tag-choice"] .sheet-row');
  await page.click('.sheet-overlay[data-sheet="tag-choice"] .sheet-row >> text=tm-draft');
  await settle();
  check('Merge into folds the tag into another', JSON.stringify(await tagsOf(ids[2])) === '["tm-bake","tm-draft"]' && JSON.stringify(await tagsOf(ids[3])) === '["tm-draft"]', JSON.stringify([await tagsOf(ids[2]), await tagsOf(ids[3])]));
  await page.click('.toast button:has-text("Undo"), #toast-region button:has-text("Undo")');
  await settle();
  check('Undo unmerges', JSON.stringify(await tagsOf(ids[2])) === '["tm-wip","tm-bake"]' && JSON.stringify(await tagsOf(ids[3])) === '["tm-wip"]');

  // select two rows with Space and remove them
  await page.focus(row('tm-wip'));
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  const footer = await page.$eval('.sheet-overlay[data-sheet="tags"] .manage-cat-footer', (e) => [e.classList.contains('hidden'), e.textContent]);
  check('selecting rows raises the footer', !footer[0] && /2 selected/.test(footer[1]), footer[1]);
  await page.click('.sheet-overlay[data-sheet="tags"] .manage-cat-footer button:has-text("Remove")');
  await page.waitForSelector('.confirm-card');
  await page.click('.confirm-card .confirm-actions button:has-text("Remove")');
  await settle();
  const after = [await tagsOf(ids[2]), await tagsOf(ids[3])];
  check('Remove takes the tags off, notes kept', !after[0].includes('tm-wip') && (await api(`/entries/${ids[3]}`)).id === ids[3], JSON.stringify(after));
  await page.click('.toast button:has-text("Undo"), #toast-region button:has-text("Undo")');
  await settle();
  check('Undo puts them back in one step', JSON.stringify(await tagsOf(ids[3])) === '["tm-wip"]' && (await tagsOf(ids[2])).includes('tm-wip'));

  // Enter shows the notes
  await page.focus(row('tm-bake'));
  await page.keyboard.press('Enter');
  await settle();
  const shown = await page.$$eval('#entry-list > li[data-id]', (els) => els.map((e) => Number(e.dataset.id)));
  check('Enter shows the tag\'s notes and closes the manager', shown.length === 2 && (await page.$$('.sheet-overlay[data-sheet="tags"]')).length === 0, shown.join(','));
  await page.evaluate(() => { $('note-search').value = ''; noteSearch = ''; renderEntries(); });

  // --- bulk across selected notes ---------------------------------------------------
  await page.click('#select-btn');
  await settle();
  for (const id of [ids[0], ids[2], ids[4]]) await page.click(`${card(id)} .select-check`);
  check('three notes selected', (await page.textContent('#batch-count')).startsWith('3'));
  await page.click('#batch-tag');
  await page.waitForSelector('.sheet-overlay[data-sheet="bulk-tags"] form');
  const bulk = await page.$$eval('.sheet-overlay[data-sheet="bulk-tags"] .manage-split-note', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  check('the dialog lists the tags in the selection with how many carry each', bulk.some((t) => /#tm-draft\s*1 of 3/.test(t)) && bulk.some((t) => /#tm-bake\s*2 of 3/.test(t)), bulk.join(' | '));
  await page.click('.sheet-overlay[data-sheet="bulk-tags"] input[type="text"]');
  await page.keyboard.type('tm-b');
  await page.waitForTimeout(500);
  const suggestTop = await page.evaluate(() => {
    const box = document.querySelector('.tag-suggest');
    if (!box || box.classList.contains('hidden')) return 'no list';
    const r = box.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 10);
    return box.contains(hit) ? 'on top' : `covered by ${hit?.className}`;
  });
  check('the tag list under the add field is on top of the dialog', suggestTop === 'on top', suggestTop);
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/tagmanager-bulk.png` });
  await page.fill('.sheet-overlay[data-sheet="bulk-tags"] input[type="text"]', 'tm-all, tm-bake');
  await page.check('.sheet-overlay[data-sheet="bulk-tags"] .manage-split-note:has-text("#tm-draft") input');
  await page.click('.sheet-overlay[data-sheet="bulk-tags"] button[type="submit"]');
  await settle();
  const t0 = await tagsOf(ids[0]);
  const t2 = await tagsOf(ids[2]);
  const t4 = await tagsOf(ids[4]);
  check('one action added to all and removed from all', t0.includes('tm-all') && t2.includes('tm-all') && t4.includes('tm-all') && !t0.includes('tm-draft') && t4.includes('tm-bake'), JSON.stringify([t0, t2, t4]));
  check('the selection ended', await page.evaluate(() => !selectMode));
  await page.click('.toast button:has-text("Undo"), #toast-region button:has-text("Undo")');
  await settle();
  check('one Undo reverts all three notes', JSON.stringify(await tagsOf(ids[0])) === '["tm-draft","tm-bake"]' && JSON.stringify(await tagsOf(ids[4])) === '[]' && JSON.stringify(await tagsOf(ids[2])) === '["tm-wip","tm-bake"]');

  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/tagmanager-end.png` });
  await browser.close();
  console.log(failed ? `${failed} check(s) failed` : 'all checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
