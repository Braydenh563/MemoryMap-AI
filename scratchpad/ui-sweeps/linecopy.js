// INBOX 652: VS Code's rule in every CM6 editor. Ctrl+C / Ctrl+X with an
// empty selection copies / cuts the whole line (cut removes its newline too);
// pasting that line-copy inserts it above the current line.
//   BASE=http://127.0.0.1:8797 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node linecopy.js
const { boot } = require('./lib.js');
let failures = 0;
const check = (label, ok, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`); };
const TEXT = 'alpha\nbravo\ncharlie';

(async () => {
  const { browser, ctx, page } = await boot({});
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForTimeout(2500);
  const clip = () => page.evaluate(() => navigator.clipboard.readText());

  //: One surface at a time: `sel` is the CM content to drive, `docOf` reads its text.
  async function run(name, sel, docOf) {
    const focus = async () => { await page.evaluate((s) => document.querySelector(s)?.focus(), sel); await page.keyboard.press('Control+Home'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('End'); };
    // Copy: caret at the end of "bravo", nothing selected.
    await focus();
    await page.evaluate(() => navigator.clipboard.writeText('sentinel'));
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(200);
    const copied = await clip();
    check(`${name}: copy with no selection puts the whole line, newline included, on the clipboard`, copied === 'bravo\n', JSON.stringify(copied));
    check(`${name}: copy leaves the text alone`, (await docOf()) === TEXT, JSON.stringify(await docOf()));
    // Paste of that line-copy goes above the current line (caret moved to "charlie").
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('End');
    await page.keyboard.press('Control+v');
    await page.waitForTimeout(250);
    const pasted = await docOf();
    check(`${name}: pasting a line-copy inserts it above the current line`, pasted === 'alpha\nbravo\nbravo\ncharlie', JSON.stringify(pasted));
    // Cut: put the doc back to TEXT, then cut "bravo".
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(250);
    await focus();
    await page.keyboard.press('Control+x');
    await page.waitForTimeout(250);
    const cut = await clip();
    const after = await docOf();
    check(`${name}: cut with no selection puts the whole line on the clipboard`, cut === 'bravo\n', JSON.stringify(cut));
    check(`${name}: cut removes the line including its newline`, after === 'alpha\ncharlie', JSON.stringify(after));
    // A real selection still copies just the selection.
    await page.keyboard.press('Home');
    await page.keyboard.press('Shift+End');
    await page.keyboard.press('Control+c');
    await page.waitForTimeout(200);
    const sel2 = await clip();
    check(`${name}: copy with a selection copies only the selection`, sel2 === 'charlie', JSON.stringify(sel2));
    // Last line: cut takes the newline before it, leaving no empty line behind.
    await page.keyboard.press('Control+End');
    await page.keyboard.press('Control+x');
    await page.waitForTimeout(250);
    const lastCut = await clip();
    const lastAfter = await docOf();
    check(`${name}: cutting the last line takes the line before's newline`, lastCut === 'charlie\n' && lastAfter === 'alpha', JSON.stringify([lastCut, lastAfter]));
  }

  // 1. The capture box (note surface), first: it is only reachable before a
  // document has been opened in the same session.
  await page.evaluate(() => { switchTab('notes'); showNotesSection('capture'); });
  await page.waitForTimeout(1200);
  await page.evaluate((t) => { const b = document.getElementById('entry-content'); b.value = t; b.dispatchEvent(new Event('input', { bubbles: true })); }, TEXT);
  await page.waitForTimeout(900);
  await page.evaluate(() => document.getElementById('entry-content').focus());
  await page.waitForTimeout(2500);
  const mounted = await page.evaluate(() => { const c = document.getElementById('entry-content').parentElement.querySelector('.cm-content'); if (c) c.setAttribute('data-linecopy', '1'); return !!c; });
  check('capture box is a CM6 editor once focused', mounted);
  if (mounted) await run('capture', '[data-linecopy]', () => page.evaluate(() => document.getElementById('entry-content').value));

  // 2. The documents editor.
  const doc = await page.evaluate(async (t) => (await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Line copy sweep', content: t }) })).id, TEXT);
  await page.evaluate((d) => { switchTab('documents'); setTimeout(() => openDocument(d), 200); }, doc);
  await page.waitForTimeout(4000);
  await page.evaluate(() => { if (typeof setDocView === 'function') setDocView('live'); });
  await page.waitForTimeout(1200);
  await run('documents', '.doc-editor .cm-content', () => page.evaluate(() => docCmView.state.doc.toString()));

  await page.evaluate(async (d) => { await apiJson(`/documents/${d}`, { method: 'DELETE' }).catch(() => {}); }, doc);
  check('no page errors', !errors.length, errors.join(' | '));
  console.log(`${failures ? 'FAILED' : 'PASSED'} linecopy`);
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
