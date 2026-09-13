// The document history: a version list you can filter, and a diff under any
// row that says what that version said and the next one does not.
// DOCUMENTS_PLAN Phase 5 item 2.
//
//   BASE=http://127.0.0.1:8944 node scratchpad/ui-sweeps/dochistory.js
//
// What it measures, in a running app rather than from the source:
//   - the history dialog opens with the filter segment and one row per version,
//   - "Changes" opens a diff *inside* the row (the row's own box grows; nothing
//     is drawn over the list), the row takes aria-current and the button
//     aria-expanded, which is this app's recipe for a list row you can act on,
//   - the diff draws one line per changed line, added and removed lines carry
//     the app's two diff colours and they are different colours,
//   - unchanged runs are counted in a gap row rather than printed, so a
//     one-line change in a forty-line document is not forty rows,
//   - a second "Changes" closes the first, so one row is open at a time,
//   - the AI filter shows only versions an AI edit replaced, and says so when
//     there are none,
//   - nothing drawn is wider than the dialog it is in.
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const LINES = [];
for (let i = 0; i < 40; i++) LINES.push('Line number ' + i + ' of the document.');
const BEFORE = LINES.join('\n');
const AFTER = LINES.map((l, i) => (i === 20 ? 'This line was rewritten.' : l)).join('\n');

(async () => {
  const { browser, page } = await boot();
  const say = (k, v) => console.log(`${k}: ${JSON.stringify(v)}`);
  let bad = 0;
  const fail = (m) => { console.log('FAIL: ' + m); bad++; };

  await openDoc(page, { title: 'History sweep', content: BEFORE });
  await page.waitForTimeout(600);

  // A real edit through the editor and the app's own save path, so the
  // revision the server keeps is the version being replaced, exactly as a
  // person's edit would leave it.
  await page.evaluate(async (text) => {
    docSurface().text = text;
    await saveDocument({ silent: true });
  }, AFTER);
  await page.waitForTimeout(700);

  const openHistory = async () => {
    await page.evaluate(() => document.getElementById('doc-history').click());
    await page.waitForTimeout(700);
  };
  await openHistory();

  const listState = () => page.evaluate(() => {
    const dialog = document.getElementById('doc-history-dialog');
    const rows = [...document.querySelectorAll('#doc-history-list .doc-ai-history-entry')];
    const seg = document.getElementById('doc-history-filter');
    const empty = document.getElementById('doc-history-empty');
    return {
      open: !!(dialog && dialog.open),
      rows: rows.length,
      filters: seg ? [...seg.querySelectorAll('button')].map((b) => b.textContent.trim() + ':' + b.getAttribute('aria-pressed')) : null,
      emptyShown: empty ? !empty.classList.contains('hidden') : null,
      emptyText: empty ? empty.textContent.trim().slice(0, 60) : null,
      dialogRight: dialog ? +dialog.getBoundingClientRect().right.toFixed(1) : null,
    };
  });

  const shape = await page.evaluate(() => {
    const row = document.querySelector('#doc-history-list .doc-ai-history-entry');
    const text = row.querySelector('.doc-ai-history-text');
    const preview = row.querySelector('.doc-history-preview');
    return {
      row: +row.getBoundingClientRect().height.toFixed(1),
      textW: +text.getBoundingClientRect().width.toFixed(1),
      previewH: +preview.getBoundingClientRect().height.toFixed(1),
    };
  });
  say('row-shape', shape);
  // The squeeze a third action in the row caused, and the numbers that catch
  // it coming back: 134.6px of text column and a 270px preview made a 346px row.
  if (shape.textW < 200) fail(`the text column is ${shape.textW}px: the actions are crushing it`);
  if (shape.previewH > 60) fail(`the preview is ${shape.previewH}px tall: it is not clamped`);
  if (shape.row > 150) fail(`a history row is ${shape.row}px tall`);

  const first = await listState();
  say('dialog', first);
  if (!first.open) fail('the history dialog did not open');
  if (first.rows !== 1) fail(`expected one version, got ${first.rows}`);
  if (!first.filters || first.filters[0] !== 'All:true') fail('the filter segment is missing or not on All');

  // --- the diff, opened in the row --------------------------------------
  const rowHeightBefore = await page.evaluate(() =>
    +document.querySelector('#doc-history-list .doc-ai-history-entry').getBoundingClientRect().height.toFixed(1));
  await page.evaluate(() => {
    const row = document.querySelector('#doc-history-list .doc-ai-history-entry');
    [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Changes').click();
  });
  await page.waitForTimeout(900);

  const diff = await page.evaluate(() => {
    const row = document.querySelector('#doc-history-list .doc-ai-history-entry');
    const box = row.querySelector('.doc-history-diff');
    const view = row.querySelector('.doc-diff');
    const lines = [...row.querySelectorAll('.doc-diff-line')];
    const added = lines.filter((l) => l.classList.contains('diff-added'));
    const removed = lines.filter((l) => l.classList.contains('diff-removed'));
    const gaps = [...row.querySelectorAll('.doc-diff-gap')];
    const ink = (el) => (el ? getComputedStyle(el).color : null);
    const ground = (el) => (el ? getComputedStyle(el).backgroundColor : null);
    const dialog = document.getElementById('doc-history-dialog');
    const button = [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Changes');
    return {
      rowH: +row.getBoundingClientRect().height.toFixed(1),
      boxShown: !!box && !box.classList.contains('hidden'),
      head: (row.querySelector('.doc-diff-head') || {}).textContent || null,
      lines: lines.length,
      added: added.length,
      removed: removed.length,
      gaps: gaps.map((g) => g.textContent.trim()),
      addedInk: ink(added[0]),
      removedInk: ink(removed[0]),
      addedGround: ground(added[0]),
      removedGround: ground(removed[0]),
      strike: removed[0] ? getComputedStyle(removed[0]).textDecorationLine : null,
      ariaCurrent: row.getAttribute('aria-current'),
      ariaExpanded: button ? button.getAttribute('aria-expanded') : null,
      diffRight: view ? +view.getBoundingClientRect().right.toFixed(1) : null,
      dialogRight: +dialog.getBoundingClientRect().right.toFixed(1),
      scrolls: view ? view.scrollHeight > view.clientHeight : null,
    };
  });
  say('diff', diff);
  if (!diff.boxShown) fail('the diff box did not open');
  if (diff.rowH <= rowHeightBefore) fail('the row did not grow, so the diff is drawn over something');
  if (diff.added !== 1 || diff.removed !== 1) fail(`expected +1 -1 lines, got +${diff.added} -${diff.removed}`);
  if (diff.gaps.length !== 2) fail(`expected the two untouched runs counted, got ${diff.gaps.length}`);
  if (diff.lines > 8) fail(`a one-line change drew ${diff.lines} rows; the context window is not working`);
  if (diff.addedInk === diff.removedInk) fail('added and removed are the same colour');
  if (diff.addedGround === diff.removedGround) fail('added and removed have the same ground');
  if (diff.strike && diff.strike !== 'none') fail(`removed lines are struck through (${diff.strike})`);
  if (diff.ariaCurrent !== 'location') fail('the open row is not marked with aria-current');
  if (diff.ariaExpanded !== 'true') fail('the control does not say it is expanded');
  if (diff.diffRight > diff.dialogRight) fail('the diff is wider than the dialog');
  if (!/^\+1 −1 lines/.test((diff.head || '').trim())) fail(`the head does not say what changed: ${diff.head}`);

  // Closing it again.
  await page.evaluate(() => {
    const row = document.querySelector('#doc-history-list .doc-ai-history-entry');
    [...row.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Changes').click();
  });
  await page.waitForTimeout(400);
  const closed = await page.evaluate(() => {
    const row = document.querySelector('#doc-history-list .doc-ai-history-entry');
    return {
      box: row.querySelector('.doc-history-diff').classList.contains('hidden'),
      current: row.getAttribute('aria-current'),
      h: +row.getBoundingClientRect().height.toFixed(1),
    };
  });
  say('closed', closed);
  if (!closed.box || closed.current) fail('the diff did not close cleanly');

  // --- the AI filter -----------------------------------------------------
  await page.evaluate(() =>
    document.querySelector('#doc-history-filter [data-history-filter="ai"]').click());
  await page.waitForTimeout(400);
  const aiEmpty = await listState();
  say('filter-ai-on-a-hand-edit', aiEmpty);
  if (aiEmpty.rows !== 0) fail('the AI filter kept a hand edit');
  if (!aiEmpty.emptyShown || !/No AI edits/.test(aiEmpty.emptyText)) fail('the empty state does not say which filter is on');

  await page.evaluate(() => document.getElementById('doc-history-dialog').close());
  // The same version, recorded as an AI edit: the coalescing window means one
  // revision per five minutes, so this rewrites the source of the one there is.
  await page.evaluate(async () => {
    await api(`/documents/${currentDoc.id}`, {
      method: 'PUT',
      body: JSON.stringify({ content: docSurface().text + '\nAn AI wrote this.', revision_source: 'ai' }),
    });
  });
  await page.waitForTimeout(500);
  await openHistory();
  await page.evaluate(() =>
    document.querySelector('#doc-history-filter [data-history-filter="ai"]').click());
  await page.waitForTimeout(400);
  const aiRows = await listState();
  say('filter-ai-on-an-ai-edit', aiRows);
  if (aiRows.rows !== 1) fail(`the AI filter shows ${aiRows.rows} rows where one AI version exists`);

  console.log(bad ? `\nFAILED: ${bad}` : '\nOK: every history check passed');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
