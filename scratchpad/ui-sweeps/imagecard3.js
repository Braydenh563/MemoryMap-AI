// The three geometry faults in the third report on the Library image cards
// (INBOX 145), each as a number rather than a look.
//
//   "the selection checkbox is a dark square floating over the top-left of
//    every picture with no ground of its own, hardest to see on the dark
//    thumbnails; the filename band sits on a grey strip across the bottom of
//    the picture on some cards and over open sky on others, depending on the
//    image; ... opening 'Text' on one card grows it well past its neighbours,
//    so the row's cards are 260px and 620px side by side"
//
//   BASE=http://127.0.0.1:8931 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node imagecard3.js
//
// Prints: the tick's resting ground and ring, the filename band's height and
// its background (one value per card, so "the same on every card" is a fact
// and not an impression), and the row's tallest card with every fold open
// against its shortest.
const { boot } = require('./lib.js');

// The fold's cap plus a card's other parts. A card is ~260px shut; an open one
// must not be more than about twice that, which is the shape of the report.
const OPEN_RATIO_MAX = 2.0;

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  // Seeded through the app's own API, the same way imagecardbottom.js does it,
  // so the three states the gallery renders are all present: every field
  // filled, half filled, and empty. A scratch data dir has no pictures.
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=';
  const OCR = 'INGEST -> PARSE -> STORE\nnightly batch?\nask Priya about the retry budget\n'.repeat(12);
  console.log('seeded: ' + await page.evaluate(async ({ b64, ocr }) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ids = [];
    for (const name of ['board-photo.png', 'lecture-slide.png', 'receipt-scan.png']) {
      const fd = new FormData();
      fd.append('file', new File([bytes], name, { type: 'image/png' }));
      fd.append('direct', 'true');
      const r = await fetch('/media/upload', {
        method: 'POST', body: fd,
        headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
      });
      ids.push((await r.json()).id);
    }
    await api(`/media/${ids[0]}/caption`, { method: 'POST', body: JSON.stringify({ text: 'A whiteboard photographed at an angle, covered in boxes and arrows.' }) });
    // A long transcription on one card only: that is the card the report is
    // about, the one whose open fold set the height of the whole row.
    await api(`/media/${ids[0]}/ocr`, { method: 'POST', body: JSON.stringify({ text: ocr }) });
    await api(`/media/${ids[1]}/caption`, { method: 'POST', body: JSON.stringify({ text: 'A slide with a title and three bullets.' }) });
    return ids.length;
  }, { b64: PNG, ocr: OCR }));

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(800);
  // By label, not by target id: the sub-tab strip is built from buttons whose
  // data attribute has changed name once already.
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button, [data-subtab]')]
      .find((e) => /image/i.test(e.textContent || e.dataset.subtab || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(2500);

  const rest = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.library-image-tile')]
      .filter((t) => t.querySelector('.library-image-frame'));
    if (!tiles.length) return { tiles: 0 };
    return {
      tiles: tiles.length,
      ticks: tiles.map((t) => {
        const tick = t.querySelector('.library-tile-tick');
        if (!tick) return null;
        const cs = getComputedStyle(tick);
        return { bg: cs.backgroundColor, border: cs.borderTopColor, ring: cs.boxShadow.slice(0, 40) };
      }),
      bands: tiles.map((t) => {
        const cap = t.querySelector('.library-image-frame figcaption');
        if (!cap) return null;
        const cs = getComputedStyle(cap);
        const r = cap.getBoundingClientRect();
        return {
          h: Math.round(r.height * 10) / 10,
          bg: cs.backgroundColor,
          // A gradient lives in background-image; a flat ground has none, and
          // that is exactly the difference the report is about.
          gradient: cs.backgroundImage !== 'none',
        };
      }),
      shut: tiles.map((t) => Math.round(t.getBoundingClientRect().height)),
      //: **The ratio is a question about one row**, and this used to ask it of
      //: the whole gallery. The report behind it is "the row's cards are 260px
      //: and 620px side by side": a grid stretches each row to its own tallest
      //: card, so on a gallery of 180 pictures the tallest open card and the
      //: shortest shut one are in different rows and the ratio between them is
      //: not about anything. Measured on a scratch notebook with 182 cards: 2.63
      //: across the gallery, 1.71 inside the row, for the same gallery. The row
      //: is taken by top edge, the same way `imagecard4.js` does it.
      rowShut: (() => {
        const top = Math.round(tiles[0].getBoundingClientRect().top);
        return tiles
          .filter((t) => Math.abs(Math.round(t.getBoundingClientRect().top) - top) < 2)
          .map((t) => Math.round(t.getBoundingClientRect().height));
      })(),
    };
  });
  if (!rest.tiles) { console.log('FAIL: no image tiles (seed the gallery first)'); await browser.close(); process.exit(1); }

  const open = await page.evaluate(async () => {
    const tiles = [...document.querySelectorAll('.library-image-tile')]
      .filter((t) => t.querySelector('.library-image-frame'));
    const top = Math.round(tiles[0].getBoundingClientRect().top);
    for (const d of document.querySelectorAll('.library-image-card-fold')) d.open = true;
    await new Promise((r) => setTimeout(r, 600));
    // The same row the resting measurement took, re-read after opening: a row's
    // cards are what sit side by side, and side by side is what the report is
    // about.
    return tiles
      .filter((t) => Math.abs(Math.round(t.getBoundingClientRect().top) - top) < 2)
      .map((t) => Math.round(t.getBoundingClientRect().height));
  });

  const uniq = (xs) => [...new Set(xs.map((x) => JSON.stringify(x)))];
  const tickGrounds = uniq(rest.ticks.filter(Boolean));
  const bandGrounds = uniq(rest.bands.filter(Boolean).map((b) => ({ bg: b.bg, gradient: b.gradient })));
  const bandHeights = [...new Set(rest.bands.filter(Boolean).map((b) => b.h))];
  const tallest = Math.max(...open);
  const shortest = Math.min(...rest.rowShut);
  const ratio = tallest / shortest;

  console.log(`tiles         ${rest.tiles}`);
  console.log(`tick ground   ${tickGrounds.length} distinct: ${tickGrounds.join(' | ').slice(0, 200)}`);
  console.log(`band ground   ${bandGrounds.length} distinct: ${bandGrounds.join(' | ')}`);
  console.log(`band height   ${bandHeights.join(', ')}px`);
  console.log(`card heights  gallery shut ${Math.min(...rest.shut)}..${Math.max(...rest.shut)}`);
  console.log(`first row     shut ${Math.min(...rest.rowShut)}..${Math.max(...rest.rowShut)}  all folds open ${Math.min(...open)}..${tallest}  ratio ${ratio.toFixed(2)}`);
  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);

  const bad = [];
  if (tickGrounds.length !== 1) bad.push('the tick has more than one resting ground');
  if (bandGrounds.length !== 1) bad.push('the filename band has more than one ground');
  if (bandGrounds.length === 1 && JSON.parse(bandGrounds[0]).gradient) bad.push('the filename band is still a gradient');
  if (bandHeights.length !== 1) bad.push('the filename band is a different height per card');
  if (ratio > OPEN_RATIO_MAX) bad.push(`an open card is ${ratio.toFixed(2)}x the shortest, over ${OPEN_RATIO_MAX}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS: one tick ground, one flat band of one height, open cards within bounds');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
