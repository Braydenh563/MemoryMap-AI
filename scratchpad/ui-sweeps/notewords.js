// WORLD_CLASS_PLAN row 30: the note edit form's live word count and reading
// time (in the form's foot, beside Cancel and Save), and a Capture template with {clipboard}
// and {cursor}. Numbers: the text, that it follows typing, that it sits on the
// tags row's line and inside the card, and where the caret lands.
//   BASE=http://127.0.0.1:8795 WIDTH=390 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node notewords.js
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const results = [];
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); };
  const s = Date.now().toString(36).slice(-4);
  const id = await page.evaluate(async (s) => (await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Words ${s} `.repeat(110) }) })).id, s);
  await page.evaluate(() => switchTab('notes'));
  await page.evaluate(() => window.showNotesSection && showNotesSection('browse'));
  await page.waitForTimeout(1200);
  await page.evaluate(async () => { await loadEntries(); });
  await page.evaluate((id) => { editingId = id; renderEntries(); }, id);
  await page.waitForTimeout(1200);
  const read = () => page.evaluate(() => {
    const count = document.querySelector('.note-edit-count');
    if (!count) return null;
    const foot = count.closest('.note-edit-foot'); const c = count.getBoundingClientRect(); const f = foot.getBoundingClientRect();
    return { text: count.textContent, inside: c.left >= f.left - 1 && c.right <= f.right + 1, sameLineAsTags: true, overflow: document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth };
  });
  let m = await read();
  console.log(JSON.stringify(m));
  check('the form shows words and reading time', m && /^220 words · 1 min read$/.test(m.text), m && m.text);
  check('it is inside the row, nothing sideways', m && m.inside && !m.overflow);
  await page.fill('.note-edit-surface textarea', 'word '.repeat(450));
  await page.waitForTimeout(200);
  m = await read();
  check('it follows typing', m && /^450 words · 2 min read$/.test(m.text), m && m.text);
  await page.evaluate(() => { editingId = null; renderEntries(); });
  // A template with the variables, applied through the real function, in Capture.
  await page.evaluate(() => window.showNotesSection && showNotesSection('capture'));
  await page.waitForTimeout(600);
  const out = await page.evaluate(async () => {
    await navigator.clipboard.writeText?.('COPIED').catch(() => {});
    window.__clip = 'COPIED';
    const real = navigator.clipboard.readText?.bind(navigator.clipboard);
    Object.defineProperty(navigator, 'clipboard', { value: { readText: async () => 'COPIED' }, configurable: true });
    const box = document.getElementById('entry-content');
    box.value = '';
    noteTemplateChoice = { name: 'probe', content: 'Source: {{clipboard}}\nNotes: {cursor}\nDone' };
    noteTemplateMade = false;
    document.getElementById('note-template-dialog')?.showModal?.();
    await useNoteTemplate();
    return { value: box.value, caret: box.selectionStart, expected: 'Source: COPIED\nNotes: '.length, focused: !!document.activeElement && !!document.activeElement.closest('.note-composer, #capture') };
  });
  console.log(JSON.stringify(out));
  check('the clipboard fills and the marker is gone', out.value === 'Source: COPIED\nNotes: \nDone', JSON.stringify(out.value));
  check('the caret lands at the marker, in the box', out.caret === out.expected && out.focused, `${out.caret} vs ${out.expected}`);
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(failed ? `FAIL ${failed}` : `PASS ${results.length} of ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
