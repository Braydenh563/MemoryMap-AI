// INBOX 803: the code snippets panel's "Search snippets" field and its save
// button are one height on one row, and the button's label never wraps.
//   BASE=http://127.0.0.1:8868 [VW=1440] node scratchpad/ui-sweeps/snippetbar.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.VW || 1440), height: 900 } });
  await page.evaluate(() => switchTab('documents'));
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    const d = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'snip ' + Date.now(), content: 'def f():\n    return 1\n', file_type: 'py' }) });
    await loadDocuments(d.id);
  });
  await page.waitForTimeout(1800);
  if (!(await page.isVisible('#doc-snippet-search'))) await page.click('#doc-code-snippets-open');
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const field = document.querySelector('#doc-code-snippets .search-field').getBoundingClientRect();
    const btn = document.getElementById('doc-snippet-save'); const b = btn.getBoundingClientRect();
    const bar = document.querySelector('#doc-code-snippets .doc-code-side-bar').getBoundingClientRect();
    const input = document.getElementById('doc-snippet-search').getBoundingClientRect();
    const lineH = parseFloat(getComputedStyle(btn).lineHeight) || 0;
    const range = document.createRange(); range.selectNodeContents(btn);
    const rows = new Set([...range.getClientRects()].map((q) => Math.round(q.top)));
    return {
      fieldH: +field.height.toFixed(1), btnH: +b.height.toFixed(1), barH: +bar.height.toFixed(1), fieldW: +field.width.toFixed(1), inputW: +input.width.toFixed(1), btnW: +b.width.toFixed(1),
      oneRow: Math.abs((field.top + field.height / 2) - (b.top + b.height / 2)) < 1, textRows: rows.size, btnText: btn.textContent.trim(), panelW: Math.round(bar.width),
    };
  });
  console.log(process.env.VW || 1440, JSON.stringify(r));
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/snippetbar-${process.env.VW || 1440}.png`, clip: { x: 0, y: 100, width: Number(process.env.VW || 1440), height: 500 } });
  await browser.close();
})();
