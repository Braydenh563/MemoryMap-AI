// The hole an open fold leaves in a picture card's row-mates
// (UI_MODERNISATION_PLAN Phase 11, the INBOX 164 block's leftover).
//
//   BASE=http://127.0.0.1:8792 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     timeout 110 node scratchpad/ui-sweeps/imagefold.js
//
// Seven seeded cards in one row at 1440, read twice: shut, and with one card's
// fold open. What it prints per card is the height, the picture's height and
// the *tail*, the distance from the last thing painted in the card to the
// card's own bottom edge, which is the number the report is about. Measured
// before the fix: 240.7px cards with a 42.6px tail shut, and 411.1px cards with
// a 213px tail with one fold open, on six cards that had nothing to show for
// it. The picture is 144px in both states, so none of that 213px is picture.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=';
  const OCR = 'INGEST -> PARSE -> STORE\nnightly batch?\nask Priya about the retry budget\n'.repeat(12);
  await page.evaluate(async ({ b64, ocr }) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    for (let i = 0; i < 6; i++) {
      const fd = new FormData();
      fd.append('file', new File([bytes], `pic-${i}.png`, { type: 'image/png' }));
      fd.append('direct', 'true');
      const r = await fetch('/media/upload', {
        method: 'POST', body: fd,
        headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
      });
      const id = (await r.json()).id;
      await api(`/media/${id}/caption`, { method: 'POST', body: JSON.stringify({ text: 'A picture with a caption of its own.' }) });
      if (i === 0) await api(`/media/${id}/ocr`, { method: 'POST', body: JSON.stringify({ text: ocr }) });
    }
  }, { b64: PNG, ocr: OCR });
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button, [data-subtab]')]
      .find((e) => /image/i.test(e.textContent || e.dataset.subtab || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(2500);

  const read = () =>
    page.evaluate(() => {
      const cards = [...document.querySelectorAll('.library-image-tile')];
      if (!cards.length) return { none: true };
      const topRow = Math.round(cards[0].getBoundingClientRect().top);
      const row = cards.filter((c) => Math.abs(c.getBoundingClientRect().top - topRow) < 4);
      return {
        n: row.length,
        heights: row.map((c) => Math.round(c.getBoundingClientRect().height * 10) / 10),
        pics: row.map((c) => {
          const i = c.querySelector('img');
          return i ? Math.round(i.getBoundingClientRect().height * 10) / 10 : 0;
        }),
        // The gap between the last painted thing in a card and the card's foot.
        slack: row.map((c) => {
          const box = c.getBoundingClientRect();
          const kids = [...c.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().height > 0);
          const last = Math.max(...kids.map((e) => e.getBoundingClientRect().bottom));
          return Math.round((box.bottom - last) * 10) / 10;
        }),
        align: getComputedStyle(document.querySelector('.library-image-tile').parentElement).alignItems + ' / ' + getComputedStyle(document.querySelector('.library-image-tile').parentElement).display,
      };
    });

  console.log('shut ', JSON.stringify(await read()));
  await page.evaluate(() => {
    const f = document.querySelector('.library-image-tile .library-image-card-fold');
    if (f) f.open = true;
  });
  await page.waitForTimeout(700);
  console.log('one open', JSON.stringify(await read()));
  await browser.close();
})();

// Gate: with one fold open, no card other than the open one carries more than
// a control height of tail.
