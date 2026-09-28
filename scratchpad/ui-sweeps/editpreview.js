// The note edit form's Preview: what stays on screen beside the preview.
const {boot} = require('./lib');
(async () => {
  const {browser, page} = await boot();
  await page.evaluate(async () => {
    await apiJson('/entries', {method: 'POST', body: JSON.stringify({content: 'I am about to go to gym when Gene gets back to me', category: 'Gym'})});
    switchTab('notes'); showNotesSection('browse'); await loadEntries();
  });
  await page.waitForTimeout(1200);
  await page.evaluate((k) => { localStorage.setItem(k, '1'); editingId = allEntries[0].id; renderEntries(); }, "doc-gutter");
  await page.waitForTimeout(1200);
  const measure = () => page.evaluate(() => {
    const ta = document.getElementById('entry-edit-content');
    const li = ta.closest('li') || ta.parentElement.parentElement;
    return [...li.querySelectorAll('*')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 20 && (el.matches('textarea, .doc-gutter, .note-edit-preview, .gutter-wrap, .cm-editor, [class*=live], [class*=surface]')); })
      .map(el => ({tag: el.tagName, cls: String(el.className).slice(0, 50), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height)}));
  });
  console.log('write', JSON.stringify(await measure()));
  await page.evaluate(() => document.querySelector('[data-note-preview]').click());
  await page.waitForTimeout(600);
  console.log('preview', JSON.stringify(await measure()));
  await page.screenshot({path: '/tmp/claude-0/editpreview.png'});
  await browser.close();
})();
