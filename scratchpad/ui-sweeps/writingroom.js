// The writing desk (Notes → Write with AI), measured against what
// WORLD_CLASS_PLAN D16 asked for. INBOX 274, the owner: "I want to improve
// the design, capabilities and features in the write with ai subtab in notes
// because I think it is falling behind."
//
// What it checks, each as a number rather than a look:
//   * the dock is on the grammar: seven controls or fewer, exactly one filled;
//   * a draft against a stand-in model server arrives in MORE THAN ONE piece
//     (the whole point of the stream: it used to arrive in one, 22.9s later);
//   * the result's actions are one row, and the quick starts are chips;
//   * at 390 the desk is one column and every control is at 44px;
//   * 0 console errors at both widths.
//
// With no FAKE server the draft half is skipped rather than failed, so this
// is still useful as a layout sweep on a machine with no model:
//
//   BASE=http://127.0.0.1:8967 FAKE=http://127.0.0.1:8969/v1 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/writingroom.js
const { boot } = require('./lib.js');
const FAKE = process.env.FAKE || '';

const open = (page) => page.evaluate(() => { switchTab('notes'); showNotesSection('writing-room'); });

(async () => {
  const bad = [];
  const errs = [];

  // --- 1440: the dock, the desk, the actions row ---------------------------
  const wide = await boot({ viewport: { width: 1440, height: 900 } });
  wide.page.on('console', (m) => { if (m.type() === 'error') errs.push('1440: ' + m.text().slice(0, 140)); });
  await open(wide.page);
  await wide.page.waitForTimeout(700);
  const desk = await wide.page.evaluate(() => {
    const sec = document.getElementById('writing-room');
    const vis = (el) => el.offsetParent !== null;
    const dock = sec.querySelector('.dock');
    // A zone's own direct children, which is what the stylesheet and
    // tests/test_dock_grammar.py both mean by "in the dock": the rows inside
    // a closed `.dock-menu` still have layout boxes (every dock in the app is
    // like this) and are neither drawn nor tappable.
    const dockControls = [...dock.querySelectorAll(':scope > * > button, :scope > * > input, :scope > * > select, :scope > * > details > summary')].filter(vis);
    const filled = dockControls.filter((el) => el.tagName === 'BUTTON'
      && !el.classList.contains('ghost') && !el.classList.contains('icon-only'));
    const heights = [...new Set(dockControls.map((el) => +el.getBoundingClientRect().height.toFixed(1)))];
    const actions = [...sec.querySelectorAll('.draft-actions-row button')].filter(vis);
    const actionTops = [...new Set(actions.map((b) => Math.round(b.getBoundingClientRect().top)))];
    return {
      dockName: dock.dataset.dockName || '',
      dockControls: dockControls.length,
      dockLabels: dockControls.map((el) => (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18)),
      filled: filled.length,
      filledLabel: filled.map((b) => b.textContent.trim()).join('/'),
      dockHeights: heights,
      quickstarts: sec.querySelectorAll('#draft-quickstarts .library-chip').length,
      actions: actions.length,
      actionLabels: actions.map((b) => b.textContent.trim()),
      actionLines: actionTops.length,
      helpRecipe: !!sec.querySelector('[data-help-for]'),
      offlineRow: !!sec.querySelector('.ai-offline-note'),
      selects: sec.querySelectorAll('.draft-desk-controls select').length,
    };
  });
  console.log(`dock "${desk.dockName}": ${desk.dockControls} controls (${desk.dockLabels.join(', ')}), `
    + `${desk.filled} filled (${desk.filledLabel}), heights ${desk.dockHeights.join('/')}`);
  console.log(`desk: ${desk.quickstarts} quick-start chips, ${desk.selects} shape selects, `
    + `help recipe ${desk.helpRecipe}, offline row ${desk.offlineRow}`);
  console.log(`actions: ${desk.actions} on ${desk.actionLines} line(s): ${desk.actionLabels.join(' | ')}`);
  if (desk.dockControls > 7) bad.push(`dock holds ${desk.dockControls} controls, the grammar allows 7`);
  if (desk.filled !== 1) bad.push(`dock has ${desk.filled} filled buttons, the grammar allows 1`);
  if (desk.quickstarts < 3) bad.push('fewer than three quick starts');
  if (desk.actions < 3 || desk.actionLines !== 1) bad.push('the draft actions are not one row of three or more');
  if (!desk.helpRecipe) bad.push('the help is not on the data-help-for recipe');
  if (!desk.offlineRow) bad.push('no offline row, so no model has no way out drawn');

  // --- the stream, against the stand-in model server -----------------------
  if (FAKE) {
    await wide.page.evaluate(async (base) => {
      await api('/models/provider', { method: 'POST', body: JSON.stringify({ provider: 'openai', base_url: base }) });
      await api('/models/chat-model', { method: 'POST', body: JSON.stringify({ name: 'fake-local-tools' }) });
    }, FAKE);
    await wide.page.waitForTimeout(2500);
    await open(wide.page);
    await wide.page.waitForTimeout(600);
    await wide.page.fill('#draft-thoughts', 'roof leak. plumber tuesday. costs maybe 400');
    // **Every write to the box, not a poll of it.** A poll at 50ms saw two
    // values of an 82-character draft that the stand-in server delivers in
    // 150ms, which says nothing about whether it streamed: an own accessor
    // over the prototype's records each write as the reader makes it. Same
    // hook `noteSurfaceOwnValue` (documents.js) installs, for the same
    // reason: assigning to `.value` raises no event anyone can listen for.
    await wide.page.evaluate(() => {
      window.__ticks = [];
      const box = document.getElementById('draft-text');
      const proto = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
      Object.defineProperty(box, 'value', {
        configurable: true,
        get() { return proto.get.call(this); },
        set(next) { window.__ticks.push(String(next)); proto.set.call(this, next); },
      });
    });
    const t0 = Date.now();
    await wide.page.click('#draft-compose');
    const first = await wide.page.waitForFunction(
      () => document.getElementById('draft-text').value.trim().length > 0, { timeout: 60000 }
    ).then(() => Date.now() - t0).catch(() => -1);
    await wide.page.waitForFunction(
      () => document.getElementById('draft-compose').classList.contains('hidden') === false, { timeout: 60000 }
    ).catch(() => {});
    await wide.page.waitForTimeout(500);
    const run = await wide.page.evaluate(() => {
      return {
        pieces: window.__ticks.filter((t) => t.trim()).length,
        lens: window.__ticks.map((t) => t.length),
        thinkingSeen: !document.getElementById('draft-thinking').classList.contains('hidden'),
        status: document.getElementById('draft-status').textContent,
        versions: document.querySelectorAll('#draft-versions .library-chip').length,
      };
    });
    console.log(`stream: first text after ${first}ms, ${run.pieces} distinct values `
      + `(lengths ${run.lens.slice(0, 8).join(',')}${run.lens.length > 8 ? ',…' : ''}), `
      + `thinking shown ${run.thinkingSeen}, status "${run.status.slice(0, 60)}"`);
    if (run.pieces < 2) bad.push(`the draft arrived in ${run.pieces} piece(s), so it did not stream`);
  } else {
    console.log('stream: skipped (no FAKE server given)');
  }
  await wide.browser.close();

  // --- 390: one column, 44px targets --------------------------------------
  const phone = await boot({ viewport: { width: 390, height: 844 } });
  phone.page.on('console', (m) => { if (m.type() === 'error') errs.push('390: ' + m.text().slice(0, 140)); });
  await open(phone.page);
  await phone.page.waitForTimeout(700);
  const small = await phone.page.evaluate(() => {
    const sec = document.getElementById('writing-room');
    const vis = (el) => el.offsetParent !== null;
    const cols = getComputedStyle(sec.querySelector('.draft-columns')).gridTemplateColumns.split(' ').length;
    // A closed dock menu's rows are excluded for the reason the dock scope
    // above gives: they have boxes and are neither drawn nor tappable.
    const controls = [...sec.querySelectorAll('button, input, select')]
      .filter(vis)
      .filter((el) => !el.closest('details:not([open]) .dock-menu-list'));
    const small = controls
      .map((el) => ({ id: el.id || el.className.toString().slice(0, 24), h: +el.getBoundingClientRect().height.toFixed(1) }))
      .filter((c) => c.h < 44 && c.h > 0);
    const overflow = sec.scrollWidth - sec.clientWidth;
    return { cols, controls: controls.length, small, overflow };
  });
  console.log(`390: ${small.cols} column(s), ${small.controls} visible controls, `
    + `${small.small.length} under 44px${small.small.length ? ': ' + small.small.map((c) => c.id + ' ' + c.h).join(', ') : ''}, `
    + `sideways overflow ${small.overflow}px`);
  if (small.cols !== 1) bad.push(`the desk is ${small.cols} columns at 390`);
  if (small.overflow > 1) bad.push(`the desk scrolls sideways by ${small.overflow}px at 390`);
  if (small.small.length) bad.push(`${small.small.length} control(s) under 44px at 390`);
  await phone.browser.close();

  console.log(`console errors ${errs.length}${errs.length ? ': ' + errs.join(' | ') : ''}`);
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
