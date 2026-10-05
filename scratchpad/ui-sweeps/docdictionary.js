// The writing dictionary (`openDocDictionary`) and the flagged word's menu
// (`#doc-suggest-menu`), INBOX 552: "I also want a redesign of the
// dictionary popup and to fix ugly line wraps". At 1440 and 390 (THEME=dark
// for dark) asserts:
//   - the dictionary: the dialog head on one row (the title, its count and
//     '?', the X last), the `.search-field` well, word rows of one height
//     with their remove on the row, the file actions and the checks as
//     settings rows, inside the window, nothing sideways;
//   - no ugly wrap anywhere in either surface: no button, heading, label or
//     menu row whose single line of words breaks onto a second line;
//   - the flagged word's menu: the finding's head, the candidates, the
//     actions, inside the window.
//
//   BASE=http://127.0.0.1:8810 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/docdictionary.js
const { boot } = require('./lib.js');

const DOC = '# Words\n\nThis sentance has a typo and it it repeats.\n';
let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) fails += 1;
  console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : JSON.stringify(detail));
};

// Elements meant to be one line of words that broke onto two: a button, a
// heading, a label's own name, a menu row. Their height against their own
// line height says it, with no guessing about the text.
const wraps = (page, root) => page.evaluate((sel) => {
  const box = document.querySelector(sel);
  if (!box) return ['(missing)'];
  const out = [];
  for (const el of box.querySelectorAll('button, h2, h3, label > span:first-of-type, .menu-item, .doc-suggest-item, .doc-dictionary-word, .dialog-head-title')) {
    if (!el.offsetParent || !el.textContent.trim()) continue;
    const cs = getComputedStyle(el);
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
    const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    const textH = el.getBoundingClientRect().height - pad;
    // Only the element's own first line counts: a label's span holds a small
    // hint under its name on purpose.
    const lines = el.matches('label > span:first-of-type') ? el.firstChild?.nodeType === 3 ? (() => { const r = document.createRange(); r.selectNodeContents(el.firstChild); return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size; })() : 1 : Math.round(textH / lh);
    if (lines > 1) out.push(`${el.tagName.toLowerCase()}.${[...el.classList].join('.')}: "${el.textContent.trim().slice(0, 40)}" ${lines} lines`);
  }
  return out;
}, root);

(async () => {
  const theme = process.env.THEME || 'light';
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const w = viewport.width;
    const { browser, page, OUT } = await boot({ viewport });
    await page.evaluate(() => switchTab('documents'));
    await page.waitForTimeout(1500);
    await page.evaluate(async (c) => {
      const list = await apiJson('/documents');
      const found = (Array.isArray(list) ? list : list.items || list.documents || []).find((d) => d.title === 'Words');
      const id = found ? found.id : (await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Words', content: c, file_type: 'md' }) })).id;
      await loadDocuments(id);
    }, DOC);
    await page.waitForTimeout(1500);

    // The dictionary, with a few words in it.
    await page.evaluate(async () => {
      for (const word of ['Kolmogorov', 'MemoryMap', 'Zettelkasten']) await docDictionaryAdd(word).catch(() => 0);
    });
    await page.evaluate(() => openDocDictionary());
    await page.waitForTimeout(700);
    const d = await page.evaluate(() => {
      const dlg = document.getElementById('doc-dictionary-dialog');
      const r = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round); };
      const head = dlg.querySelector('.dialog-head');
      const title = head.querySelector('.dialog-head-title');
      const c = (el) => el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2;
      const btns = [...head.querySelectorAll('button')];
      const rows = [...dlg.querySelectorAll('#doc-dictionary-list > li')];
      const dr = dlg.getBoundingClientRect();
      return {
        dialog: r(dlg),
        inside: dr.left >= 0 && dr.top >= 0 && dr.right <= innerWidth && dr.bottom <= innerHeight + 1,
        headOneRow: btns.every((b) => Math.abs(c(b) - c(title)) <= 3),
        lastIsClose: btns[btns.length - 1]?.getAttribute('aria-label') === 'Close',
        field: !!dlg.querySelector('.search-field > .search-field-input'),
        rows: rows.length,
        rowHeights: [...new Set(rows.map((x) => Math.round(x.getBoundingClientRect().height)))],
        sideways: dlg.scrollWidth > dlg.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
      };
    });
    await page.screenshot({ path: `${OUT}/docdict-${w}-${theme}.png` });
    console.log(`     ${w} ${theme} dictionary:`, JSON.stringify(d));
    check(`${w} ${theme} dictionary: head one row, X last, the search-field well, inside, nothing sideways`, d.headOneRow && d.lastIsClose && d.field && d.inside && !d.sideways, d);
    check(`${w} ${theme} dictionary: the word rows are one height`, d.rows >= 3 && d.rowHeights.length === 1, d);
    const dw = await wraps(page, '#doc-dictionary-dialog');
    check(`${w} ${theme} dictionary: no ugly wraps`, dw.length === 0, dw);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // The flagged word's menu, from the misspelling.
    // Opened the way a click on the underline does, through the finding.
    // A phone opens a document to read; the underline is in the editing view.
    await page.evaluate(() => { if (docView === 'rendered') setDocView(lastEditView); });
    await page.waitForTimeout(600);
    const opened = await page.evaluate(() => {
      const finding = docProseFound.find((f) => f.rule === 'spelling');
      return finding ? docOpenSuggestFor(finding, true) : false;
    });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const menu = document.getElementById('doc-suggest-menu');
      if (!menu || menu.classList.contains('hidden')) return null;
      const b = menu.getBoundingClientRect();
      return {
        rect: [b.left, b.top, b.width, b.height].map(Math.round),
        inside: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight + 1,
        head: !!menu.querySelector('.doc-suggest-head'),
        items: menu.querySelectorAll('.doc-suggest-item').length,
      };
    });
    await page.screenshot({ path: `${OUT}/docmenu-${w}-${theme}.png` });
    console.log(`     ${w} ${theme} word menu:`, JSON.stringify({ opened, m }));
    check(`${w} ${theme} word menu: opens inside the window with its head and answers`, m && m.inside && m.head && m.items >= 2, { opened, m });
    const mw = await wraps(page, '#doc-suggest-menu');
    check(`${w} ${theme} word menu: no ugly wraps`, mw.length === 0, mw);
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
