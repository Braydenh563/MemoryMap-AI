// The AI edit panel shows its proposal as a diff, and each change can be kept
// or skipped. DOCUMENTS_PLAN Phase 5 item 3.
//
//   BASE=http://127.0.0.1:8944 node scratchpad/ui-sweeps/docaidiff.js
//
// There is no model in the sandbox, so the *answer* is handed to the panel
// directly through `showDocAiResult`, which is the one function the network
// call ends in: everything below the arrival of the text is what a real run
// would do, and everything above it is a socket. What this measures:
//   - the diff appears with the answer and says how many changes there are,
//   - one hunk head per change, each with a control that reads its state,
//   - skipping a change puts the *old* lines back in the textarea (rather
//     than dropping them), and the textarea is always what accepting applies,
//   - a skipped change stays on screen, dimmed, so the choice is reversible,
//   - editing the answer by hand rebuilds the diff against the same target,
//   - the verb with no target ("write") draws no diff at all,
//   - nothing in the panel overflows the dialog.
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const LINES = [
  'The first paragraph of the document.',
  '',
  'The second paragraph says something else.',
  '',
  'The third paragraph closes it.',
];
const BEFORE = LINES.join('\n');
const AFTER = [
  'The first paragraph of the document.',
  '',
  'The second paragraph, tightened.',
  '',
  'The third paragraph closes it, with a new line after it.',
].join('\n');

(async () => {
  const { browser, page } = await boot();
  const say = (k, v) => console.log(`${k}: ${JSON.stringify(v)}`);
  let bad = 0;
  const fail = (m) => { console.log('FAIL: ' + m); bad++; };

  await openDoc(page, { title: 'AI diff sweep', content: BEFORE });
  await page.waitForTimeout(500);

  await page.evaluate((answer) => {
    openDocAiPanel();
    showDocAiResult(answer);
  }, AFTER);
  await page.waitForTimeout(600);

  const state = () => page.evaluate(() => {
    const block = document.getElementById('doc-ai-diff-block');
    const view = document.getElementById('doc-ai-diff');
    const card = document.querySelector('#doc-ai-panel .modal-card');
    const heads = [...document.querySelectorAll('#doc-ai-diff .doc-diff-hunk-head')];
    return {
      shown: !!block && !block.classList.contains('hidden'),
      head: (document.getElementById('doc-ai-diff-head') || {}).textContent || null,
      hunks: heads.length,
      toggles: heads.map((h) => {
        const b = h.querySelector('button');
        return b.textContent.trim() + ':' + b.getAttribute('aria-pressed');
      }),
      added: document.querySelectorAll('#doc-ai-diff .diff-added').length,
      removed: document.querySelectorAll('#doc-ai-diff .diff-removed').length,
      skippedRows: document.querySelectorAll('#doc-ai-diff .doc-diff-line.is-skipped').length,
      result: document.getElementById('doc-ai-result').value,
      viewRight: view ? +view.getBoundingClientRect().right.toFixed(1) : null,
      cardRight: card ? +card.getBoundingClientRect().right.toFixed(1) : null,
      viewH: view ? +view.getBoundingClientRect().height.toFixed(1) : null,
      cardH: card ? +card.getBoundingClientRect().height.toFixed(1) : null,
      acceptVisible: !!document.getElementById('doc-ai-accept').offsetParent,
    };
  });

  const first = await state();
  say('proposal', { ...first, result: first.result.slice(0, 40) + '…' });
  if (!first.shown) fail('the diff did not appear with the answer');
  if (first.hunks !== 2) fail(`expected two changes, got ${first.hunks}`);
  if (first.added !== 2 || first.removed !== 2) fail(`expected +2 -2, got +${first.added} -${first.removed}`);
  if (!/2 changes/.test(first.head || '')) fail(`the head does not count the changes: ${first.head}`);
  if (first.result !== AFTER) fail('the textarea is not the answer');
  if (first.toggles.some((t) => !/:true$/.test(t))) fail(`every change should start kept: ${first.toggles}`);
  if (first.viewRight > first.cardRight) fail('the diff is wider than the dialog');
  if (!first.acceptVisible) fail('the accept button is off screen under the diff');

  // --- skipping the second change ---------------------------------------
  await page.evaluate(() => {
    const heads = [...document.querySelectorAll('#doc-ai-diff .doc-diff-hunk-head')];
    heads[1].querySelector('button').click();
  });
  await page.waitForTimeout(400);
  const skipped = await state();
  say('one-skipped', { toggles: skipped.toggles, skippedRows: skipped.skippedRows, result: skipped.result.split('\n').pop() });
  const expected = AFTER.split('\n');
  expected[4] = LINES[4];
  if (skipped.result !== expected.join('\n')) fail(`skipping a change did not put the old line back: ${JSON.stringify(skipped.result)}`);
  if (!/:false$/.test(skipped.toggles[1])) fail('the skipped change still reads as kept');
  if (skipped.skippedRows !== 2) fail(`expected the skipped change's two lines dimmed, got ${skipped.skippedRows}`);
  const dim = await page.evaluate(() => {
    const el = document.querySelector('#doc-ai-diff .doc-diff-line.is-skipped');
    return { opacity: getComputedStyle(el).opacity, visible: !!el.offsetParent };
  });
  say('skipped-row', dim);
  if (!dim.visible || Number(dim.opacity) >= 1) fail('a skipped change is not visibly set aside');

  // Putting it back.
  await page.evaluate(() => {
    const heads = [...document.querySelectorAll('#doc-ai-diff .doc-diff-hunk-head')];
    heads[1].querySelector('button').click();
  });
  await page.waitForTimeout(400);
  const back = await state();
  if (back.result !== AFTER) fail('putting a change back did not restore the answer');
  say('restored', { toggles: back.toggles, matchesAnswer: back.result === AFTER });

  // --- editing the answer by hand ---------------------------------------
  await page.evaluate(() => {
    const box = document.getElementById('doc-ai-result');
    box.value = box.value + '\nA line typed by hand.';
    box.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(700);
  const edited = await state();
  say('hand-edited', { hunks: edited.hunks, added: edited.added, toggles: edited.toggles });
  if (edited.hunks !== 2) fail(`a hand edit should rebuild the diff, got ${edited.hunks} changes`);
  if (edited.added !== 3) fail(`expected the typed line counted as added, got +${edited.added}`);

  // --- the verb with no target ------------------------------------------
  await page.evaluate((answer) => {
    const write = document.querySelector('#doc-ai-panel input[name="doc-ai-verb"][value="write"]');
    write.checked = true;
    write.dispatchEvent(new Event('change', { bubbles: true }));
    showDocAiResult(answer);
  }, 'A brand new paragraph.');
  await page.waitForTimeout(500);
  const write = await state();
  say('write-verb', { shown: write.shown, result: write.result });
  if (write.shown) fail('a pure insertion drew a diff of itself');

  console.log(bad ? `\nFAILED: ${bad}` : '\nOK: every AI diff check passed');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
