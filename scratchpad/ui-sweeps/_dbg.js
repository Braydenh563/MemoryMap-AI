const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(async () => {
    const d = await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Phone top', content: 'The first line.\n\nThe second paragraph.' }) });
    switchTab('documents');
    await new Promise((r) => setTimeout(r, 800));
    await openDocument(d.id);
    await new Promise((r) => setTimeout(r, 2000));
    setDocView('rendered');
    await new Promise((r) => setTimeout(r, 1200));
  });
  console.log(await page.evaluate(() => {
    const p = document.getElementById('doc-preview');
    const h = p.querySelector('.doc-preview-title'); return 'title ' + (h ? getComputedStyle(h).display + ' ' + Math.round(h.getBoundingClientRect().height) : 'none') + '\nfn has class: ' + String(renderDocPreview).includes('doc-preview-title');
  }));
  await browser.close();
})();
