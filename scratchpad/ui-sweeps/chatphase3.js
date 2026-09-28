// CHAT_PLAN.md Phase 3's gate, as numbers: "Ask renders the answer object;
// follow-ups carry context (the second answer references the first, asserted
// on the fake transport); twelve starters present; offline state renders
// disabled controls with tooltips."
//
//   BASE=http://127.0.0.1:8971 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/chatphase3.js
//
// Run against a server with no model connected, which is this sandbox: that is
// what makes gate line 4 measurable, and the Ask turn still streams (the
// offline branch answers from the search results alone), so lines 1 and 2 are
// measured on a real turn rather than on a mocked DOM.
//
// The follow-up half is measured at the browser, not at the renderer: the
// chips come from `/chat/followups`, which answers [] with no model, so the
// route is stubbed with two picks and then the *next* request to /chat/stream
// is read off the wire. What the gate is about is whether the previous answer
// is in that request, and nothing short of reading the body can say so.
//
// Updated 2026-09-24 (regression sweep after fix/gemini-fixes-5), two gates:
// (1) commit b4b401a ("Ask history keeps its numbered records and no Sources
// box...") removed the Sources box under the answer whenever every source is
// already a row in the Matching records column beside it (the owner,
// 2026-09-20: "having the notes appear as sources below the ai response...
// is unnecessary when they are shown already on the right"); this fixture's
// three notes are always all on the right, so 0 source cards is now correct,
// not a miss. (2) commit 73786b1 ("Ask: place every citation marker and
// number records as the answer streams") started writing inline citation
// digits straight into `#ai-answer`'s text and, being paragraphs, its
// `textContent` also loses the blank lines `answerRaw` keeps, so comparing
// the DOM's rendered text to the next request's `history[].answer` no longer
// says anything: read the same raw text `conversation` holds instead.
const { boot } = require('./lib.js');

const NOTES = [
  'The beans need netting next week in the allotment',
  'Netting the allotment beds keeps the pigeons off the beans',
  'Bought new netting from the garden centre on Tuesday',
];

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // Two picks under every answer, so the chips exist to press.
  await page.route('**/chat/followups', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(['When should I put the netting up?', 'What else is due in the allotment?']),
    })
  );
  const asked = [];
  await page.route('**/chat/stream', async (route) => {
    try {
      asked.push(JSON.parse(route.request().postData() || '{}'));
    } catch (e) {
      asked.push({});
    }
    await route.continue();
  });

  await page.evaluate(async (notes) => {
    const h = { 'X-Auth-Token': localStorage.getItem('token') || '', 'Content-Type': 'application/json' };
    for (const content of notes) {
      await fetch('/entries', { method: 'POST', headers: h, body: JSON.stringify({ content }) });
    }
  }, NOTES);

  await page.evaluate(() => {
    switchTab('notes');
    showNotesSection('ask');
  });
  await page.waitForTimeout(600);
  await page.fill('#question', 'what did I write about beans');
  await page.click('#ask-btn');
  await page.waitForSelector('#ask-followups:not(.hidden)', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);

  // --- gate 1: Ask renders the answer object ---------------------------------
  const first = await page.evaluate(() => ({
    foot: !document.getElementById('ask-answer-foot').classList.contains('hidden'),
    sources: document.querySelectorAll('#ask-answer-sources .chat-source-card').length,
    summary: (document.querySelector('#ask-answer-sources summary') || {}).textContent || '',
    followups: document.querySelectorAll('#ask-followups .chip').length,
    // The raw text actually sent as context, not the rendered DOM: see the
    // 2026-09-24 header note (73786b1's inline citation digits and the
    // paragraph breaks textContent drops both make the DOM text unusable
    // for an equality check against the next request's history).
    answer: (typeof conversation !== 'undefined' && conversation[0] && conversation[0].answer) || '',
    records: document.querySelectorAll('#raw-results li').length,
  }));
  // b4b401a: every seeded note here is already a row in Matching records, so
  // the Sources box under the answer is correctly empty now, not a miss.
  check('1 answer object: no Sources box when every source is on the right',
    first.sources === 0 && first.foot,
    `${first.sources} source card(s), foot visible=${first.foot}, summary "${first.summary.trim()}"`);
  check('1 answer object: the records column still answers',
    first.records >= NOTES.length, `${first.records} matching record(s)`);

  // --- gate 2: follow-ups carry context --------------------------------------
  check('2 follow-ups: chips under the answer', first.followups === 2,
    `${first.followups} chip(s)`);
  const before = asked.length;
  await page.click('#ask-followups .chip');
  await page.waitForTimeout(3000);
  const second = asked[asked.length - 1] || {};
  const history = second.history || [];
  const carries = history.some(
    (turn) => turn.question === 'what did I write about beans' && turn.answer === first.answer
  );
  check('2 follow-ups: the next request carries the answer above it',
    asked.length > before && carries,
    `${history.length} turn(s) of history, previous answer present=${carries}, ` +
    `question "${String(second.question || '').slice(0, 40)}"`);

  // --- gate 3: twelve starters ------------------------------------------------
  await page.keyboard.press('Control+Shift+A');
  await page.waitForTimeout(600);
  const palette = await page.evaluate(() => {
    const box = document.getElementById('command-palette-starters');
    const chips = [...box.querySelectorAll('[data-example]')];
    const card = document.querySelector('.command-palette-card').getBoundingClientRect();
    return {
      chips: chips.length,
      groups: [...box.querySelectorAll('.starter-verb')].map((p) => p.textContent),
      stems: chips.filter((c) => /\s$/.test(c.dataset.example)).length,
      untitled: chips.filter((c) => !c.title).length,
      bottom: Math.round(card.bottom),
      viewport: window.innerHeight,
      disabled: chips.filter((c) => c.disabled).length,
      inputDisabled: document.getElementById('command-palette-input').disabled,
      toggle: !!document.getElementById('command-palette-use-note'),
    };
  });
  // Superseded by the owner's own later instruction (INBOX 190: "starters that
  // depend on the tab you are on"), so the gate line is the twelve plus the
  // current tab's two, under a group named for that tab. Decision 9's twelve
  // are all still there; what changed is that they are no longer all of them.
  check('3 starters: the twelve, plus this tab\'s two, in six groups',
    palette.chips === 14 && palette.groups.length === 6 && /^On /.test(palette.groups[0] || ''),
    `${palette.chips} chip(s), groups ${palette.groups.join(', ')}`);
  check('3 starters: every one carries a tooltip, and the stems are the slots',
    palette.untitled === 0 && palette.stems > 0,
    `${palette.untitled} without a tooltip, ${palette.stems} stem(s)`);
  check('3 starters: the card still fits the window',
    palette.bottom <= palette.viewport, `card bottom ${palette.bottom} of ${palette.viewport}`);
  check('3 starters: "Use the open note" is there', palette.toggle, String(palette.toggle));

  // --- gate 4: offline renders disabled controls with tooltips ----------------
  const offline = await page.evaluate(() => {
    const ids = ['improve-btn', 'draft-compose', 'draft-extract', 'doc-ai'];
    const rows = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((el) => ({ id: el.id, disabled: el.disabled, title: el.title, hidden: el.offsetParent === null && el.closest('.hidden') !== null }));
    const notes = ['ask-offline', 'command-palette-offline'].map((id) => {
      const el = document.getElementById(id);
      return {
        id,
        shown: !el.classList.contains('hidden'),
        link: !!el.querySelector('button'),
        words: el.textContent.trim().length,
      };
    });
    return { rows, notes, agentInput: document.getElementById('command-palette-input').disabled };
  });
  const named = offline.rows.filter((r) => r.title.includes('Connect a model in Settings'));
  check('4 offline: AI-only controls disabled, with the same sentence',
    offline.rows.length > 0 && offline.rows.every((r) => r.disabled) && named.length === offline.rows.length,
    `${offline.rows.length} control(s), ${offline.rows.filter((r) => r.disabled).length} disabled, ` +
    `${named.length} naming Settings`);
  check('4 offline: both surfaces say so and offer the click',
    offline.notes.every((n) => n.shown && n.link && n.words > 20),
    offline.notes.map((n) => `${n.id} shown=${n.shown} link=${n.link} ${n.words} chars`).join('; '));
  check('4 offline: the agent field is disabled rather than hidden',
    offline.agentInput && palette.disabled === palette.chips,
    `field disabled=${offline.agentInput}, ${palette.disabled} of ${palette.chips} starters disabled`);

  check('no page errors', errors.length === 0, `${errors.length}${errors.length ? ': ' + errors[0] : ''}`);

  await browser.close();
  if (fails.length) {
    console.log(`\n${fails.length} gate line(s) failed: ${fails.join(', ')}`);
    process.exit(1);
  }
  console.log('\nPhase 3 gate green.');
})();
