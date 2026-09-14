// One real scanned-looking page, uploaded and read by local Tesseract, so the
// README's OCR workspace shot shows the app doing the thing rather than an
// empty pane. The page is rendered from HTML here (the sweep scripts are
// text and stay text); nothing about the reading is staged: the text on the
// right is whatever Tesseract found in the picture on the left.
//
//   BASE=http://127.0.0.1:8941 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/seed-ocr.js
const { boot } = require('./lib.js');

const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;width:1000px;height:1300px;background:#f6f1e7;font-family:Georgia,serif;color:#2a2622">
<div style="padding:70px 90px;line-height:1.55;font-size:30px">
<div style="font-size:44px;font-weight:bold;margin-bottom:6px">Project kickoff, 12 March</div>
<div style="font-size:24px;color:#6b6259;margin-bottom:34px">Notes from the whiteboard, before it was wiped</div>
<p>Scope for the first release: capture, search and the graph. Documents and boards wait for the second.</p>
<p>Decisions: SQLite stays, one file per notebook. No accounts. The model runs locally or not at all.</p>
<p>Open questions: how small a model is still useful? Who owns the design system? What does the first-run screen say?</p>
<p>Actions: Priya drafts the data model by Friday. Tom measures boot time on the old laptop. Everyone reads the privacy page.</p>
<p style="margin-top:40px;font-size:26px;color:#6b6259">Next meeting: Thursday, same room, bring the printouts.</p>
</div></body>`;

(async () => {
  const { browser, page } = await boot();
  const scanCtx = await browser.newContext();
  const scan = await scanCtx.newPage();
  await scan.setViewportSize({ width: 1000, height: 1300 });
  await scan.setContent(PAGE);
  const png = await scan.screenshot({ type: 'png' });
  await scanCtx.close();
  const out = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('file', new File([bytes], 'kickoff-notes.png', { type: 'image/png' }));
    fd.append('direct', 'true');
    const r = await fetch('/media/upload', { method: 'POST', body: fd, headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() } });
    const up = await r.json();
    if (!up.id) return { upload: up };
    const o = await api(`/media/${up.id}/ocr`, { method: 'POST', body: JSON.stringify({}) });
    const j = await o.json();
    return { id: up.id, ocr: o.status, chars: (j.ocr_text || '').length, head: (j.ocr_text || '').slice(0, 80) };
  }, png.toString('base64'));
  console.log(JSON.stringify(out));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
