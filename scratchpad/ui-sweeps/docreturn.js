// A document reopens where you left it: the caret and the scroll position,
// per document, kept in this browser.
//
// Measured 2026-10-04 before the change: there was no per-document memory
// anywhere in documents.js, so leaving a 21k-word document and coming back
// put you at the top (scrollTop 0, caret 0; the place is kept as the offset at the top of the view, not as pixels, because unseen lines are height estimates in a fresh view). Checks: leave and return through
// another document, return after a reload, a document nobody has left lands at
// the top, a short document is not scrolled, an edit that shortened the text
// cannot put the caret past its end, and Read view returns without a throw.
//
//   BASE=http://127.0.0.1:8852 node scratchpad/ui-sweeps/docreturn.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const lorem = 'The committee reviewed the proposal carefully and noted that the schedule depended on three things: funding, staffing and a clear mandate from the board. ';
function build(chapters) {
  let s = '# Annual report\n\n';
  for (let c = 1; c <= chapters; c++) {
    s += `## Chapter ${c}\n\n`;
    for (let k = 1; k <= 4; k++) {
      s += `### Section ${c}.${k}\n\n`;
      for (let p = 0; p < 3; p++) s += lorem.repeat(6) + '\n\n';
    }
  }
  return s;
}

const out = [];
const check = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

const where = (page) => page.evaluate(() => {
  const box = docSurface();
  const r = box.view.scrollDOM.getBoundingClientRect();
  // The first character in view: the pixel scrollTop differs between a view
  // whose lines were measured by scrolling and a fresh one whose unseen lines
  // are height estimates, so the place is compared as an offset.
  const at = box.view.posAtCoords({ x: r.left + 4, y: r.top + 4 }, false);
  return { head: box.selection().from, top: Math.round(box.scrollTop), at, id: currentDoc && currentDoc.id };
});

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const a = await openDoc(page, { title: 'Return long', content: build(12) });
  await page.evaluate(() => setDocView('live'));
  await page.waitForTimeout(600);
  // Scroll deep, then put the caret in a paragraph that is on screen.
  await page.evaluate(() => { docSurface().scrollTop = 20000; });
  await page.waitForTimeout(800);
  await page.locator('#doc-editor .cm-line').nth(8).click();
  await page.keyboard.press('End');
  await page.waitForTimeout(900);
  const left = await where(page);
  console.log('left at', JSON.stringify(left));
  check('set up: deep in the document with the caret there', left.top > 15000 && left.head > 50000, left);

  const b = await openDoc(page, { title: 'Return other', content: 'Short one.\n' });
  await page.waitForTimeout(500);
  const other = await where(page);
  check('another document opens at its own top', other.top === 0 && other.head === 0, other);

  await page.evaluate(async (id) => { await openDocument(id); }, a);
  await page.waitForTimeout(1500);
  const back = await where(page);
  console.log('back at', JSON.stringify(back));
  check('reopened: the caret is where it was', back.head === left.head, { left, back });
  check('reopened: the same text is at the top of the view (within 400 characters)', Math.abs(back.at - left.at) <= 400, { left, back });
  const visible = await page.evaluate(() => {
    const frame = document.querySelector('#doc-editor .cm-scroller').getBoundingClientRect();
    const sel = docSurface().view.coordsAtPos(docSurface().selection().from);
    return !!sel && sel.top >= frame.top && sel.bottom <= frame.bottom;
  });
  check('reopened: the caret is on screen', visible, null);

  // Through a reload.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 }).catch(() => {});
  if (await page.isVisible('#lock-password').catch(() => false)) {
    await page.fill('#lock-password', 'testpassword123');
    await page.click('#lock-submit');
  }
  await page.waitForTimeout(3000);
  await page.evaluate(async (id) => { switchTab('documents'); await openDocument(id); }, a);
  await page.waitForSelector('#doc-editor .cm-content', { state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const reloaded = await where(page);
  check('after a reload: the caret and the scroll come back', reloaded.head === left.head && Math.abs(reloaded.at - left.at) <= 400, { left, reloaded });

  // A shortened document cannot put the caret past its end.
  await page.evaluate(async ({ id }) => {
    await api(`/documents/${id}`, { method: 'PUT', body: JSON.stringify({ content: '# Tiny\n\nNow short.\n' }) });
  }, { id: a });
  await page.evaluate(async (id) => { await openDocument(id); }, b);
  await page.waitForTimeout(400);
  await page.evaluate(async (id) => { await openDocument(id); }, a);
  await page.waitForTimeout(1000);
  const tiny = await where(page);
  check('a document that shrank: the caret is clamped, the scroll is 0', tiny.head <= 20 && tiny.top === 0, tiny);

  // A document nobody left: top.
  const c = await openDoc(page, { title: 'Return fresh', content: build(3) });
  await page.waitForTimeout(500);
  const fresh = await where(page);
  check('a document nobody has left opens at the top', fresh.head === 0 && fresh.top === 0, fresh);

  const errors = await page.evaluate(() => window.__errs || []);
  check('no page errors', errors.length === 0, errors);

  await browser.close();
  const failed = out.filter((x) => !x.ok);
  for (const x of out) console.log(x.ok ? 'ok  ' : 'FAIL', x.name, x.ok ? '' : JSON.stringify(x.detail));
  console.log(`${out.length - failed.length} of ${out.length}`);
  process.exit(failed.length ? 1 : 0);
})();
