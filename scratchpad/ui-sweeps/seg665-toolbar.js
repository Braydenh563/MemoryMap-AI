// INBOX 665 (d): the note formatting strip, Capture and the note edit form,
// measured against its own bordered box at every width. "Over" is how far the
// furthest visible control's right edge passes the strip's inner edge (its
// border box less the border); 0 is the standard, and More must be the way to
// what does not fit.
//   BASE=... [THEME=dark] node scratchpad/ui-sweeps/seg665-toolbar.js
const { boot } = require('./lib.js');
const WIDTHS = [320, 360, 390, 600, 768, 1024, 1184, 1440, 1920];
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${c || d === undefined ? '' : '  ' + d}`); };
const measure = (sel) => {
  const bars = [...document.querySelectorAll(sel)].filter((b) => b.getClientRects().length);
  return bars.map((bar) => {
    const cs = getComputedStyle(bar);
    const r = bar.getBoundingClientRect();
    const inner = r.right - parseFloat(cs.borderRightWidth);
    const left = r.left + parseFloat(cs.borderLeftWidth);
    const ctl = [...bar.querySelectorAll('button, .select-shell, select:not([aria-hidden="true"])')]
      .filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.doc-dock-menu-list') && !(el.closest('.doc-toolbar-over') && !bar.classList.contains('is-more-open')));
    let over = 0; let who = '';
    for (const el of ctl) {
      const er = el.getBoundingClientRect();
      if (er.width < 2) continue;
      const o = Math.max(er.right - inner, left - er.left);
      if (o > over) { over = o; who = el.getAttribute('aria-label') || el.title || el.className; }
    }
    // The bordered box the strip sits in, when the strip has no border of its own.
    const box = bar.closest('.note-composer, .note-edit-form, form, li') || bar.parentElement;
    const br = box.getBoundingClientRect();
    const bcs = getComputedStyle(box);
    const boxInner = br.right - parseFloat(bcs.borderRightWidth);
    const boxOver = Math.max(0, ...ctl.map((el) => el.getBoundingClientRect().right - boxInner));
    const more = bar.querySelector('.doc-toolbar-more');
    return {
      over: Math.round(over * 10) / 10, who, boxOver: Math.round(boxOver * 10) / 10,
      scroll: bar.scrollWidth - bar.clientWidth, w: Math.round(r.width),
      folded: bar.querySelectorAll('.doc-toolbar-over:not(.doc-toolbar-sep)').length,
      more: more ? !more.hidden : null, wrap: cs.flexWrap,
    };
  });
};
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  await page.evaluate(async () => {
    await ensureModule('library');
    await api('/entries', { method: 'POST', body: JSON.stringify({ content: 'toolbar probe note', category: 'General' }) });
  });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1200);
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.evaluate(() => { if (typeof showNotesSection === 'function') showNotesSection('capture'); });
    await page.waitForTimeout(700);
    const [cap] = await page.evaluate(measure, '#note-toolbar');
    if (!cap) { ok(`${w} capture strip on screen`, false); continue; }
    console.log(`@${w} capture ${JSON.stringify(cap)}`);
    ok(`${w} capture: nothing crosses the strip's border`, cap.over <= 0 && cap.boxOver <= 0 && cap.scroll <= 0, JSON.stringify(cap));
    if (cap.more) {
      await page.evaluate(() => document.querySelector('#note-toolbar .doc-toolbar-more').click());
      await page.waitForTimeout(400);
      const [open] = await page.evaluate(measure, '#note-toolbar');
      console.log(`@${w} capture, More open ${JSON.stringify(open)}`);
      ok(`${w} capture, More open: every tool inside the border`, open.over <= 0 && open.boxOver <= 0, JSON.stringify(open));
      await page.evaluate(() => document.querySelector('#note-toolbar .doc-toolbar-more').click());
      await page.waitForTimeout(300);
    }
    await page.evaluate(async () => {
      showNotesSection?.('list');
      const first = document.querySelector('#entry-list > li[data-id]');
      editingId = Number(first?.dataset.id);
      await loadEntries?.();
    });
    await page.waitForTimeout(800);
    const [edit] = await page.evaluate(measure, '.note-edit-toolbar');
    if (!edit) { ok(`${w} edit strip on screen`, false); continue; }
    console.log(`@${w} edit    ${JSON.stringify(edit)}`);
    ok(`${w} edit: nothing crosses the strip's border`, edit.over <= 0 && edit.boxOver <= 0 && edit.scroll <= 0, JSON.stringify(edit));
    if (edit.more) {
      await page.evaluate(() => document.querySelector('.note-edit-toolbar .doc-toolbar-more').click());
      await page.waitForTimeout(400);
      const [open] = await page.evaluate(measure, '.note-edit-toolbar');
      console.log(`@${w} edit, More open ${JSON.stringify(open)}`);
      ok(`${w} edit, More open: every tool inside the border`, open.over <= 0 && open.boxOver <= 0, JSON.stringify(open));
    }
    await page.evaluate(async () => { editingId = null; await loadEntries?.(); });
  }
  ok('no console errors', errors.length === 0, errors.join(' | '));
  console.log(bad ? `${bad} FAIL` : 'all pass');
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
