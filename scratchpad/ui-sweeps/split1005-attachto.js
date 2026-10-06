// "Put on a board" and "Add to a document" under a note card after they moved
// to attach-to.js (2026-10-05): the stand-ins load the file and the picker
// draws into the card's inline-action row.
//   BASE=http://127.0.0.1:8824 node scratchpad/ui-sweeps/split1005-attachto.js
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
    const res = { scriptBefore: !!document.querySelector('script[src*="attach-to"]') };
    const wrap = document.createElement('div');
    const entry = allEntries.find((e) => e.id === id);
    const loaded = () => typeof renderAttachToBoard;
    await renderAttachToDocument(entry, wrap);
    await wait(1200);
    res.docText = wrap.textContent.trim().slice(0, 80);
    res.docControls = wrap.querySelectorAll('select, button').length;
    const wrap2 = document.createElement('div');
    await renderAttachToBoard(entry, wrap2);
    await wait(1200);
    res.boardText = wrap2.textContent.trim().slice(0, 80);
    res.boardControls = wrap2.querySelectorAll('select, button').length;
    res.loaded = loaded();
    return res;
  });
  console.log(JSON.stringify(out), 'errors:', JSON.stringify(errors));
  await browser.close();
})();
