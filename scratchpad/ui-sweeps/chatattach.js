// The chat attach popup (INBOX 431: redesign on the new recipes -- dialog
// head, quiet segmented tabs, search with icon, compact rows with check,
// a category chip that never wraps, a sticky footer). The segmented tabs
// and the footer already met the recipe (the tabs are the shared `.seg`
// every sub-tab strip uses; the footer is a flex sibling outside the
// list's own scroller, so it was never going to scroll away). Added: a
// `.dialog-head` (title, Close), a `.search-field` well with a leading
// glyph (generalised from the Web panel's own `.web-search-field`), and
// `flex: none` on the row's chip so a long name can never squeeze it onto
// a second line.
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1093, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(800);
  await page.click('#attach-note');
  await page.waitForTimeout(400);

  const problems = [];
  const state = await page.evaluate(() => {
    const panel = document.getElementById('note-picker-panel');
    const head = panel.querySelector('.dialog-head');
    const title = head?.querySelector('.dialog-head-title');
    const close = document.getElementById('note-picker-close');
    const search = panel.querySelector('.search-field');
    const icon = search?.querySelector('.search-field-icon');
    const input = search?.querySelector('.search-field-input');
    return {
      panelOpen: !panel.classList.contains('hidden'),
      headPresent: Boolean(head),
      titleText: title?.textContent.trim() || '',
      closeIsIconOnly: Boolean(close && close.classList.contains('icon-only') && close.classList.contains('dialog-head-btn')),
      searchFieldPresent: Boolean(search && icon && input),
      segClass: panel.querySelector('#note-picker-sources')?.className || '',
    };
  });

  if (!state.panelOpen) problems.push('panel did not open');
  if (!state.headPresent) problems.push('no .dialog-head');
  if (!state.titleText) problems.push('dialog head has no title text');
  if (!state.closeIsIconOnly) problems.push('close is not the icon-only dialog-head-btn recipe');
  if (!state.searchFieldPresent) problems.push('search field is missing its well or icon');
  if (!/\bseg\b/.test(state.segClass)) problems.push('source tabs are not the shared .seg control');

  // A row's chip must never wrap: a wrapped chip's own text has more scroll
  // height than the single line its `overflow: hidden` box actually shows
  // (there is none here, but a future rule with `overflow: hidden` back on
  // the chip would want this same check to still catch it); compared
  // instead against the row's own name column, which the chip must never
  // grow past a single line of.
  const chipHeight = await page.evaluate(() => {
    const row = document.querySelector('#note-picker-list li');
    const chip = row?.querySelector('.chip');
    const name = row?.querySelector('.note-picker-text');
    return chip && name
      ? { chip: chip.getBoundingClientRect().height, name: name.getBoundingClientRect().height }
      : null;
  });
  // A chip wrapping onto a second line is roughly double a one-line chip's
  // own height; comparing to the row's own single-line name column (which
  // cannot wrap, `white-space: nowrap`) is a threshold that tracks the
  // font-size setting instead of a guessed pixel count.
  if (chipHeight && chipHeight.chip > chipHeight.name * 1.5) {
    problems.push(`chip is ${chipHeight.chip}px tall against a ${chipHeight.name}px name line (wrapped)`);
  }

  // The close button actually closes the panel.
  await page.click('#note-picker-close');
  await page.waitForTimeout(200);
  const closedAfter = await page.evaluate(() => document.getElementById('note-picker-panel').classList.contains('hidden'));
  if (!closedAfter) problems.push('the dialog-head Close button did not close the panel');

  console.log(JSON.stringify({ theme: process.env.THEME || 'light', state, chipHeight, problems, errors }, null, 2));
  await browser.close();

  // The phone sheet (INBOX 431 found-not-fixed, then fixed): the popover's
  // own `bottom: calc(100% + 0.5rem)` landed above where `#tab-chat` (the
  // scrolling ancestor) actually painted on a narrow, wrapped composer --
  // present in the DOM, a real box from getBoundingClientRect, invisible on
  // screen, the empty state's own content showing through instead.
  // `openNotePicker`'s phone path (chat-attach.js) moves it into a sheet
  // instead, the same fix `openChatDockMore` already uses for this shape.
  const phoneErrors = [];
  const phone = await boot({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  phone.page.on('pageerror', (e) => phoneErrors.push(String(e).slice(0, 200)));
  phone.page.on('console', (m) => { if (m.type() === 'error') phoneErrors.push(m.text().slice(0, 200)); });
  await phone.page.evaluate(() => switchTab('chat'));
  await phone.page.waitForTimeout(800);
  await phone.page.click('#attach-note');
  await phone.page.waitForTimeout(500);
  const phoneState = await phone.page.evaluate(() => {
    const panel = document.getElementById('note-picker-panel');
    const sheet = document.querySelector('.sheet-overlay[data-sheet="attach"]');
    const search = panel.querySelector('.search-field');
    const r = panel.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(30, r.height / 2));
    return {
      inSheet: Boolean(sheet && sheet.contains(panel)),
      panelIsTopmost: panel.contains(top),
      searchHeight: search ? search.getBoundingClientRect().height : 0,
      panelHeight: r.height,
    };
  });
  const phoneProblems = [];
  if (!phoneState.inSheet) phoneProblems.push('the popup did not move into a sheet at 390');
  if (!phoneState.panelIsTopmost) phoneProblems.push('something else paints over the sheeted popup');
  if (phoneState.searchHeight < 40) phoneProblems.push(`search field shrank to ${phoneState.searchHeight}px (a flex column squeeze)`);
  if (phoneState.panelHeight > 700) phoneProblems.push(`sheet content is ${phoneState.panelHeight}px tall, past the sheet's own cap`);
  // Interacting inside must not close it (the click-away guard's own
  // `.sheet-overlay` exemption, wiring.js).
  await phone.page.click('[data-picker-source="documents"]');
  await phone.page.waitForTimeout(200);
  const stillOpen = await phone.page.evaluate(() => document.getElementById('note-picker-panel').offsetParent !== null);
  if (!stillOpen) phoneProblems.push('a click on a tab inside the sheet closed it');
  console.log(JSON.stringify({ phoneState, phoneProblems, phoneErrors }, null, 2));
  await phone.browser.close();

  if (problems.length || errors.length || phoneProblems.length || phoneErrors.length) process.exit(1);
})().catch((e) => { console.error('SWEEP_ERROR', e.message, e.stack); process.exit(1); });
