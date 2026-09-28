// INBOX 425 (i): "tables are still really annoying to use and edit in the
// documents live view". Every gesture a person makes on a table, measured in
// Live on a 4-column, 5-row table (a header and four body rows):
//
// click into a cell, type, Tab / Shift+Tab, Tab past the end, Enter in a
// cell, the arrows between rows, the arrows out of the table above and below
// (with the table as the last thing in the document), paste from a
// spreadsheet into a cell, the cell menu's reach from the row being edited,
// and whether the columns move while typing.
//
//   BASE=http://127.0.0.1:8810 node scratchpad/ui-sweeps/doctablework.js
//   REPORT=1 prints every reading without asserting (the "before").
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const TABLE = [
  '| Name | Kind | Count | Notes |',
  '| --- | --- | --- | --- |',
  '| a1 | b1 | c1 | d1 |',
  '| a2 | b2 | c2 | d2 |',
  '| a3 | b3 | c3 | d3 |',
  '| a4 | b4 | c4 | d4 |',
].join('\n');
const DOC = 'Intro line.\n\n' + TABLE;

const out = [];
const check = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

async function reset(page, text = DOC) {
  await page.evaluate((t) => {
    const view = docCmView;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: t } });
  }, text);
  await page.waitForTimeout(250);
}

// The caret's cell, as the model reads it.
async function where(page) {
  return page.evaluate(() => {
    const c = docTableContext();
    const s = docSurface();
    const line = s.text.slice(0, s.selectionStart).split('\n').length;
    return c ? { row: c.cell.row, col: c.cell.col, rows: c.table.rows.length, line } : { row: null, line };
  });
}

async function cellBox(page, row, col) {
  return page.evaluate(({ row, col }) => {
    const lines = [...document.querySelectorAll('#doc-editor .cm-line.cm-md-table')];
    const line = lines[row > 1 ? row - 1 : row];
    const cell = line && line.querySelectorAll('.cm-md-td')[col];
    if (!cell) return null;
    const r = cell.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, { row, col });
}

async function columnLefts(page) {
  return page.evaluate(() => [...document.querySelectorAll('#doc-editor .cm-line.cm-md-table')]
    .map((line) => [...line.querySelectorAll('.cm-md-td')].map((c) => Math.round(c.getBoundingClientRect().left))));
}

async function text(page) {
  return page.evaluate(() => docSurface().text);
}

async function put(page, row, col, where = 'end') {
  await page.evaluate(({ row, col, where }) => {
    const s = docSurface();
    const t = docTableParse(s.text, s.text.indexOf('| Name'));
    const span = docTableCellSpan(t, row, col);
    const raw = t.rows[row].cells[col];
    const tail = (/[ \t]*$/.exec(raw) || [''])[0].length;
    const at = where === 'end' ? span.to - tail : span.from + 1;
    s.focus();
    s.setSelectionRange(at, at);
  }, { row, col, where });
  await page.waitForTimeout(150);
}

(async () => {
  const { browser, page } = await boot();
  await openDoc(page, { title: 'Table work', content: DOC });
  await page.evaluate(() => setDocView('live'));
  await page.waitForTimeout(500);

  // 1. Click into a cell (the third body row, third column), then type.
  const box = await cellBox(page, 4, 2);
  await page.mouse.click(box.x + box.w - 12, box.y + box.h / 2);
  await page.waitForTimeout(250);
  let w = await where(page);
  check('a click lands in the cell pressed', w.row === 4 && w.col === 2, w);
  const before = await columnLefts(page);
  await page.keyboard.type(' and a much longer run of words in this cell');
  await page.waitForTimeout(250);
  const after = await columnLefts(page);
  const moved = before.flat().filter((x, i) => Math.abs(x - after.flat()[i]) > 1).length;
  check('typing moves no column', moved === 0, { before: before[3], after: after[3] });
  await reset(page);

  // 2. Tab and Shift+Tab, and Tab past the last cell.
  await put(page, 2, 0);
  await page.keyboard.press('Tab');
  w = await where(page);
  check('Tab goes to the next cell', w.row === 2 && w.col === 1, w);
  await page.keyboard.press('Shift+Tab');
  w = await where(page);
  check('Shift+Tab comes back', w.row === 2 && w.col === 0, w);
  await put(page, 5, 3);
  await page.keyboard.press('Tab');
  w = await where(page);
  check('Tab past the end adds a row', w.rows === 7 && w.row === 6 && w.col === 0, w);
  await reset(page);

  // 3. Enter in a cell.
  await put(page, 3, 1);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  let t = await text(page);
  w = await where(page);
  const tableIntact = await page.evaluate(() => {
    const s = docSurface();
    const tb = docTableParse(s.text, s.text.indexOf('| Name'));
    return tb ? tb.rows.length : 0;
  });
  check('Enter in a cell keeps the table whole', tableIntact >= 6 && !/\| b2\s*\n/.test(t.split('| a2 |')[1] || ''), { rows: tableIntact, w, text: t.slice(t.indexOf('| a2'), t.indexOf('| a2') + 40) });
  check('Enter in a cell goes to the cell below', w.row === 4 && w.col === 1, w);
  await reset(page);
  await put(page, 5, 2);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  w = await where(page);
  check('Enter in the last row adds a row below', w.rows === 7 && w.row === 6 && w.col === 2, w);
  await reset(page);

  // 4. The arrows between rows keep the column.
  await put(page, 3, 2);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  w = await where(page);
  check('ArrowDown keeps the column', w.row === 4 && w.col === 2, w);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  w = await where(page);
  check('ArrowUp keeps the column', w.row === 3 && w.col === 2, w);
  await put(page, 2, 1);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  w = await where(page);
  check('ArrowUp from the first body row goes to the header', w.row === 0 && w.col === 1, w);

  // 5. Out of the table: above, and below when it is the last thing written.
  await put(page, 0, 1);
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  w = await where(page);
  check('ArrowUp from the header leaves the table', w.row === null, w);
  await put(page, 5, 1);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  w = await where(page);
  t = await text(page);
  check('ArrowDown from the last row leaves the table, even at the end', w.row === null, { w, tail: JSON.stringify(t.slice(-20)) });
  await reset(page, TABLE + '\n\nAfter.');
  await page.evaluate(() => { const s = docSurface(); s.focus(); s.setSelectionRange(0, 0); });
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(150);
  w = await where(page);
  check('ArrowUp from a table at the very top leaves it', w.row === null, w);
  await reset(page);

  // 6. Paste from a spreadsheet: tab-separated rows, into a cell.
  await put(page, 2, 1, 'start');
  await page.evaluate(() => {
    const s = docSurface();
    const t = docTableParse(s.text, s.text.indexOf('| Name'));
    const span = docTableCellSpan(t, 2, 1);
    s.setSelectionRange(span.from + 1, span.from + 1);
    const data = new DataTransfer();
    data.setData('text/plain', 'x1\ty1\nx2\ty2\nx3\ty3');
    data.setData('text/html', '<table><tr><td>x1</td><td>y1</td></tr><tr><td>x2</td><td>y2</td></tr><tr><td>x3</td><td>y3</td></tr></table>');
    const ev = new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
    docCmView.contentDOM.dispatchEvent(ev);
  });
  await page.waitForTimeout(250);
  t = await text(page);
  const pasted = await page.evaluate(() => {
    const s = docSurface();
    const tb = docTableParse(s.text, s.text.indexOf('| Name'));
    return tb ? tb.rows.map((r) => r.cells.map((c) => c.trim())) : null;
  });
  check('a pasted block of cells fills cells, not one cell',
    pasted && pasted[2] && pasted[2][1] === 'x1' && pasted[2][2] === 'y1' && pasted[4][1] === 'x3',
    { pasted, text: t.slice(t.indexOf('| a1'), t.indexOf('| a1') + 60) });
  await reset(page);

  // And outside any table, a spreadsheet's rows become one.
  await reset(page, 'Before.\n\n');
  await page.evaluate(() => {
    const s = docSurface();
    s.focus();
    s.setSelectionRange(s.text.length, s.text.length);
    const data = new DataTransfer();
    data.setData('text/plain', 'H1\tH2\nv1\tv2');
    data.setData('text/html', '<table><tr><td>H1</td><td>H2</td></tr><tr><td>v1</td><td>v2</td></tr></table>');
    docCmView.contentDOM.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(250);
  t = await text(page);
  check('a spreadsheet pasted outside a table becomes a table', /\| H1 \| H2 \|\n\| --- \| --- \|\n\| v1 \| v2 \|/.test(t), JSON.stringify(t));
  await reset(page);

  // 7. The table's actions are within reach of the row being edited.
  await put(page, 5, 2);
  await page.waitForTimeout(250);
  const reach = await page.evaluate(() => {
    const opener = document.querySelector('.cm-md-table-menu button, .cm-md-table-menu summary');
    const active = document.querySelector('.cm-md-td-active');
    if (!opener || !active) return { opener: !!opener, active: !!active };
    const o = opener.getBoundingClientRect();
    const a = active.getBoundingClientRect();
    return { opener: true, dy: Math.round(Math.abs(o.top - a.top)), ow: Math.round(o.width), oh: Math.round(o.height),
      opacity: getComputedStyle(opener.closest('.cm-md-table-menu')).opacity };
  });
  check('the table menu sits on the row being edited', reach.opener && reach.dy <= 8, reach);

  if (process.env.SHOT) {
    await page.screenshot({ path: `${process.env.SCRATCH || '.'}/doctablework.png` });
  }
  await browser.close();
  const failed = out.filter((c) => !c.ok);
  for (const c of out) console.log(c.ok ? 'ok  ' : 'FAIL', c.name, c.ok ? '' : JSON.stringify(c.detail));
  console.log(`${out.length - failed.length} of ${out.length}`);
  process.exit(process.env.REPORT ? 0 : failed.length ? 1 : 0);
})();
