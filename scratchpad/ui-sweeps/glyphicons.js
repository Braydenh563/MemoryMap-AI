// INBOX 263 (6): "I want to strip all signs of being vibecoded by an ai from
// the ui."
//
// The most measurable of those signs in this app is a *typed glyph standing
// in for an icon*: a button whose content is the character U+2715 in an app
// that ships Phosphor and uses it for every other icon. It is the shape an
// assistant reaches for because it needs no asset, and it is visible without
// being nameable: the glyph comes from whatever font has it, at the text's
// weight, on the text's baseline, beside icons drawn at 1em in a weight of
// their own.
//
// This walks the app, finds every visible control whose whole label is one of
// those characters, and measures it against a real `.ph` icon in the same
// place: family, size, weight, and how far its painted box sits from the
// centre of its button.
const { boot } = require('./lib.js');

const GLYPHS = ['✕', '✖', '✗', '×', '✓', '✔', '✎', '⚙', '⚡'];

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(4000);

  const tabs = ['dashboard', 'notes', 'chat', 'documents', 'library', 'timeline', 'graph'];
  const all = [];
  for (const tab of tabs) {
    await page.evaluate((t) => switchTab(t), tab).catch(() => {});
    await page.waitForTimeout(1200);
    const found = await page.evaluate(({ glyphs, tab }) => {
      const out = [];
      for (const el of document.querySelectorAll('button, a, [role="button"], summary')) {
        const text = (el.textContent || '').trim();
        if (!text || text.length > 2) continue;
        if (![...text].some((c) => glyphs.includes(c))) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const cs = getComputedStyle(el);
        // Where the glyph actually paints, against the button's own middle.
        const range = document.createRange();
        range.selectNodeContents(el);
        const g = range.getBoundingClientRect();
        out.push({
          tab, text,
          id: el.id || el.className.toString().slice(0, 48),
          family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
          size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
          weight: cs.fontWeight,
          offY: Math.round(((g.top + g.bottom) / 2 - (r.top + r.bottom) / 2) * 10) / 10,
          box: `${Math.round(r.width)}x${Math.round(r.height)}`,
        });
      }
      return out;
    }, { glyphs: GLYPHS, tab });
    all.push(...found);
  }

  // A real icon button, for the comparison.
  const ref = await page.evaluate(() => {
    const el = document.querySelector('button .ph, button i[class*="ph-"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    const b = el.closest('button').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      family: cs.fontFamily.split(',')[0].replace(/["']/g, ''),
      size: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      weight: cs.fontWeight,
      offY: Math.round(((r.top + r.bottom) / 2 - (b.top + b.bottom) / 2) * 10) / 10,
    };
  });

  console.log('reference icon:', JSON.stringify(ref));
  const seen = new Map();
  for (const row of all) {
    const key = `${row.tab}|${row.id}|${row.text}`;
    if (!seen.has(key)) seen.set(key, row);
  }
  for (const row of seen.values()) {
    console.log(`  ${row.tab.padEnd(10)} "${row.text}" ${row.box.padStart(7)}  ${row.family} ${row.size}/${row.weight} offY ${row.offY}  ${row.id}`);
  }
  console.log(`\n${seen.size ? 'FAIL' : 'PASS'}: ${seen.size} glyph-as-icon control(s)`);
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
  process.exit(seen.size ? 1 : 0);
})();
