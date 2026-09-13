// What a board's preview actually draws, against what is on the board
// (INBOX 164: "board previews need upgrading and fixing").
//
// The owner's screenshot is a card reading "3 cards, 8 sketches, 1 item" over
// a wash of rounded blobs and one squiggle, so this seeds exactly that board,
// through the app's own API, and then asks the picture five questions:
//
//   1. How many marks are drawn, against how many things are on the board? A
//      preview that draws eight sketches as one mark is missing seven.
//   2. How many *distinct positions* do the sketch marks occupy? Sketches are
//      stored with x=0, y=0 and their strokes in absolute board coordinates,
//      so a preview that reads x/y puts every one of them in the same corner.
//   3. How many distinct sizes? One size for eight sketches is a picture of
//      the renderer, which is the fault INBOX 68 fixed for cards and objects.
//   4. How round is a block, as a fraction of its own short side? A card on
//      the canvas is a rounded rectangle; past about a fifth of the short side
//      it is a blob, and a wall of blobs is the report.
//   5. How many labels are legible, and how many marks carry the board's own
//      ink rather than one flat accent wash?
//
//   BASE=http://127.0.0.1:8961 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node boardpreview.js
//
// Prints the numbers and exits non-zero on any of the five. Seeds its own
// board, named so a re-run finds it rather than making a second one.
const { boot } = require('./lib.js');

const BOARD = 'Preview probe board';
// Past this fraction of a block's own short side the corner stops reading as a
// rounded rectangle. A note card on the canvas is --radius (10px) on a 150px
// side, which is 0.067; a fifth is already generous for a thumbnail.
const ROUND_MAX = 0.2;

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  let failures = 0;

  const seeded = await page.evaluate(async (name) => {
    const post = async (path, body) => (await api(path, { method: 'POST', body: JSON.stringify(body) })).json();
    const boards = await (await api('/whiteboard/boards')).json();
    const found = (Array.isArray(boards) ? boards : boards.boards || []).find((b) => b.title === name);
    if (found) return { board: found.id, reused: true };
    const board = await post('/whiteboard/boards', { name, type: 'board' });

    // Three note cards, spread across the board, each with a title worth
    // reading: a card is a note, so the preview's label is the note's title.
    const titles = ['Retry budget', 'Ingest pipeline', 'Open questions'];
    const at = [[60, 60], [560, 60], [60, 420]];
    for (let i = 0; i < titles.length; i += 1) {
      const entry = await post('/entries', { content: `# ${titles[i]}\n\nOne paragraph about it.`, tags: ['board'] });
      await post('/whiteboard/nodes', { entry_id: entry.id, board_id: board.id, x: at[i][0], y: at[i][1], width: 250, height: 150 });
    }

    // Eight sketches: two lines, two rectangles, two circles and two
    // freehand scribbles, in four places and four sizes, stored the way the
    // board's own drawing tools store them (x=0, y=0, the path in absolute
    // board coordinates).
    const sketches = [
      { shape: 'line', d: 'M340 120 L520 200' },
      { shape: 'line', d: 'M340 480 L520 560' },
      { shape: 'rect', d: 'M860 60 L1100 60 L1100 200 L860 200 Z' },
      { shape: 'rect', d: 'M880 420 L980 420 L980 480 L880 480 Z' },
      { shape: 'circle', d: 'M600 300 a90 60 0 1 0 180 0 a90 60 0 1 0 -180 0' },
      { shape: 'circle', d: 'M200 620 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0' },
      { shape: 'draw', d: 'M420 640 L440 600 L470 660 L500 590 L530 650 L560 600' },
      { shape: 'draw', d: 'M900 560 L930 520 L960 580 L990 510' },
    ];
    for (const s of sketches) {
      await post('/whiteboard/sketches', {
        board_id: board.id, x: 0, y: 0, z: 5,
        data: JSON.stringify({ d: s.d, color: '#d97706', width: 3, shape: s.shape }),
      });
    }

    // And one item that is a picture, which is the kind with no words of its
    // own: the preview has to say "a picture is here" without a label.
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=';
    const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append('file', new File([bytes], 'board-picture.png', { type: 'image/png' }));
    fd.append('direct', 'true');
    const up = await (await fetch('/media/upload', {
      method: 'POST', body: fd,
      headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
    })).json();
    await post('/whiteboard/objects', {
      kind: 'image', board_id: board.id, x: 1180, y: 420, width: 200, height: 150,
      data: { url: up.url },
    });
    return { board: board.id, reused: false };
  }, BOARD);
  console.log(`board ${seeded.board}${seeded.reused ? ' (reused)' : ' (seeded: 3 cards, 8 sketches, 1 image)'}`);

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button')]
      .find((e) => /boards/i.test(e.textContent || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(2500);

  const shot = await page.evaluate((name) => {
    const cards = [...document.querySelectorAll('.library-board-card')];
    const card = cards.find((c) => (c.querySelector('.library-card-title')?.textContent || '').trim() === name);
    if (!card) return { missing: cards.map((c) => (c.querySelector('.library-card-title')?.textContent || '').trim()) };
    const svg = card.querySelector('.board-minimap');
    if (!svg) return { noSvg: true };
    const meta = (card.querySelector('.library-card-meta')?.textContent || '').trim();
    const box = svg.getBoundingClientRect();
    // **The scale `preserveAspectRatio` applied**, which is the only way to
    // compare an `rx` attribute (viewBox units) with a rendered width (CSS
    // px). Without it the first run of this sweep read a 35% corner as 12% and
    // passed a wall of blobs: the paper rect is the viewBox's own box, so its
    // rendered width over its viewBox width is the factor.
    const paperEl = svg.querySelector('.board-minimap-paper');
    const vb = (svg.getAttribute('viewBox') || '0 0 100 100').split(/\s+/).map(Number);
    const scale = paperEl && vb[2] ? paperEl.getBoundingClientRect().width / vb[2] : 1;
    const mark = (e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return {
        cls: [...e.classList].join('.'),
        tag: e.tagName,
        x: +(r.left - box.left).toFixed(1), y: +(r.top - box.top).toFixed(1),
        w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        // The painted ink, so "one flat wash" is a fact rather than a look.
        ink: cs.fill === 'none' ? cs.stroke : cs.fill,
        rx: e.getAttribute('rx') ? +e.getAttribute('rx') : 0,
        // The same radius in rendered pixels, which is what a person sees.
        rxPx: e.getAttribute('rx') ? +(+e.getAttribute('rx') * scale).toFixed(2) : 0,
      };
    };
    const all = [...svg.querySelectorAll('rect, path, ellipse, circle, polygon, line, polyline')]
      .filter((e) => !e.classList.contains('board-minimap-paper'))
      .map(mark);
    const labels = [...svg.querySelectorAll('.board-minimap-label')].map((t) => ({
      text: (t.textContent || '').trim(),
      size: +(parseFloat(getComputedStyle(t).fontSize) || 0).toFixed(1),
      inside: t.classList.contains('board-minimap-label-inside'),
    }));
    return { meta, scale: +scale.toFixed(3), box: { w: +box.width.toFixed(1), h: +box.height.toFixed(1) }, all, labels };
  }, BOARD);

  if (shot.missing || shot.noSvg) {
    console.log(shot.noSvg ? 'the card has no preview at all' : `card not found, saw: ${shot.missing.join(' | ')}`);
    console.log('FAIL: 1 findings');
    await browser.close();
    process.exit(1);
  }

  const sketches = shot.all.filter((m) => m.cls.includes('board-minimap-sketch'));
  const blocks = shot.all.filter((m) => /board-minimap-(card|object|branch|image)/.test(m.cls));
  const key = (m) => `${Math.round(m.x)},${Math.round(m.y)}`;
  const sizeKey = (m) => `${Math.round(m.w)}x${Math.round(m.h)}`;
  const positions = new Set(sketches.map(key)).size;
  const sizes = new Set(sketches.map(sizeKey)).size;
  const inks = new Set(shot.all.map((m) => m.ink));
  console.log(`card box ${shot.box.w}x${shot.box.h} at ${shot.scale}x  meta "${shot.meta}"`);
  console.log(`marks ${shot.all.length}: ${blocks.length} blocks, ${sketches.length} sketch marks`);
  console.log(`sketch marks at ${positions} distinct position(s), ${sizes} distinct size(s)`);
  console.log(`labels ${shot.labels.length}: ${shot.labels.map((l) => `"${l.text}"@${l.size}px${l.inside ? ' inside' : ''}`).join(', ') || 'none'}`);
  console.log(`inks ${[...inks].join(' | ')}`);
  for (const m of shot.all) {
    const short = Math.min(m.w, m.h);
    const share = short > 0 ? (m.rxPx / short * 100).toFixed(0) : '0';
    console.log(`    ${m.tag.padEnd(8)} ${m.cls.padEnd(34)} ${String(m.x).padStart(6)},${String(m.y).padStart(6)}  ${m.w}x${m.h}  rx=${m.rxPx}px (${share}%)  ${m.ink}`);
  }

  const bad = [];
  if (sketches.length < 8) bad.push(`${sketches.length} sketch marks for 8 sketches`);
  if (positions < 6) bad.push(`8 sketches share ${positions} position(s): their strokes are in board coordinates, not at x/y`);
  if (sizes < 4) bad.push(`8 sketches drawn at ${sizes} size(s): the preview is drawing a default, not the sketch`);
  if (shot.labels.length < 3) bad.push(`${shot.labels.length} labels for 3 titled cards`);
  // The owner's words are about roundness: measure it on the rendered box.
  for (const m of blocks) {
    const short = Math.min(m.w, m.h);
    const share = short > 0 ? (m.rxPx / short) : 0;
    if (share > ROUND_MAX) bad.push(`${m.cls} radius is ${(share * 100).toFixed(0)}% of its short side (a blob past ${ROUND_MAX * 100}%)`);
  }
  if (inks.size < 3) bad.push(`${inks.size} ink(s) across ${shot.all.length} marks: one flat wash`);
  failures += bad.length;
  for (const line of bad) console.log(`  ${line}`);
  for (const line of errs) console.log(`    console: ${line}`);
  failures += errs.length;
  console.log(failures ? `FAIL: ${failures} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
