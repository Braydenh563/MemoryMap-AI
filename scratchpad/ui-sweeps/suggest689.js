// INBOX 689: a press on a suggested change whose text is also a spelling
// finding opens ONE menu: the change's Accept and Reject, the all-changes
// rows, then the finding's answers (candidates, Add to dictionary, Ignore in
// this document) as their own group. The finding's popover (`#doc-suggest-menu`)
// and any CodeMirror lint tooltip stay shut while it is open.
//
//   BASE=http://127.0.0.1:8831 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/suggest689.js        (THEME=dark for dark)
//
// Asserts, in the document editor on a document with a suggested insertion of
// a misspelled word, a second insertion, and a clean deletion:
//   - the press shows exactly one menu: no visible `.cm-tooltip-lint`, the
//     finding popover hidden, one visible `.action-menu`;
//   - its rows include Accept and Reject, the all rows, the spelling
//     candidates and the two actions, the change's first;
//   - a candidate replaces the word inside the suggestion (the markers stay);
//   - Accept still works after, leaving the corrected word in the text;
//   - the click that follows the press does not open the popover over it;
//   - the keyboard opener (Next change) opens the same combined menu;
//   - a deletion with no finding keeps its two plain rows;
//   - no console errors.
const { boot } = require('./lib.js');

const DOC = '# Review\n\nSay {++the faque ++}here and also {++a good ++}there, but drop {--this--} part.\n';
let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) fails += 1;
  console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : JSON.stringify(detail));
};

const surfaces = (page) => page.evaluate(() => {
  const vis = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const menus = [...document.querySelectorAll('.action-menu')].filter(vis);
  const pop = document.getElementById('doc-suggest-menu');
  return {
    lint: [...document.querySelectorAll('.cm-tooltip-lint')].filter(vis).length,
    popover: vis(pop) && !pop.classList.contains('hidden'),
    menus: menus.length,
    rows: menus.flatMap((m) => [...m.querySelectorAll('[role="menuitem"], button')].map((b) => b.textContent.trim().replace(/\s+/g, ' '))),
    groups: menus.flatMap((m) => [...m.querySelectorAll('[role="separator"]')].length),
  };
});

const text = (page) => page.evaluate(() => docCmView.state.doc.toString());

async function press(page, needle) {
  const point = await page.evaluate((word) => {
    const el = [...document.querySelectorAll('[data-doc-suggest]')].find((e) => e.textContent.includes(word));
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, needle);
  if (!point) return null;
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(900);
  return point;
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });

  await page.evaluate(() => switchTab('documents'));
  await page.waitForTimeout(1500);
  await page.evaluate(async (c) => {
    const made = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Review 689 ' + Date.now(), content: c, file_type: 'md' }) });
    await loadDocuments(made.id);
  }, DOC);
  await page.waitForTimeout(2500);
  // The spelling finding for "faque" has to exist before the press.
  const found = await page.waitForFunction(() => docProseFound.some((f) => f.text === 'faque'), null, { timeout: 15000 }).then(() => true, () => false);
  check('the misspelling inside the insertion is a finding', found, await page.evaluate(() => docProseFound.map((f) => f.text)));
  // Live view hides the markers; the suggestion is the underlined word.
  const marked = await page.evaluate(() => document.querySelectorAll('[data-doc-suggest]').length);
  check('the suggestions are drawn', marked >= 3, marked);

  // 1. Press the misspelled insertion.
  const at = await press(page, 'faque');
  check('the misspelled insertion was found to press', !!at, at);
  const one = await surfaces(page);
  check('exactly one menu, no lint tooltip, no popover', one.menus === 1 && one.lint === 0 && !one.popover, one);
  const rows = one.rows.join(' | ');
  check('Accept and Reject are first', /^ph?:?.*Accept this insertion/.test(one.rows[0] || '') || /Accept this insertion/.test(one.rows[0] || ''), one.rows);
  check('Reject follows', /Reject this insertion/.test(one.rows[1] || ''), one.rows);
  check('the all rows are there', /Accept all 3/.test(rows) && /Reject all 3/.test(rows) && /Next change/.test(rows), rows);
  check('Add to dictionary and Ignore are there', /Add to dictionary/.test(rows) && /Ignore in this document/.test(rows), rows);
  const candidates = one.rows.slice(6, one.rows.findIndex((r) => /Add to dictionary/.test(r)));
  check('spelling candidates are rows', candidates.length >= 1, one.rows);
  check('the finding\'s own line heads its group', /not in the dictionary/.test(one.rows[5] || ''), one.rows);
  check('the finding is a group of its own (separators)', one.groups >= 2, one.groups);
  const shot = process.env.SCRATCH ? `${process.env.SCRATCH}/suggest689-${process.env.THEME || 'light'}.png` : null;
  if (shot) await page.screenshot({ path: shot });

  // 2. A candidate replaces the word inside the suggestion.
  const pick = candidates[0];
  await page.locator('.action-menu:not(.hidden) >> text=' + JSON.stringify(pick)).first().click().catch(async () => {
    await page.evaluate((label) => {
      [...document.querySelectorAll('.action-menu:not(.hidden) button')].find((b) => b.textContent.trim() === label)?.click();
    }, pick);
  });
  await page.waitForTimeout(700);
  const after = await text(page);
  check('the candidate replaced the word inside the insertion', !after.includes('faque') && after.includes('{++the ' + pick + ' ++}'), { pick, after });
  const gone = await surfaces(page);
  check('the menu is closed after the choice', gone.menus === 0 && !gone.popover, gone);

  // 3. Accept still works after.
  await press(page, pick);
  const again = await surfaces(page);
  check('the corrected insertion has no finding rows now', again.menus === 1 && !again.rows.some((r) => /Add to dictionary/.test(r)), again.rows);
  await page.evaluate(() => {
    [...document.querySelectorAll('.action-menu:not(.hidden) button')].find((b) => /Accept this insertion/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(600);
  const accepted = await text(page);
  check('Accept leaves the corrected word, markers gone', accepted.includes('Say the ' + pick + ' here') && !accepted.includes('{++the ' + pick), accepted);

  // 4. A deletion with no finding keeps its two plain rows.
  await press(page, 'this');
  const del = await surfaces(page);
  check('a clean deletion: one menu, Accept and Reject', del.menus === 1 && /Accept this deletion/.test(del.rows[0] || '') && !del.rows.some((r) => /dictionary/.test(r)), del.rows);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 5. The keyboard opener gives the same combined menu.
  await page.evaluate(() => {
    const view = docCmView;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'Say {++the faque ++}here.\n' } });
  });
  await page.waitForFunction(() => docProseFound.some((f) => f.text === 'faque'), null, { timeout: 15000 }).catch(() => {});
  await page.evaluate(() => { docCmView.dispatch({ selection: { anchor: 0 } }); docCmView.focus(); docSuggestNext(); });
  await page.waitForTimeout(900);
  const kb = await surfaces(page);
  check('keyboard: one combined menu', kb.menus === 1 && kb.lint === 0 && !kb.popover && kb.rows.some((r) => /Accept this insertion/.test(r)) && kb.rows.some((r) => /Add to dictionary/.test(r)), kb);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 6. A pointer menu open keeps the finding popover from opening over it.
  await page.evaluate(() => { docCmView.dispatch({ selection: { anchor: 0 } }); });
  const point = await page.evaluate(() => {
    const f = docProseFound.find((x) => x.text === 'faque');
    const c = docCmView.coordsAtPos(f.start + 1);
    return { x: c.left + 2, y: (c.top + c.bottom) / 2 };
  });
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(900);
  const both = await surfaces(page);
  check('pressing the word again: still one surface', both.menus + (both.popover ? 1 : 0) + both.lint === 1, both);

  check('no console errors', errors.length === 0, errors);
  await browser.close();
  console.log(fails ? `${fails} FAILED` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
