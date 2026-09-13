// Reading and focus: dim all but this paragraph, keep this line centred, and
// a serif for the rendered page. DOCUMENTS_PLAN Phase 5 item 4, PLAN D9.
//
//   BASE=http://127.0.0.1:8944 node scratchpad/ui-sweeps/docreading.js
//
// Every number below is read out of a running app with getComputedStyle and
// getBoundingClientRect, because none of these three can be judged from the
// source: an opacity that loses to CodeMirror's adopted stylesheet, a scroll
// that fires inside an update and is refused, and a font stack that falls
// through to the same face it replaced all look correct in a diff.
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const PARAS = [];
for (let i = 0; i < 30; i++) PARAS.push('Paragraph ' + i + ', with enough words in it to be a paragraph rather than a label.');
const BODY = PARAS.join('\n\n');

(async () => {
  const { browser, page } = await boot();
  const say = (k, v) => console.log(`${k}: ${JSON.stringify(v)}`);
  let bad = 0;
  const fail = (m) => { console.log('FAIL: ' + m); bad++; };

  await openDoc(page, { title: 'Reading sweep', content: BODY });
  await page.waitForTimeout(600);

  // Put the caret in the middle of the document, in the sixth paragraph.
  await page.evaluate(() => {
    const at = docCmView.state.doc.line(11).from + 4;
    docCmView.dispatch({ selection: { anchor: at }, scrollIntoView: true });
    docCmView.focus();
  });
  await page.waitForTimeout(400);

  const lineState = () => page.evaluate(() => {
    const lines = [...document.querySelectorAll('#doc-editor .cm-line')];
    const caretLine = docCmView.state.doc.lineAt(docCmView.state.selection.main.head).number;
    const dimmed = lines.filter((l) => l.classList.contains('cm-doc-dimmed'));
    const bright = lines.filter((l) => !l.classList.contains('cm-doc-dimmed'));
    const op = (el) => (el ? +Number(getComputedStyle(el).opacity).toFixed(2) : null);
    return {
      lines: lines.length,
      dimmed: dimmed.length,
      bright: bright.length,
      dimOpacity: op(dimmed[0]),
      brightOpacity: op(bright[0]),
      caretLine,
      pressed: document.getElementById('doc-dim-others').getAttribute('aria-pressed'),
    };
  });

  const before = await lineState();
  say('dim-off', before);
  if (before.dimmed !== 0) fail('lines are dimmed before the mode is on');

  await page.evaluate(() => document.getElementById('doc-dim-others').click());
  await page.waitForTimeout(500);
  const dimOn = await lineState();
  say('dim-on', dimOn);
  if (dimOn.pressed !== 'true') fail('the control does not read as pressed');
  if (dimOn.dimmed < 5) fail(`only ${dimOn.dimmed} lines dimmed`);
  if (dimOn.bright < 1) fail('the caret paragraph was dimmed too');
  if (!(dimOn.dimOpacity < 0.5)) fail(`the dim is ${dimOn.dimOpacity}: the rule lost to CodeMirror's own`);
  if (dimOn.brightOpacity !== 1) fail(`the caret paragraph is at ${dimOn.brightOpacity}`);

  // Moving the caret moves the bright paragraph with it.
  await page.evaluate(() => {
    const at = docCmView.state.doc.line(21).from + 3;
    docCmView.dispatch({ selection: { anchor: at } });
  });
  await page.waitForTimeout(400);
  const moved = await page.evaluate(() => {
    const bright = [...document.querySelectorAll('#doc-editor .cm-line')].filter((l) => !l.classList.contains('cm-doc-dimmed'));
    const caret = docCmView.state.doc.lineAt(docCmView.state.selection.main.head).number;
    const caretEl = docCmView.domAtPos(docCmView.state.selection.main.head).node;
    const el = caretEl.nodeType === 1 ? caretEl : caretEl.parentElement;
    return { bright: bright.length, caret, caretDimmed: !!el.closest('.cm-doc-dimmed') };
  });
  say('dim-follows-caret', moved);
  if (moved.caretDimmed) fail('the paragraph the caret moved into is dimmed');

  await page.evaluate(() => document.getElementById('doc-dim-others').click());
  await page.waitForTimeout(400);
  const dimOff = await lineState();
  say('dim-off-again', dimOff);
  if (dimOff.dimmed !== 0) fail('turning the mode off left lines dimmed');

  // --- typewriter --------------------------------------------------------
  const caretY = () => page.evaluate(() => {
    const scroller = document.querySelector('#doc-editor .cm-scroller');
    const coords = docCmView.coordsAtPos(docCmView.state.selection.main.head);
    const box = scroller.getBoundingClientRect();
    return {
      caret: +coords.top.toFixed(1),
      paneTop: +box.top.toFixed(1),
      paneH: +box.height.toFixed(1),
      fraction: +(((coords.top - box.top) / box.height)).toFixed(3),
    };
  });
  await page.evaluate(() => {
    docCmView.dispatch({ selection: { anchor: docCmView.state.doc.line(45).from }, scrollIntoView: true });
  });
  await page.waitForTimeout(500);
  const plain = await caretY();
  say('typewriter-off', plain);

  await page.evaluate(() => document.getElementById('doc-typewriter').click());
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    docCmView.dispatch({ selection: { anchor: docCmView.state.doc.line(51).from } });
  });
  await page.waitForTimeout(700);
  const centred = await caretY();
  say('typewriter-on', centred);
  if (Math.abs(centred.fraction - 0.5) > 0.15) fail(`the caret sits at ${centred.fraction} of the pane, not near the middle`);

  await page.evaluate(() => document.getElementById('doc-typewriter').click());
  await page.waitForTimeout(300);

  // --- the serif ---------------------------------------------------------
  // `fontFamily` comes back as the declared stack whether or not any face in
  // it exists, so the family alone proves nothing. The width of one run of
  // text, measured with a Range, is the number that says a different face is
  // actually being used to draw it.
  const previewFont = () => page.evaluate(() => {
    const pane = document.getElementById('doc-preview');
    const style = getComputedStyle(pane);
    const para = pane.querySelector('p');
    let width = null;
    if (para && para.firstChild) {
      const range = document.createRange();
      range.selectNodeContents(para);
      width = +range.getBoundingClientRect().width.toFixed(1);
    }
    return {
      family: style.fontFamily.split(',')[0].replace(/"/g, ''),
      lineHeight: style.lineHeight,
      inkWidth: width,
      pressed: document.getElementById('doc-serif').getAttribute('aria-pressed'),
    };
  });
  await page.evaluate(() => setDocView('split'));
  await page.waitForTimeout(600);
  const sans = await previewFont();
  await page.evaluate(() => document.getElementById('doc-serif').click());
  await page.waitForTimeout(400);
  const serif = await previewFont();
  say('preview-font', { sans, serif });
  if (serif.family === sans.family) fail('the serif option changed nothing');
  if (serif.pressed !== 'true') fail('the serif control does not read as pressed');
  if (parseFloat(serif.lineHeight) <= parseFloat(sans.lineHeight)) fail('the leading did not open up with the serif');
  if (sans.inkWidth !== null && serif.inkWidth === sans.inkWidth) fail('the same glyphs at the same width: no serif is actually being drawn');

  await page.evaluate(() => document.getElementById('doc-serif').click());
  await page.waitForTimeout(300);
  const back = await previewFont();
  if (back.family !== sans.family) fail('turning the serif off did not put the face back');

  console.log(bad ? `\nFAILED: ${bad}` : '\nOK: every reading check passed');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
