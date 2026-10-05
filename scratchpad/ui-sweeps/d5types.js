// WORLD_CLASS_PLAN row 10 (D5): the graph colours by note type. Two typed
// notes and one untyped; the graph's View, Colour, Note type: the legend
// names the two types and "No type", a type given a colour in Note types
// shows that colour, the rest the calm scheme; the Note types sheet shows the
// dot and its Colour sheet (the swatch picker) fits with nothing sideways.
//
//   BASE=http://127.0.0.1:8800 WIDTH=1440 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/d5types.js
const { boot } = require('./lib.js');

const check = (label, ok, detail) => console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
const WIDTH = Number(process.env.WIDTH || 1440);

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 }, ...(WIDTH < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const s = Date.now().toString(36).slice(-5);
  const names = { place: `Place ${s}`, book: `Book ${s}` };
  await page.evaluate(async ({ s, names }) => {
    await apiJson('/note-types', { method: 'POST', body: JSON.stringify({ name: names.place, colour: 'teal' }) });
    await apiJson('/note-types', { method: 'POST', body: JSON.stringify({ name: names.book }) });
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `---\ntype: ${names.place}\n---\n# Harbour ${s}\n\nBy the sea.` }) });
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `---\ntype: ${names.book.toLowerCase()}\n---\n# Dune ${s}\n\nSand.` }) });
    await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `# Plain ${s}\n\nNo type here.` }) });
    await loadEntries();
  }, { s, names });
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    const box = document.getElementById('graph-colour');
    box.value = 'type';
    box.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(1500);
  const legend = await page.evaluate(() => [...document.querySelectorAll('#graph-legend .legend-toggle')].map((b) => ({
    text: b.textContent.trim(),
    dot: getComputedStyle(b.querySelector('.legend-dot') || b).backgroundColor,
  })));
  console.log(JSON.stringify(legend));
  const place = legend.find((l) => l.text === names.place);
  const book = legend.find((l) => l.text.toLowerCase() === names.book.toLowerCase());
  const none = legend.find((l) => l.text === 'No type');
  check('the legend names each type and No type', place && book && none);
  // teal is #159172 in CATEGORY_PALETTE.
  check('a type with a colour wears it', place && place.dot === 'rgb(21, 145, 114)', place && place.dot);
  check('a type without one takes another colour', book && place && book.dot !== place.dot && book.dot !== none.dot, book && book.dot);
  const auto = await page.evaluate((name) => {
    const h = categoryAutoDot(name).slice(1);
    return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`;
  }, names.book);
  check('the automatic colour is the one the Colour sheet previews', book && book.dot === auto, `${book && book.dot} vs ${auto}`);
  check('the legend uses the type\'s own name, not the note\'s spelling', book && book.text === names.book, book && book.text);
  check('nothing sideways on the graph', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/d5types-graph-${WIDTH}-${process.env.THEME || 'light'}.png` });

  await page.evaluate(async () => {
    await ensureModule('inbox');
    openNoteTypesSheet();
  });
  await page.waitForTimeout(1200);
  const row = await page.evaluate((name) => {
    const r = [...document.querySelectorAll('[data-sheet="note-types"] .relation-type-row')].find((x) => x.querySelector('.relation-type-name')?.textContent === name);
    if (!r) return null;
    const dot = r.querySelector('.manage-cat-dot');
    const d = dot?.getBoundingClientRect();
    const n = r.querySelector('.relation-type-name').getBoundingClientRect();
    return { dot: dot ? getComputedStyle(dot).backgroundColor : null, w: d && Math.round(d.width), centred: d && Math.abs((d.top + d.bottom) / 2 - (n.top + n.bottom) / 2) <= 2 };
  }, names.place);
  console.log(JSON.stringify(row));
  check('Note types shows the type\'s dot, centred on its name', row && row.dot === 'rgb(21, 145, 114)' && row.w >= 8 && row.centred, JSON.stringify(row));
  await page.evaluate((name) => {
    const r = [...document.querySelectorAll('[data-sheet="note-types"] .relation-type-row')].find((x) => x.querySelector('.relation-type-name')?.textContent === name);
    r.querySelector('.menu-wrap button, button[aria-haspopup]').click();
  }, names.book);
  await page.waitForTimeout(500);
  const item = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].filter((b) => b.offsetParent).map((b) => b.textContent.trim()));
  check('a type\'s ⋯ has Colour…', item.some((t) => t.startsWith('Colour')), item.join(' | '));
  await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((b) => b.offsetParent && b.textContent.trim().startsWith('Colour')).click());
  await page.waitForTimeout(1200);
  const sheet = await page.evaluate(() => {
    const c = document.querySelector('[data-sheet="note-type-colour"] .sheet-card');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { swatches: c.querySelectorAll('.swatch-option').length, h: Math.round(r.height), vh: innerHeight, right: Math.round(r.right), vw: innerWidth, sideways: c.scrollWidth > c.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth };
  });
  console.log(JSON.stringify(sheet));
  check('the colour sheet is the swatch picker, fits, nothing sideways', sheet && sheet.swatches >= 12 && sheet.h <= sheet.vh && sheet.right <= sheet.vw && !sheet.sideways, JSON.stringify(sheet));
  await page.screenshot({ path: `${process.env.SCRATCH || '.'}/d5types-sheet-${WIDTH}-${process.env.THEME || 'light'}.png` });
  await page.evaluate(() => document.querySelector('[data-sheet="note-type-colour"] .swatch-option[aria-label="Violet"]').click());
  await page.waitForTimeout(1200);
  const saved = await page.evaluate(async (name) => (await apiJson('/note-types')).find((t) => t.name === name)?.colour, names.book);
  check('choosing a swatch saves it on the type', saved === 'violet', saved);
  check('no page errors', errors.length === 0, errors.slice(0, 2).join(' | '));
  await browser.close();
})();
