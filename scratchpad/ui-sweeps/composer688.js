// INBOX 688, 714: the Ask box's "Use AI" switch and the composed
// answer, driven in a real browser with no model running.
//
//   bash scratchpad/ui-sweeps/serve.sh 8827 <scratch>/mm-comp
//   .venv/bin/python scratchpad/ui-sweeps/seed-showcase.py 8827 <scratch>/mm-comp
//   BASE=http://127.0.0.1:8827 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     THEME=light node scratchpad/ui-sweeps/composer688.js   (then THEME=dark)
//
// For each width (1440, 390): the switch's state with no model (off and
// disabled with its reason), the toggle (with `aiIsOff`
// stubbed to false: the choice is stored, pressed and sent as `answer_from`),
// then the ten audit questions: every answer composed, labelled, cited, its
// markers pointing at notes in Matching records, no console error, no
// horizontal overflow, the seg and the chip measured.
const { boot } = require('./lib.js');

const QUESTIONS = [
  'What is the Harbor launch plan?',
  'When is the dentist check-up?',
  'Who asked for a public API?',
  'How many beta testers are active?',
  'Which books am I reading?',
  'Compare Lisbon and Porto',
  'Why did the list feel slow?',
  'What is the latest on the sync rewrite?',
  'Does Harbor work offline?',
  'What hotel did I book in Porto?',
];

async function run(width) {
  const height = width < 600 ? 844 : 900;
  const { page, browser } = await boot({ viewport: { width, height }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  const sent = [];
  page.on('request', (r) => { if (r.url().endsWith('/chat/stream')) sent.push(JSON.parse(r.postData() || '{}')); });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(600);
  await page.evaluate(() => showNotesSection('ask'));
  await page.waitForTimeout(4000); // ask-compose.js is preloaded 3 s after boot
  const findings = [];

  const seg = await page.evaluate(() => {
    const box = document.getElementById('ask-use-ai');
    const r = box.closest('label').getBoundingClientRect();
    return { checked: box.checked, disabled: box.disabled, title: box.closest('label').title, wired: box.dataset.wired, right: Math.round(r.right), vw: innerWidth };
  });
  console.log(`[${width}] use-ai`, JSON.stringify(seg));
  if (seg.wired !== '1') findings.push('the switch was never wired (ask-compose.js not loaded)');
  if (seg.checked) findings.push('no model, but Use AI is on');
  if (!seg.disabled || !/No model is running/.test(seg.title)) findings.push('no model, but Use AI is not disabled with its reason');
  if (seg.right > seg.vw) findings.push(`the switch runs off screen: right ${seg.right} > ${seg.vw}`);

  // The toggle itself, with a model "running": stored, checked, sent.
  const toggle = await page.evaluate(async () => {
    const real = window.aiIsOff;
    window.aiIsOff = () => false;
    renderAskUseAi();
    const box = document.getElementById('ask-use-ai');
    const out = { enabled: !box.disabled, on: box.checked };
    box.click();
    out.afterOff = [localStorage.getItem('ask-answer-from'), box.checked];
    box.click();
    out.afterOn = [localStorage.getItem('ask-answer-from'), box.checked];
    box.click();
    window.aiIsOff = real;
    renderAskUseAi();
    return out;
  });
  console.log(`[${width}] toggle`, JSON.stringify(toggle));
  if (!toggle.enabled || !toggle.on || toggle.afterOff.join() !== 'notes,false' || toggle.afterOn.join() !== 'ai,true') {
    findings.push('the toggle does not store and show the choice');
  }

  const answers = [];
  for (const q of QUESTIONS) {
    await page.fill('#question', q);
    await page.click('#ask-btn');
    await page.waitForFunction(() => {
      const a = document.getElementById('ai-answer');
      return a && !a.classList.contains('is-generating') && a.textContent.trim().length > 0;
    }, null, { timeout: 20000 }).catch(() => findings.push(`"${q}": no answer in 20 s`));
    await page.waitForTimeout(400);
    const got = await page.evaluate(() => {
      const a = document.getElementById('ai-answer');
      const ids = new Set([...document.querySelectorAll('#raw-results [data-id], #raw-results [data-entry-id]')]
        .map((li) => Number(li.dataset.id || li.dataset.entryId)));
      const marks = [...a.querySelectorAll('.answer-citation')];
      const chip = document.getElementById('answered-by');
      const quote = a.querySelector('blockquote');
      return {
        composed: a.classList.contains('answer-composed'),
        chip: chip.textContent, chipTitle: chip.title, chipClipped: chip.scrollWidth > chip.clientWidth + 1,
        marks: marks.length,
        unresolved: marks.filter((m) => !ids.has(Number(m.dataset.noteId))).map((m) => m.dataset.noteId),
        overflow: document.scrollingElement.scrollWidth > innerWidth,
        answerOverflow: a.scrollWidth > a.clientWidth + 1,
        quoteInk: quote ? getComputedStyle(quote).color : null,
        ink: getComputedStyle(document.body).color,
        text: a.innerText.slice(0, 2000),
        blocks: a.children.length,
      };
    });
    answers.push({ q, ...got });
    if (!got.composed) findings.push(`"${q}": not marked composed`);
    if (got.chip !== 'Your notes, no AI') findings.push(`"${q}": chip reads "${got.chip}"`);
    if (!got.marks) findings.push(`"${q}": no citation markers`);
    if (got.unresolved.length) findings.push(`"${q}": markers for notes not in Matching records: ${got.unresolved}`);
    if (got.overflow) findings.push(`"${q}": the page scrolls sideways`);
    if (got.answerOverflow) findings.push(`"${q}": the answer overflows its card`);
    if (got.quoteInk && got.quoteInk !== got.ink) findings.push(`"${q}": the lead quote is not in ink (${got.quoteInk} vs ${got.ink})`);
  }
  const lastBody = sent[sent.length - 1] || {};
  if (lastBody.notes_only !== true || lastBody.answer_from !== 'notes') {
    findings.push(`the request did not carry the choice: ${JSON.stringify({ notes_only: lastBody.notes_only, answer_from: lastBody.answer_from })}`);
  }
  for (const a of answers) {
    console.log(`[${width}] ${a.q}: marks ${a.marks}, blocks ${a.blocks}, chip clipped ${a.chipClipped}`);
  }
  if (process.env.SHOTS) {
    await page.screenshot({ path: `${process.env.SCRATCH || '.'}/composer688-${process.env.THEME || 'light'}-${width}.png`, fullPage: false });
  }
  console.log(`[${width}] errors: ${errors.length ? errors.join(' | ') : 'none'}`);
  console.log(`[${width}] findings: ${findings.length ? '\n  ' + findings.join('\n  ') : 'none'}`);
  await browser.close();
  return findings.length + errors.length;
}

(async () => {
  let bad = 0;
  for (const width of [1440, 390]) bad += await run(width);
  process.exit(bad ? 1 : 0);
})();
