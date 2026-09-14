// The picture cards, on the fourth report (INBOX 164: "the image cards in the
// library images subtab need a massive improvement in ui and ux").
//
// The third report was geometry and is measured by `imagecard3.js` (the tick's
// ground, the filename band, the open fold's cap), which still passes. This one
// asks what is left, at rest and with a fold open, and the questions are about
// *use* rather than about paint:
//
//   1. Can the card's own action be reached without a pointer? Opening the
//      picture is the whole point of a gallery. It is a click handler on the
//      thumbnail and another on the filename, neither of which is focusable, so
//      a keyboard cannot open a single picture in the Library.
//   2. Does the card say it can be opened? A pointer over a thumbnail that
//      opens a lightbox should not have the arrow it has over a photograph in a
//      note.
//   3. Is the focused control visible? A card whose controls take focus with no
//      ring is a keyboard dead end even once it is reachable.
//   4. Within one grid row, do the cards line up, and how much empty space is
//      under the last line of each? That is INBOX 118's complaint, and the
//      measurement that the picture-grows-instead rule was built from.
//   5. With one fold open in a row, what happens to its neighbours?
//
//   BASE=http://127.0.0.1:8961 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node imagecard4.js
//
// Seeds three pictures in the three states the gallery renders, the same way
// imagecard3.js does. Non-zero on any finding.
const { boot } = require('./lib.js');

// How much unused space is tolerable under a card's last line, in px. The
// picture takes the slack up to its own ceiling (`max-height: 16rem`), so past
// the ceiling a hole is expected; this is the figure for a row nobody has
// opened a fold in.
// INBOX 174 revised the trade-off: pictures are one height (9rem) and rows
// stay level, so a card with less text than its row-mates carries the
// difference under its last line. That is the ordinary card-grid gap, up to
// about a caption's worth; what may not happen is a picture growing to fill it.
const HOLE_MAX = 110;

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  let failures = 0;

  const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=';
  console.log('seeded: ' + await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ids = [];
    for (const name of ['card4-full.png', 'card4-half.png', 'card4-empty.png']) {
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
    await api(`/media/${ids[0]}/ocr`, { method: 'POST', body: JSON.stringify({ text: 'INGEST -> PARSE -> STORE\nnightly batch?\n'.repeat(10) }) });
    await api(`/media/${ids[1]}/caption`, { method: 'POST', body: JSON.stringify({ text: 'A slide with a title and three bullets.' }) });
    return ids.length;
  }, PNG));

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button')]
      .find((e) => /image/i.test(e.textContent || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(2500);

  const rest = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.library-image-tile')]
      .filter((t) => t.querySelector('.library-image-frame'));
    if (!tiles.length) return { tiles: 0 };
    const focusable = (root) => [...root.querySelectorAll(
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex]:not([tabindex="-1"])'
    )].filter((e) => e.checkVisibility && e.checkVisibility());
    const name = (e) => e.tagName.toLowerCase()
      + (typeof e.className === 'string' && e.className ? '.' + e.className.trim().split(/\s+/)[0] : '');
    // One row of the grid, by top edge: the questions about lining up are
    // questions about a row, and a gallery of 160 pictures has many.
    const top = Math.round(tiles[0].getBoundingClientRect().top);
    const row = tiles.filter((t) => Math.abs(Math.round(t.getBoundingClientRect().top) - top) < 2);
    const picture = (t) => t.querySelector('.library-image-frame > img, .library-image-frame > .library-file-thumb');
    return {
      tiles: tiles.length,
      rowSize: row.length,
      row: row.map((t) => {
        const box = t.getBoundingClientRect();
        const pic = picture(t);
        const kids = [...t.children].filter((e) => e.checkVisibility && e.checkVisibility());
        const last = kids[kids.length - 1];
        return {
          name: (t.querySelector('figcaption')?.textContent || '').trim().slice(0, 18),
          h: +box.height.toFixed(1),
          picture: pic ? +pic.getBoundingClientRect().height.toFixed(1) : 0,
          // The gap between the bottom of the last thing on the card and the
          // card's own bottom edge, which is the "hole" every report about
          // these cards has been about.
          hole: last ? +(box.bottom - last.getBoundingClientRect().bottom).toFixed(1) : null,
          controls: focusable(t).map(name),
        };
      }),
      // The picture's own affordances, on the first card.
      pictureProbe: (() => {
        const pic = picture(tiles[0]);
        if (!pic) return null;
        const cs = getComputedStyle(pic);
        return {
          tag: pic.tagName.toLowerCase(),
          role: pic.getAttribute('role'),
          tabindex: pic.getAttribute('tabindex'),
          label: pic.getAttribute('aria-label'),
          cursor: cs.cursor,
          focusable: pic.matches('[tabindex]:not([tabindex="-1"]), a[href], button'),
        };
      })(),
      captionCursor: (() => {
        const cap = tiles[0].querySelector('.library-image-frame figcaption');
        return cap ? getComputedStyle(cap).cursor : null;
      })(),
    };
  });
  if (!rest.tiles) {
    console.log('no picture cards: seed the gallery first');
    console.log('FAIL: 1 findings');
    await browser.close();
    process.exit(1);
  }

  console.log(`${rest.tiles} cards, first row of ${rest.rowSize}`);
  for (const c of rest.row) {
    console.log(`  ${c.name.padEnd(20)} card ${c.h}  picture ${c.picture}  hole ${c.hole}  focusable: ${c.controls.join(', ') || 'none'}`);
  }
  console.log(`picture: ${JSON.stringify(rest.pictureProbe)}`);
  console.log(`filename cursor: ${rest.captionCursor}`);

  // 1 and 3. Tab to the picture and press Enter: does the lightbox open?
  //
  // **Focused with the Tab key, not with `.focus()`**, and that is the whole
  // measurement in the ring's case: `:focus-visible` is the browser's judgement
  // about whether the focus came from a keyboard, so a programmatic focus gets
  // focus without the ring and reports a ring of "" for a rule that is there and
  // working. The tick is the control before the picture in the card's own order,
  // so one Tab from it lands here.
  await page.evaluate(() => {
    const tile = [...document.querySelectorAll('.library-image-tile')]
      .find((t) => t.querySelector('.library-image-frame'));
    tile?.querySelector('.library-tile-tick')?.focus();
  });
  await page.keyboard.press('Tab');
  await page.waitForTimeout(200);
  const keyboard = await page.evaluate(async () => {
    const tile = [...document.querySelectorAll('.library-image-tile')]
      .find((t) => t.querySelector('.library-image-frame'));
    const pic = tile && tile.querySelector('.library-image-frame > img, .library-image-frame > .library-file-thumb');
    if (!pic) return { reached: false, opened: false, ring: null };
    const reached = document.activeElement === pic;
    const cs = reached ? getComputedStyle(pic) : null;
    const ring = cs ? `${cs.outlineWidth} ${cs.outlineStyle} ${cs.outlineColor} at ${cs.outlineOffset}` : null;
    if (!reached) pic.focus();
    pic.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r) => setTimeout(r, 700));
    // The lightbox is built on demand and appended to the body with a class, not
    // an id (`openLightbox` in app.js), which is what made the first run of this
    // sweep report "Enter does not open it" while it did.
    const box = document.querySelector('.lightbox');
    const opened = !!box;
    if (opened) box.querySelector('.lightbox-close')?.click();
    return { reached, opened, ring };
  });
  await page.waitForTimeout(400);
  console.log(`keyboard: focus reaches the picture ${keyboard.reached}, Enter opens it ${keyboard.opened}, focus ring ${keyboard.ring}`);

  // 5. One fold open in the row: what it does to its neighbours.
  const folded = await page.evaluate(async () => {
    const tiles = [...document.querySelectorAll('.library-image-tile')]
      .filter((t) => t.querySelector('.library-image-frame'));
    const top = Math.round(tiles[0].getBoundingClientRect().top);
    const row = tiles.filter((t) => Math.abs(Math.round(t.getBoundingClientRect().top) - top) < 2);
    const before = row.map((t) => +t.getBoundingClientRect().height.toFixed(1));
    const fold = row.map((t) => t.querySelector('.library-image-card-fold')).find(Boolean);
    if (!fold) return { before, after: before, opened: false };
    fold.open = true;
    await new Promise((r) => setTimeout(r, 700));
    const after = row.map((t) => {
      const box = t.getBoundingClientRect();
      const kids = [...t.children].filter((e) => e.checkVisibility && e.checkVisibility());
      const last = kids[kids.length - 1];
      return {
        h: +box.height.toFixed(1),
        picture: +t.querySelector('.library-image-frame').getBoundingClientRect().height.toFixed(1),
        hole: last ? +(box.bottom - last.getBoundingClientRect().bottom).toFixed(1) : null,
      };
    });
    fold.open = false;
    return { before, after, opened: true };
  });
  console.log(`one fold open: row was ${folded.before.join(', ')} -> ${folded.after.map((a) => `${a.h} (picture ${a.picture}, hole ${a.hole})`).join(', ')}`);
  // INBOX 174: a fold opening must not stretch the pictures beside it, and
  // the row may grow by a bounded amount only (the fold's own ceiling).
  const FOLD_GROWTH_MAX = 180; // the fold body's own 11rem ceiling
  if (folded.opened) {
    const pictures = new Set(folded.after.map((a) => Math.round(a.picture)));
    if (pictures.size > 1 || Math.round(folded.after[0].picture) !== 144) failures += 1, console.log(`  pictures change with an open fold: ${[...pictures].join(', ')}px`);
    const growth = Math.max(...folded.after.map((a, i) => a.h - folded.before[i]));
    if (growth > FOLD_GROWTH_MAX) failures += 1, console.log(`  an open fold grows the row by ${growth.toFixed(1)}px (ceiling ${FOLD_GROWTH_MAX})`);
  }

  const bad = [];
  if (!rest.pictureProbe) bad.push('no picture found on the first card');
  else {
    if (!rest.pictureProbe.focusable) bad.push('the picture is not focusable: the card\'s own action is pointer-only');
    if (!rest.pictureProbe.label) bad.push('the picture has no accessible name to announce');
    if (rest.pictureProbe.cursor === 'auto' || rest.pictureProbe.cursor === 'default') {
      bad.push(`the picture opens a lightbox and its cursor is "${rest.pictureProbe.cursor}"`);
    }
  }
  if (!keyboard.reached) bad.push('focus cannot reach the picture with the Tab key');
  if (keyboard.ring && /^(0px|none)/.test(keyboard.ring)) bad.push(`the focused picture draws no ring (${keyboard.ring})`);
  if (!keyboard.opened) bad.push('Enter on the picture does not open it');
  const heights = new Set(rest.row.map((c) => Math.round(c.h)));
  if (heights.size > 1) bad.push(`the cards in one row are ${[...heights].join(', ')}px tall`);
  for (const c of rest.row) {
    if (c.hole !== null && c.hole > HOLE_MAX) bad.push(`${c.name} carries ${c.hole}px of nothing under its last line`);
  }
  failures += bad.length;
  for (const line of bad) console.log(`  ${line}`);
  for (const line of errs) console.log(`    console: ${line}`);
  failures += errs.length;
  console.log(failures ? `FAIL: ${failures} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
