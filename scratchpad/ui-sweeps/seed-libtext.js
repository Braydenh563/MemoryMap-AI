// Seed the Library with the two rows INBOX 279 is about: an image that has a
// caption AND a vision reading (so the card's foot carries every rank the
// report lists), and a PDF with a real page-by-page reading (so the Files
// sub-tab's "Text extracted from this file" block has pages, words and a
// first sentence rather than an empty state).
//
// Uploads only: the caption, the model names and the page readings are
// written by `seed-libtext.py` straight into the database, because producing
// them for real needs a vision model this sandbox does not have and the
// shapes under test are the *rendered* ones.
//
//   BASE=http://127.0.0.1:8991 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules node seed-libtext.js
const { boot } = require('./lib.js');

const SHOT = `<!doctype html><meta charset="utf-8"><body style="margin:0;width:900px;height:620px;background:#eef2f6;font-family:Georgia,serif;color:#22303c">
<div style="padding:60px 70px;line-height:1.5;font-size:28px">
<div style="font-size:40px;font-weight:bold;margin-bottom:18px">Rates and opening hours</div>
<p>Monday to Friday, nine until six. Saturday, ten until four.</p>
<p>Day rate twenty two pounds, week rate ninety, month rate two hundred and eighty.</p>
<p>Members pay the week rate for a day pass on any weekday before noon.</p>
</div></body>`;

function onePagePdf(title) {
  const body = `BT /F1 12 Tf 40 120 Td (${title}) Tj ET`;
  const objs = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 400 400]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>',
    `<</Length ${body.length}>>\nstream\n${body}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n';
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
  return pdf;
}

(async () => {
  const { browser, page } = await boot();
  const shotCtx = await browser.newContext();
  const shotPage = await shotCtx.newPage();
  await shotPage.setViewportSize({ width: 900, height: 620 });
  await shotPage.setContent(SHOT);
  const png = await shotPage.screenshot({ type: 'png' });
  await shotCtx.close();

  const out = await page.evaluate(async (args) => {
    const { b64, pdfs } = args;
    const post = async (name, blob, type) => {
      const fd = new FormData();
      fd.append('file', new File([blob], name, { type }));
      fd.append('direct', 'true');
      // Raw fetch, not `api()`: `api()` forces a JSON content type, which
      // strips the multipart boundary and makes the upload a 422.
      const r = await fetch('/media/upload', {
        method: 'POST', body: fd,
        headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
      });
      return await r.json();
    };
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const shots = [];
    for (const name of ['price-board.png', 'notice-board.png', 'plain-sky.png']) {
      shots.push(await post(name, bytes, 'image/png'));
    }
    const files = [];
    for (const pdf of pdfs) files.push(await post(pdf[0], pdf[1], 'application/pdf'));
    // One reference each for the first image and the first file, so "Used in
    // 1 place" is a real count rather than a staged string.
    const refs = [];
    //: `POST /media/upload` answers `{id, url, filename}`; `original_name` is
    //: the listing's field (`MediaUploadOut`), so reading it here wrote
    //: `![undefined](...)` into every seeded note (pass2.md, Remaining 6).
    for (const up of [shots[0], files[0]]) {
      if (up && up.url) {
        const r = await api('/entries', {
          method: 'POST',
          body: JSON.stringify({ content: `# Where this came from\n\n![${up.filename || up.original_name || 'Attached file'}](${up.url})`, tags: ['library'] }),
        });
        refs.push(r.status);
      }
    }
    return { shots: shots.map((s) => s.id), files: files.map((f) => f.id), refs };
  }, { b64: png.toString('base64'), pdfs: [['rates-handbook.pdf', onePagePdf('Rates handbook')], ['meeting-pack.pdf', onePagePdf('Meeting pack')]] });
  console.log(JSON.stringify(out));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
