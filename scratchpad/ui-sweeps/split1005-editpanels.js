// The edit form's Similar and saved-links panels after they moved to
// note-edit-panels.js (2026-10-05): pressing Edit loads the file through the
// stand-ins and both panels draw under the text; the picker opens.
//   BASE=http://127.0.0.1:8824 node scratchpad/ui-sweeps/split1005-editpanels.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.evaluate(() => { switchTab('notes'); showNotesSection('browse'); });
  await page.waitForSelector('#entry-list li[data-id]', { timeout: 20000 });
  const out = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const id = Number(document.querySelector('#entry-list li[data-id]').dataset.id);
    const before = typeof openBookmarkAttachPicker;
    await openNoteEditor(id);
    await wait(2000);
    const li = document.querySelector(`#entry-list li[data-id="${id}"]`);
    const panels = [...li.querySelectorAll('.entry-related-live')].map((p) => p.textContent.trim().slice(0, 60));
    return { before, after: typeof openBookmarkAttachPicker, editing: !!li.querySelector('textarea'), panels };
  });
  console.log(JSON.stringify(out), 'errors:', JSON.stringify(errors));
  await browser.close();
})();
