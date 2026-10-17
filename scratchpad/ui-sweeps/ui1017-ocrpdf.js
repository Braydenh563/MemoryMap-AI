// BACKLOG "Start of the next PR": the OCR workspace opened through "m o" with a
// PDF in the notebook and no page renderer package (pypdfium2 missing here):
// what is selected, what the stage shows, what the notice says.
//   BASE=http://127.0.0.1:8786 W=1440 node ui1017-ocrpdf.js
const { boot } = require('./lib.js');
const PDF = '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n';
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.waitForTimeout(3000);
  const made = await page.evaluate(async (pdf) => {
    const have = await apiJson('/files/gallery').catch(() => []);
    if (have.some((f) => /\.pdf$/i.test(f.original_name || ''))) return 'already';
    const entry = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: 'a scan', tags: [], defer_filing: true }) });
    const form = new FormData();
    form.append('file', new File([pdf], 'scan.pdf', { type: 'application/pdf' }));
    await api(`/entries/${entry.id}/files`, { method: 'POST', body: form });
    return 'made';
  }, PDF);
  console.log('seed', made);
  await page.evaluate(() => { switchTab('library'); });
  await page.waitForTimeout(1500);
  await page.keyboard.press('m');
  await page.keyboard.press('o');
  await page.waitForTimeout(3500);
  const out = await page.evaluate(() => {
    const ws = document.getElementById('ocr-workspace');
    const vis = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const sel = [...document.querySelectorAll('#ocr-rail .is-active, #ocr-rail [aria-current="true"]')].length;
    return {
      open: !ws.classList.contains('hidden'),
      title: (document.getElementById('ocr-title') || {}).textContent,
      railItems: document.querySelectorAll('#ocr-rail > *').length,
      railSelected: sel,
      stageText: (document.getElementById('ocr-empty') || document.getElementById('ocr-stage') || {}).innerText?.slice(0, 200),
      img: [...ws.querySelectorAll('img')].filter((i) => vis(i)).map((i) => [i.className, i.naturalWidth]),
      notices: [...ws.querySelectorAll('.notice, .ocr-notice, [role=status]')].filter((n) => vis(n)).map((n) => n.innerText.trim().slice(0, 140)),
      current: typeof ocrWorkspaceCurrent !== 'undefined' && ocrWorkspaceCurrent ? ocrWorkspaceCurrent.original_name : null,
    };
  });
  console.log(JSON.stringify(out));
  await page.click('#ocr-message button');
  await page.waitForTimeout(1200);
  console.log('packages section shown:', await page.evaluate(() => { const s = document.getElementById('settings-extras'); return Boolean(s) && !s.classList.contains('hidden') && s.getBoundingClientRect().width > 0; }));
  await page.screenshot({ path: (process.env.SCRATCH || '.') + `/ocrpdf-${W}.png` });
  await browser.close();
})();
