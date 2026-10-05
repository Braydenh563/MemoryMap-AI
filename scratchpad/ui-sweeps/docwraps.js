// Ugly line wraps in the document editor's panels and popups (INBOX 552,
// part 3: "a heading that wraps one word, button rows that break, labels
// split mid-phrase"). At 1440 and 390 (THEME=dark for dark), opens the editor,
// the find bar, the AI panel, its history, Earlier versions and the
// document's ⋯ menu, and lists every button, heading, menu row or label
// whose one line of words broke onto a second, and every row of buttons
// that broke into two rows.
//
//   BASE=http://127.0.0.1:8810 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/docwraps.js
const { boot } = require('./lib.js');

const DOC = '# Wraps\n\nThis sentance has a typo and it it repeats.\n\n' + 'A line of text.\n'.repeat(8);
let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) fails += 1;
  console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : JSON.stringify(detail));
};

const wraps = (page, sel) => page.evaluate((sel) => {
  const out = [];
  for (const root of document.querySelectorAll(sel)) {
    if (!root.offsetParent && getComputedStyle(root).position !== 'fixed') continue;
    for (const el of root.querySelectorAll('button, h2, h3, h4, .menu-item, .dialog-head-title, label > span:first-of-type')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !el.textContent.trim() || getComputedStyle(el).visibility === 'hidden') continue;
      // The words alone: a range over the element's text, its line boxes.
      const range = document.createRange();
      const text = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()) || el.querySelector('.ph-text')?.firstChild;
      if (!text) continue;
      range.selectNodeContents(text);
      const tops = new Set([...range.getClientRects()].filter((x) => x.width > 1).map((x) => Math.round(x.top)));
      if (tops.size > 1) out.push(`${sel} ${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].slice(0, 2).join('.')}: "${el.textContent.trim().slice(0, 36)}"`);
    }
  }
  return out;
}, sel);

(async () => {
  const theme = process.env.THEME || 'light';
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const w = viewport.width;
    const { browser, page, OUT } = await boot({ viewport });
    await page.evaluate(() => switchTab('documents'));
    await page.waitForTimeout(1500);
    await page.evaluate(async (c) => {
      const list = await apiJson('/documents');
      const found = (Array.isArray(list) ? list : list.items || list.documents || []).find((d) => d.title === 'Wraps');
      const id = found ? found.id : (await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Wraps', content: c, file_type: 'md' }) })).id;
      await loadDocuments(id);
    }, DOC);
    await page.waitForTimeout(1500);
    const surfaces = [
      ['the editor', null, '#tab-documents'],
      ['the find bar', () => toggleDocFindBar(true), '#doc-find-bar'],
      ['the AI panel', () => openDocAiPanel(), '#doc-ai-panel'],
      ['Earlier versions', () => openDocHistory(), '.modal-overlay:not(.hidden), dialog[open]'],
    ];
    for (const [name, open, sel] of surfaces) {
      if (open) await page.evaluate(`void (${open})()`).catch(() => {});
      await page.waitForTimeout(900);
      const found = await wraps(page, sel);
      await page.screenshot({ path: `${OUT}/docwraps-${name.split(' ').pop()}-${w}-${theme}.png` });
      check(`${w} ${theme} ${name}: no line of words broken onto two`, found.length === 0, found);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
