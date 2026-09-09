// Live view: do the markdown markers go invisible, and come back when the
// selection reaches them?
//
// The owner: "md formatting should go invisible unless i click back on that
// word or section or navigate with backspace, delete or arrow keys etc to
// where those formatting markers are."
//
// Two halves, and the second is the one nothing checked before. The first is
// an inventory: with the caret parked away from everything, which constructs
// still render their own syntax? That is how the two gaps this sweep was
// written alongside were found (`---` drew a border *and* its three dashes;
// `> [!note]` hid its `>` and kept its `[!note]`). The second is the reveal
// itself, driven through the three gestures the owner named, because they are
// three different code paths into the same selection change and only one of
// them is a keypress the plugin could plausibly miss.
//
// `- a bullet`, `1. a number` and a fenced block's ``` are expected to keep
// their markers: a list without bullets is not a list, and a fence with no
// boundary has none. Tables are Phase 3. Those are recorded as expected
// rather than skipped, so a change that starts hiding them fails here.
//
//   BASE=http://127.0.0.1:8830 node scratchpad/ui-sweeps/cm-reveal.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

// Each line, and what it should render as with the caret elsewhere.
const CASES = [
  ['# H1 heading', 'H1 heading'],
  ['Some **bold** and *em* and ~~struck~~ and `code`.', 'Some bold and em and struck and code.'],
  ['> a block quote', 'a block quote'],
  ['- a bullet', '- a bullet'],
  ['1. a number', '1. a number'],
  ['- [ ] a task', '-  a task'],
  ['---', ''],
  ['==highlighted== and [[wikilink]] and [label](/path).', 'highlighted and wikilink and label.'],
];
// The `Title` / `=====` form. Its underline is a HeaderMark like any other, so
// it was already being hidden while the heading branch matched `ATXHeading`
// only: the markers went and the line stayed body text. Both lines are checked
// here, the second for the hidden underline and the first for the class.
const SETEXT = ['A setext heading', '================'];
// A callout is its own block: put it after a blank line, or the blockquote
// above swallows it and the first line the plugin reads is that one instead.
const CALLOUT = '> [!warning] a callout';

(async () => {
  const { browser, page } = await boot();
  const say = (k, v) => console.log(`${k}: ${JSON.stringify(v)}`);
  let bad = 0;
  const fail = (m) => { console.log('FAIL: ' + m); bad++; };

  const body = CASES.map(([src]) => src).join('\n\n') + '\n\n' + CALLOUT
    + '\n\n' + SETEXT.join('\n') + '\n\ntail\n';
  await openDoc(page, { title: 'Reveal', content: body });
  await page.waitForTimeout(1400);
  say('view', await page.evaluate(() => docView));

  const lines = () => page.evaluate(() => [...document.querySelectorAll('#doc-editor .cm-line')].map((l) => l.innerText.replace(/\n/g, '')));

  // The caret goes to the very end, so nothing on any case line is touched.
  await page.evaluate(() => { const s = docSurface(); const n = s.text.length; s.focus(); s.setSelection(n, n); });
  await page.waitForTimeout(500);
  const parked = await lines();
  // Case i sits on rendered line 2i: the body joins the cases with a blank
  // line, and a blank source line is a rendered line of its own.
  for (let i = 0; i < CASES.length; i++) {
    const [src, want] = CASES[i];
    const got = parked[i * 2];
    say(`hidden_${i}`, { src, want, got });
    if (got !== want) fail(`"${src}" rendered as ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  }
  const setext = await page.evaluate((first) => {
    const line = [...document.querySelectorAll('#doc-editor .cm-line')].find((l) => l.innerText.trim() === first);
    if (!line) return null;
    const next = line.nextElementSibling;
    return { classes: line.className, underlineHidden: next ? next.innerText.trim() === '' : null };
  }, SETEXT[0]);
  say('setext_heading', setext);
  if (!setext) fail('the setext heading is not in the render at all');
  else {
    if (!/cm-md-h1/.test(setext.classes)) fail(`a setext heading gets no heading class (${setext.classes})`);
    if (setext.underlineHidden === false) fail('a setext heading shows its own === underline');
  }

  const label = await page.evaluate(() => {
    const e = document.querySelector('.cm-md-callout-label');
    return e ? e.textContent : null;
  });
  say('callout_label', label);
  if (!label || !/Warning/.test(label)) fail(`the callout kept its [!warning] marker (label ${JSON.stringify(label)})`);

  // The reveal, through each gesture the owner named. The bold run is the
  // subject: park past it, then reach it three different ways.
  const boldAt = await page.evaluate(() => docSurface().text.indexOf('**bold**'));
  const shows = () => page.evaluate(() => document.querySelector('#doc-editor .cm-content').innerText.includes('**bold**'));

  const park = (n) => page.evaluate((p) => { const s = docSurface(); s.focus(); s.setSelection(p, p); }, n);

  // Click: put the selection inside the run, which is what a click does.
  await park(boldAt + 3);
  await page.waitForTimeout(300);
  say('reveal_by_selection', await shows());
  if (!(await shows())) fail('a selection inside **bold** did not reveal its markers');

  // Arrow keys: park one past the closing marker and walk left onto it.
  await park(boldAt + 9);
  await page.waitForTimeout(300);
  say('parked_past', await shows());
  if (await shows()) fail('the markers were showing before the caret reached them');
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(300);
  say('reveal_by_arrowleft', await shows());
  if (!(await shows())) fail('ArrowLeft onto the closing marker did not reveal it');

  // Backspace and Delete both move the selection, so both must repaint.
  await park(boldAt + 20);
  await page.waitForTimeout(250);
  if (await shows()) fail('parked well past the run and the markers were still up');
  for (const key of ['Backspace', 'Delete']) {
    await park(boldAt + 20);
    await page.waitForTimeout(200);
    // Walk to the edge of the run with that key alone.
    for (let i = 0; i < 12 && !(await shows()); i++) {
      await page.keyboard.press(key === 'Backspace' ? 'Backspace' : 'ArrowLeft');
      if (key === 'Delete') await page.keyboard.press('Delete');
      await page.waitForTimeout(90);
    }
    say(`reveal_by_${key.toLowerCase()}`, await shows());
    if (!(await shows())) fail(`${key} never reached the markers`);
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
  }

  console.log(bad ? `cm-reveal: ${bad} failures` : 'cm-reveal: all checks pass');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
