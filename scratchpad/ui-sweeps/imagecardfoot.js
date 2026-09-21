// The foot of the Library media cards, block by block (INBOX 115 and 118).
//
// `imagecardrow.js` beside this measures the row: six cards, their heights,
// their caption line counts. This one measures what is *under* the picture on
// each of them, which is what both reports are about: every block in the
// card's flow with its class, its height and its words, the gap left under
// the last one, and the computed shape of the blocks that carry a fact (the
// count, and the fold where there is one) so "unstyled paragraph" is a number
// rather than an impression.
//
//   BASE=http://127.0.0.1:8897 SCRATCH=/tmp/mm-cards2 THEME=dark WIDTH=1440 \
//   SUBTAB=images PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/imagecardfoot.js
//
// **Three things were stale in it, and the first made it pass on silence.**
//
// 1. `foldStyle` and every card's `fold` came back null. The selector is
//    `.library-image-reading > summary`, and `35a9ef9` took that `<details>`
//    off the picture card (INBOX 279: a 180px tile has nowhere to open into),
//    leaving the `.library-chip` "Text" that opens the lightbox instead. So
//    the two blocks this probe exists to describe were one block, and the
//    probe said nothing about it. Confirmed stale rather than a regression
//    the same way `imagefold.js` was: the fold is there at `35a9ef9^`.
//    `SUBTAB=files` is the answer, the recorded next step in OPEN.md's
//    Library section: the Files sub-tab draws through the same tile builder
//    and keeps the fold, and its rows had never been on screen here.
// 2. The seed-once guard never worked. `api()` returns a `Response`, not a
//    body, so `rows.length` was 0 on every run and a second run against the
//    same data dir seeded six more cards and measured a gallery nobody has
//    (it measured twelve). `apiJson` is what reads a list.
// 3. `execFileSync` ran `pixelcontrast.py` with `cwd` hard-coded to the main
//    checkout, so an agent measuring its own worktree scored the screenshot
//    against another tree's script. It runs from this file's own repository.
const { boot } = require('./lib.js');
const { execFileSync } = require('child_process');

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=';
const CAPTIONS = [
  '',
  'A receipt.',
  'A photograph of a lecture slide with a title and three bullet points under it.',
  'A whiteboard photographed at an angle, covered in boxes and arrows sketched in blue marker, with a laptop and two coffee cups on the table below it.',
  'A scanned page from a notebook, ruled, with a long hand-written list down the left margin and a diagram of a pipeline drawn across the middle of it in two colours, annotated at every arrow.',
  'A screenshot of a settings dialog.',
];
const OCR = 'INGEST -> PARSE -> STORE\nnightly batch?\nask Priya about the retry budget';

const probe = () => {
  const tiles = [...document.querySelectorAll('.library-image-tile')];
  const seen = (el) => {
    if (!el || !el.offsetParent) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const blocks = (root, tile) =>
    [...root.children].filter(seen).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        cls: el.className.toString().split(' ').filter((c) => c.startsWith('library-')).join('.') || el.tagName.toLowerCase(),
        h: +r.height.toFixed(1),
        top: +(r.top - tile.getBoundingClientRect().top).toFixed(1),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      };
    });
  return tiles.map((t) => {
    const r = t.getBoundingClientRect();
    const fr = t.querySelector('.library-image-frame')?.getBoundingClientRect();
    const fields = t.querySelector('.library-image-fields');
    const uses = t.querySelector('.library-image-uses');
    const fold = t.querySelector('.library-image-reading > summary');
    const cs = (el, props) =>
      el && seen(el)
        ? Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]))
        : null;
    const last = [...t.children].filter(seen).pop();
    const lastInner = fields && seen(fields) ? [...fields.children].filter(seen).pop() : null;
    const bottom = lastInner
      ? lastInner.getBoundingClientRect().bottom
      : last
        ? last.getBoundingClientRect().bottom
        : r.bottom;
    return {
      card: +r.height.toFixed(1),
      cardBottom: +r.bottom.toFixed(1),
      picture: fr ? +fr.height.toFixed(1) : null,
      foot: fr ? +(r.bottom - fr.bottom).toFixed(1) : null,
      tail: +(r.bottom - bottom).toFixed(1),
      rows: fields ? blocks(fields, t) : [],
      usesStyle: cs(uses, ['fontSize', 'marginTop', 'marginBottom', 'color', 'display']),
      foldStyle: cs(fold, ['fontSize', 'background', 'paddingTop', 'paddingLeft']),
      foldBox: fold && seen(fold)
        ? {
            w: +fold.getBoundingClientRect().width.toFixed(1),
            h: +fold.getBoundingClientRect().height.toFixed(1),
          }
        : null,
      atRest: [...t.querySelectorAll('button, input, summary, a')].filter(seen).length,
    };
  });
};

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page, OUT } = await boot({ viewport: { width, height: 900 } });
  const say = (k, v) => console.log(`${k}: ${JSON.stringify(v)}`);

  // Seed once per data dir: a second run against the same dir would otherwise
  // add six more cards and measure a gallery nobody has. `apiJson`, because
  // `api()` hands back a `Response` and `Response.length` is undefined, which
  // is what made this guard a no-op for as long as it has existed.
  const seeded = await page.evaluate(async () => {
    const rows = await apiJson('/media');
    return (Array.isArray(rows) ? rows : rows.items || rows.media || rows.files || []).length;
  });
  if (!seeded) {
    await page.evaluate(async ({ b64, captions, ocr }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ids = [];
      for (let i = 0; i < captions.length; i += 1) {
        const fd = new FormData();
        fd.append('file', new File([bytes], `card-${i}.png`, { type: 'image/png' }));
        fd.append('direct', 'true');
        const res = await fetch('/media/upload', {
          method: 'POST', body: fd,
          headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
        });
        ids.push(await res.json());
      }
      for (let i = 0; i < captions.length; i += 1) {
        if (captions[i]) {
          await api(`/media/${ids[i].id}/caption`, { method: 'POST', body: JSON.stringify({ text: captions[i] }) });
        }
      }
      await api(`/media/${ids[3].id}/vision-ocr`, { method: 'POST', body: JSON.stringify({ text: ocr }) });
      await api(`/media/${ids[4].id}/vision-ocr`, { method: 'POST', body: JSON.stringify({ text: ocr }) });
      // Two documents, so `SUBTAB=files` has rows to measure. A hand-written
      // one-page PDF, the builder `seed-file.js` uses: the upload route takes
      // images and PDFs only and the sweeps stay text. No reading is stored on
      // them: `/media/{id}/ocr` and `/vision-ocr` both answer 415 for a PDF.
      for (let i = 0; i < 2; i += 1) {
        const body = `BT /F1 12 Tf 40 120 Td (Weekly review ${i}) Tj ET`;
        const objs = [
          '<</Type/Catalog/Pages 2 0 R>>',
          '<</Type/Pages/Kids[3 0 R]/Count 1>>',
          '<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>',
          `<</Length ${body.length}>>\nstream\n${body}\nendstream`,
          '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
        ];
        let pdf = '%PDF-1.4\n';
        const offsets = [];
        objs.forEach((o, j) => { offsets.push(pdf.length); pdf += `${j + 1} 0 obj\n${o}\nendobj\n`; });
        const xref = pdf.length;
        pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
        for (const off of offsets) pdf += String(off).padStart(10, '0') + ' 00000 n \n';
        pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
        const fd = new FormData();
        fd.append('file', new File([pdf], `card-doc-${i}.pdf`, { type: 'application/pdf' }));
        fd.append('direct', 'true');
        const res = await fetch('/media/upload', {
          method: 'POST', body: fd,
          headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
        });
        // One of them described, so the row's own description block is
        // measured too: `.library-image-caption` moved from `--text-sm` to
        // `--text-md` for the picture cards, and what that did to a Files row
        // has only ever been arithmetic (OPEN.md's Library section).
        if (i === 0) {
          const row = await res.json();
          await api(`/media/${row.id}/caption`, { method: 'POST', body: JSON.stringify({ text: captions[4] }) });
        }
      }
      await api('/entries', { method: 'POST', body: JSON.stringify({ content: `# Foot sweep\n\n![a](${ids[3].url})\n\n![b](${ids[1].url})`, tags: ['sweep'] }) });
      await api('/entries', { method: 'POST', body: JSON.stringify({ content: `# Foot sweep two\n\n![a](${ids[3].url})`, tags: ['sweep'] }) });
    }, { b64: PNG, captions: CAPTIONS, ocr: OCR });
  }

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(700);
  // Which sub-tab's cards. Both draw through `renderLibraryImagesGallery` and
  // share the `library-image-*` classes; only Files still carries the reading
  // fold, so `SUBTAB=files` is the only way this probe measures the block it
  // was named for.
  const subtab = (process.env.SUBTAB || 'images').toLowerCase() === 'files' ? 'file' : 'image';
  await page.evaluate((word) => {
    const b = [...document.querySelectorAll('#library-subtabs button, [data-subtab]')]
      .find((e) => new RegExp(word, 'i').test(e.textContent || e.dataset.subtab || ''));
    if (b) b.click();
  }, subtab);
  await page.waitForTimeout(1600);
  const rows = await page.evaluate(probe);
  say('subtab', subtab === 'file' ? 'files' : 'images');
  say('width', width);
  // A probe that measured nothing must say so rather than print six empty
  // arrays and exit 0, which is how the stale half of this file read as a pass.
  if (!rows.length) {
    console.log(`FAIL: no .library-image-tile on the ${subtab === 'file' ? 'Files' : 'Images'} sub-tab, nothing measured`);
    await browser.close();
    process.exitCode = 1;
    return;
  }
  say('heights', rows.map((r) => r.card));
  say('bottoms', rows.map((r) => r.cardBottom));
  say('pictures', rows.map((r) => r.picture));
  say('tails', rows.map((r) => r.tail));
  say('atRest', rows.map((r) => r.atRest));
  for (const [i, row] of rows.entries()) say(`card${i}`, { foot: row.foot, fold: row.foldBox, rows: row.rows });
  say('usesStyle', rows.map((r) => r.usesStyle).find(Boolean) || null);
  say('foldStyle', rows.map((r) => r.foldStyle).find(Boolean) || null);
  const theme = process.env.THEME || 'light';
  const shot = `${OUT}/imagecardfoot-${subtab === 'file' ? 'files' : 'images'}-${width}-${theme}.png`;
  await page.screenshot({ path: shot });

  // Contrast, from the pixels of that screenshot. Not from a composite walked
  // up the DOM: every surface under a picture card is translucent over the
  // page's own art, and both ways of guessing at it are wrong here. See the
  // header of `pixelcontrast.py`, which holds the numbers that settled it.
  const boxes = await page.evaluate(() => {
    const box = (label, el) => {
      if (!el || !el.offsetParent) return null;
      const r = el.getBoundingClientRect();
      if (r.width < 12 || r.height < 8 || r.bottom > innerHeight) return null;
      return { label, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return [
      box('description', document.querySelector('.library-image-caption')),
      box('uses', document.querySelector('.library-image-uses')),
      // The fold's own summary wherever it is (only Files still has one), and
      // the chip that replaced it on a picture card: both are the handle on
      // the reading, and the contrast of whichever one is drawn is the number
      // this section was added for.
      box('fold', document.querySelector('details.library-image-reading > summary')),
      box('text chip', document.querySelector('.library-image-text-chip')),
    ].filter(Boolean);
  });
  if (boxes.length) {
    // This file's own repository, not a hard-coded checkout: an agent
    // measuring its worktree was scoring the shot against another tree's
    // script.
    const read = execFileSync('python3',
      [`${__dirname}/pixelcontrast.py`, shot, theme, JSON.stringify(boxes)],
      { cwd: `${__dirname}/../..`, encoding: 'utf8' });
    const rows = JSON.parse(read);
    say('contrast', rows.map((r) => `${r.label} ${r.ratio}`));
    const low = rows.filter((r) => r.ratio < 4.5);
    if (low.length) {
      console.log('LOW CONTRAST: ' + JSON.stringify(low));
      // It is in the gate's sweep list now, so a finding has to be an exit
      // code: a probe that prints a fault and exits 0 is the same silence
      // this file was repaired for.
      process.exitCode = 1;
    }
  }
  console.log('shots in ' + OUT);
  await browser.close();
})();
