// The Write with AI desk's draft box while a pass runs (OPEN.md, writing-desk:
// "#draft-text is readOnly while a pass runs, and the mounted editor is not").
// Once the note-surface editor has mounted over #draft-text, `readOnly` on the
// hidden textarea does not reach the editor a person types into. Mounts the
// editor by focusing the box, calls setDraftBusy(true), types into the editor
// and checks the text did not change; then setDraftBusy(false) and checks the
// same keystroke lands. A box that cannot be reached is reported, not passed.
//
//   BASE=http://127.0.0.1:8799 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node draftreadonly.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  let failed = 0;
  const ok = (name, pass, detail) => { if (!pass) failed++; console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail || ''}`); };
  await page.evaluate(() => { switchTab('notes'); showNotesSection('writing-room'); });
  await page.waitForTimeout(800);
  await page.focus('#draft-text').catch(() => {});
  await page.waitForSelector('#writing-room .note-surface .cm-content', { timeout: 15000 }).catch(() => {});
  const mounted = await page.evaluate(() => !!document.querySelector('#writing-room .note-surface-mirror#draft-text'));
  ok('the draft box has mounted its editor', mounted, String(mounted));
  if (!mounted) { await browser.close(); process.exit(1); }
  const surface = '#draft-text';
  const read = () => page.evaluate(() => document.getElementById('draft-text').value);
  const editable = () => page.evaluate(() => {
    const wrap = document.getElementById('draft-text').closest('.note-surface');
    const content = wrap.querySelector('.cm-content');
    return content.getAttribute('contenteditable');
  });
  await page.click('#writing-room .note-surface .cm-content');
  await page.keyboard.type('before ');
  await page.waitForTimeout(200);
  ok('an idle desk takes typing', (await read()) === 'before ', JSON.stringify(await read()));
  await page.evaluate(() => setDraftBusy(true));
  await page.waitForTimeout(150);
  const during = await editable();
  await page.click('#writing-room .note-surface .cm-content').catch(() => {});
  await page.keyboard.type('during');
  await page.waitForTimeout(200);
  ok('a running pass is not typed into', (await read()) === 'before ', `${JSON.stringify(await read())}, contenteditable=${during}`);
  await page.evaluate(() => setDraftBusy(false));
  await page.waitForTimeout(150);
  await page.click('#writing-room .note-surface .cm-content');
  await page.keyboard.type('after');
  await page.waitForTimeout(200);
  ok('the box is editable again when the pass ends', (await read()) === 'before after', JSON.stringify(await read()));
  console.log(failed ? `${failed} failed` : 'all passed');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
