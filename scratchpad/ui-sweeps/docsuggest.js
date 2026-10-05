// The document editor's suggestions panel (`#doc-prose-panel`, INBOX 549:
// "better redesign and restructure the document editor suggestions panel??
// for both docks"). Seeds a document with a typo, a repeated word, a double
// space, a long sentence and an image with no description, opens the panel
// from the status bar's chip, and measures it docked at the bottom and on the
// right, and from focus mode's dock, at 1440 and 390 (THEME=dark for dark):
//   - the head: one row (every button centred on the title's line, also at
//     the right dock's narrowest 240px), a 16px title with the count, the
//     tools all one size, the X last, the Dictionary and the side in the ⋯;
//   - every finding row on one recipe: the kind mark, the words over the
//     reason, its actions at the right, all rows' text on one left edge, no
//     row wider than the panel;
//   - opening a row shows its answers in place;
//   - the empty state: one quiet line under the same head;
//   - nothing scrolls sideways.
//
//   BASE=http://127.0.0.1:8810 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/docsuggest.js
const { boot } = require('./lib.js');

const DOC = '# Suggestions\n\nThis sentance has a typo. It it repeats a word and has two  spaces.\n\n' +
  'This is a very long sentence that keeps going on and on with clause after clause and word after word until it is far longer than any reader would like it to be in one breath without a pause.\n\n' +
  '![](picture.png)\n\n' + 'A line of text to fill the page.\n'.repeat(12);

let fails = 0;
const check = (name, ok, detail) => {
  if (!ok) fails += 1;
  console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : JSON.stringify(detail));
};

const measure = (page) => page.evaluate(() => {
  const panel = document.getElementById('doc-prose-panel');
  const r = (el) => { const b = el.getBoundingClientRect(); return [b.left, b.top, b.width, b.height].map(Math.round); };
  const head = panel.querySelector('.doc-prose-head');
  const title = head?.querySelector('.doc-prose-title');
  const tools = head ? [...head.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().height > 0) : [];
  const rows = [...panel.querySelectorAll('.doc-prose-row')];
  const textLeft = rows.map((row) => Math.round((row.querySelector('.doc-finding-words') || row.querySelector('.doc-prose-jump')).getBoundingClientRect().left));
  return {
    panel: r(panel),
    side: panel.classList.contains('doc-prose-right') ? 'right' : 'bottom',
    head: head && r(head),
    headTops: (() => { if (!title) return 0; const c = (e) => e.getBoundingClientRect().top + e.getBoundingClientRect().height / 2; const t = c(title); return tools.every((b) => Math.abs(c(b) - t) <= 2) ? 1 : 2; })(),
    titleSize: title && getComputedStyle(title).fontSize,
    countClear: (() => { const c = head?.querySelector('.doc-prose-count'); const t = tools[0]; return !c || !c.textContent || !t || c.getBoundingClientRect().right <= t.getBoundingClientRect().left; })(),
    title: title?.textContent,
    tools: tools.map((b) => [b.getAttribute('aria-label') || b.textContent.trim(), Math.round(b.getBoundingClientRect().height)]),
    lastTool: tools[tools.length - 1]?.getAttribute('aria-label'),
    groups: [...panel.querySelectorAll('.doc-prose-group')].map((g) => g.textContent.trim()),
    rows: rows.length,
    rowHeights: rows.map((row) => Math.round(row.getBoundingClientRect().height)),
    textLefts: [...new Set(textLeft)],
    actions: rows.map((row) => row.querySelectorAll('.doc-prose-act').length),
    lastAct: rows.map((row) => [...row.querySelectorAll('.doc-prose-act')].pop()?.getAttribute('aria-label')),
    toolsW: tools.map((b) => Math.round(b.getBoundingClientRect().width)),
    wide: rows.filter((row) => row.scrollWidth > row.clientWidth + 1).length,
    panelOverflowX: panel.scrollWidth > panel.clientWidth + 1,
    pageOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    empty: panel.querySelector('.doc-prose-empty')?.textContent || null,
  };
});

async function openDoc(page, content, title) {
  await page.evaluate(() => switchTab('documents'));
  await page.waitForTimeout(1500);
  await page.evaluate(async ([c, t]) => {
    const list = await apiJson('/documents');
    const found = (Array.isArray(list) ? list : list.items || list.documents || []).find((d) => d.title === t);
    const id = found ? found.id : (await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: t, content: c, file_type: 'md' }) })).id;
    await loadDocuments(id);
  }, [content, title]);
  await page.waitForTimeout(1500);
}

async function openPanel(page, from) {
  await page.evaluate((id) => {
    const p = document.getElementById('doc-prose-panel');
    if (p.classList.contains('hidden')) document.getElementById(id).click();
  }, from);
  await page.waitForTimeout(500);
}

(async () => {
  const theme = process.env.THEME || 'light';
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const w = viewport.width;
    const { browser, page, OUT } = await boot({ viewport });
    await page.evaluate(() => { localStorage.removeItem('docProseDock'); localStorage.removeItem('docProseWidth'); });
    await openDoc(page, DOC, 'Suggestions');
    const sides = w > 720 ? ['bottom', 'right'] : ['bottom'];
    for (const side of sides) {
      await page.evaluate((s) => { localStorage.setItem('docProseDock', s); applyDocProseDock(); }, side);
      await openPanel(page, 'doc-prose');
      const m = await measure(page);
      console.log(`     ${w} ${theme} ${side}:`, JSON.stringify(m));
      await page.screenshot({ path: `${OUT}/docsuggest-${side}-${w}-${theme}.png` });
      check(`${w} ${theme} ${side}: the head is one row, a 16px title, the X last`, m.headTops === 1 && m.titleSize === '16px' && /Close/.test(m.lastTool || ''), m);
      check(`${w} ${theme} ${side}: the tools are one height`, new Set(m.tools.map((t) => t[1])).size === 1, m.tools);
      check(`${w} ${theme} ${side}: rows on one left edge, none too wide, nothing sideways`, m.rows >= 4 && m.textLefts.length === 1 && m.wide === 0 && !m.panelOverflowX && !m.pageOverflowX, m);
      check(`${w} ${theme} ${side}: every row ends with its way to put it away`, m.actions.every((n) => n >= 1) && m.lastAct.every((l) => /Ignore|Dismiss/.test(l || '')), m);
      // A row opens its answers in place.
      await page.click('#doc-prose-panel .doc-prose-jump');
      await page.waitForTimeout(400);
      const open = await page.evaluate(() => {
        const a = document.querySelector('#doc-prose-panel .doc-prose-answers:not(.hidden)');
        return a ? { buttons: a.querySelectorAll('button').length, inside: a.getBoundingClientRect().right <= document.getElementById('doc-prose-panel').getBoundingClientRect().right + 1 } : null;
      });
      check(`${w} ${theme} ${side}: a row opens its answers in place`, open && open.buttons >= 1 && open.inside, open);
      await page.screenshot({ path: `${OUT}/docsuggest-${side}-open-${w}-${theme}.png` });
      if (side === 'right') {
        // INBOX 552: the head is one row at the panel's narrowest (240px).
        await page.evaluate(() => docProseApplyWidth(DOC_PROSE_WIDTH_MIN));
        await page.waitForTimeout(300);
        const n = await measure(page);
        console.log(`     ${w} ${theme} right at 240:`, JSON.stringify({ panel: n.panel, head: n.head, tools: n.tools, toolsW: n.toolsW }));
        await page.screenshot({ path: `${OUT}/docsuggest-right240-${w}-${theme}.png` });
        check(`${w} ${theme} right at 240px: the head is one row, every button on the title's line`, n.panel[2] <= 241 && n.headTops === 1 && n.countClear && /Close/.test(n.lastTool || '') && !n.panelOverflowX, n);
        await page.evaluate(() => docProseApplyWidth(DOC_PROSE_WIDTH_DEFAULT));
        // The ⋯ holds the Dictionary and the side.
        const items = await page.evaluate(() => document.querySelector('#doc-prose-panel .doc-prose-more')?.rowMenu?.items.map((i) => i.title));
        check(`${w} ${theme} right: the ⋯ holds Check with AI, the Dictionary and the side`, items && items.length === 3, items);
      }
      await page.evaluate(() => closeDocProsePanel());
      await page.waitForTimeout(200);
    }
    // Focus mode's dock opens the same panel.
    await page.evaluate(() => { localStorage.setItem('docProseDock', 'bottom'); applyDocProseDock(); });
    await page.evaluate(() => toggleDocFocus(true));
    await page.waitForTimeout(700);
    await openPanel(page, 'doc-focus-prose');
    const f = await measure(page);
    console.log(`     ${w} ${theme} focus:`, JSON.stringify(f));
    await page.screenshot({ path: `${OUT}/docsuggest-focus-${w}-${theme}.png` });
    check(`${w} ${theme} focus: the same head and rows`, f.headTops === 1 && f.titleSize === '16px' && f.rows >= 4 && f.textLefts.length === 1 && f.wide === 0 && !f.pageOverflowX, f);
    await page.evaluate(() => { closeDocProsePanel(); toggleDocFocus(false); });
    await page.waitForTimeout(400);
    // The empty state.
    await openDoc(page, '# Clean\n\nA short clean line.\n', 'Clean');
    await openPanel(page, 'doc-prose');
    const e = await measure(page);
    console.log(`     ${w} ${theme} empty:`, JSON.stringify(e));
    await page.screenshot({ path: `${OUT}/docsuggest-empty-${w}-${theme}.png` });
    check(`${w} ${theme} empty: the same head, one quiet line`, e.headTops === 1 && e.titleSize === '16px' && e.rows === 0 && !!e.empty && !e.pageOverflowX, e);
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
