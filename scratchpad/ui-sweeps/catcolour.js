// A category's own colour, set with the keyboard alone and measured on every
// surface that draws it (INBOX 441 (4)): the Manage categories dot, the note
// chip's dot, the graph node's fill, the timeline chip, the dashboard legend.
// Also an axe scan of the panel and of the picker sheet.
//
//   BASE=http://127.0.0.1:8785 THEME=dark W=1440 SCRATCH=.. \
//     AXE_JS=/tmp/axe-core/package/axe.min.js node catcolour.js
//
// The notebook needs two categories with notes ("Work", "Garden"). Prints one
// JSON-ish line per measurement and a PASS/FAIL tally; exit 1 on any FAIL.
const fs = require('fs');
const { boot } = require('./lib.js');
const W = +(process.env.W || 1440), THEME = process.env.THEME || 'light';
const AXE_JS = process.env.AXE_JS || '/tmp/axe-core/package/axe.min.js';
let fails = 0;
const check = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === undefined ? '' : ' ' + JSON.stringify(detail)}`); };
const TEAL = 'rgb(21, 145, 114)'; // #159172

(async () => {
  const touch = W < 600 ? { hasTouch: true, isMobile: true } : {};
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...touch });
  const key = (k, n = 1) => (async () => { for (let i = 0; i < n; i++) await page.keyboard.press(k); })();
  const settle = (ms = 500) => page.waitForTimeout(ms);

  // Start from automatic so the run is repeatable.
  await page.evaluate(async () => {
    for (const meta of categoryMeta.values()) if (meta.colour) await apiJson(`/categories/${meta.id}/colour`, { method: 'PUT', body: JSON.stringify({ colour: null }) });
    await loadCategories();
  });

  const autoWork = await page.evaluate(() => categoryDotColour('Work'));

  // --- the keyboard path: panel, row, context-menu key, Colour, swatch, Enter
  await page.evaluate(() => openManageCategories());
  await settle(900);
  await page.focus('.manage-cat-filter');
  await key('ArrowDown'); // first row
  for (let i = 0; i < 6; i++) {
    const at = await page.evaluate(() => document.activeElement.dataset.category);
    if (at === 'Work') break;
    await key('ArrowDown');
  }
  check('focus reached the Work row by keys', (await page.evaluate(() => document.activeElement.dataset.category)) === 'Work');
  await key('ContextMenu');
  await settle(300);
  const menu = await page.evaluate(() => [...document.querySelectorAll('[role="menu"] [role="menuitem"]')].map((e) => e.textContent.trim()));
  check('the row menu has Colour', menu.some((t) => /Colour/.test(t)), menu);
  await key('ArrowDown'); // first row of the menu
  for (let i = 0; i < 8; i++) {
    const t = await page.evaluate(() => document.activeElement.textContent.trim());
    if (/Colour/.test(t)) break;
    await key('ArrowDown');
  }
  await key('Enter');
  await settle(500);
  const sheet = await page.evaluate(() => {
    const g = document.querySelector('.swatch-picker');
    return g && {
      role: g.getAttribute('role'), label: g.getAttribute('aria-label'),
      radios: [...g.querySelectorAll('[role="radio"]')].map((r) => [r.getAttribute('aria-label'), r.getAttribute('aria-checked'), r.tabIndex]),
      focus: document.activeElement.getAttribute('aria-label'),
    };
  });
  check('the picker is a named radiogroup of 13 radios, each named', sheet && sheet.role === 'radiogroup' && sheet.radios.length === 13 && sheet.radios.every((r) => r[0]), sheet && sheet.radios.length);
  check('Automatic is checked and focused to begin with', sheet && sheet.focus === 'Automatic' && sheet.radios.find((r) => r[0] === 'Automatic')[1] === 'true', sheet && sheet.focus);

  // axe on the open picker sheet
  if (fs.existsSync(AXE_JS)) {
    await page.evaluate(fs.readFileSync(AXE_JS, 'utf8'));
    const scan = (ctx) => page.evaluate(async (c) => {
      const r = await window.axe.run(document.querySelector(c), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    }, ctx);
    const v = await scan('.swatch-card');
    check('axe: the picker sheet has no violations', v.length === 0, v);
  } else console.log('SKIP axe (no axe-core at ' + AXE_JS + ')');

  await key('Home'); // red
  await key('ArrowRight', 5); // teal
  const moved = await page.evaluate(() => ({ focus: document.activeElement.getAttribute('aria-label'), checked: [...document.querySelectorAll('.swatch-picker [aria-checked="true"]')].map((r) => r.getAttribute('aria-label')), ring: getComputedStyle(document.activeElement).outlineStyle, preview: getComputedStyle(document.querySelector('.swatch-preview'), '::before').backgroundColor }));
  check('arrows move focus and check together to Teal', moved.focus === 'Teal' && moved.checked.join() === 'Teal', moved);
  check('the preview follows the keys', moved.preview === TEAL, moved.preview);
  check('the focused swatch shows a ring', moved.ring !== 'none', moved.ring);
  await key('ArrowLeft', 2); // back to red, then Escape must leave it unchanged
  await key('Escape');
  await settle(500);
  check('Escape leaves the colour unchanged', (await page.evaluate(() => categoryMeta.get('Work').colour)) === null);

  // Do it again and commit with Enter.
  await page.evaluate(() => pickCategoryColour(categoryMeta.get('Work')));
  await settle(500);
  await key('Home');
  await key('ArrowRight', 5);
  await key('Enter');
  await settle(1200);
  check('the colour is stored on the server', (await page.evaluate(async () => (await apiJson('/categories')).find((c) => c.name === 'Work').colour)) === 'teal');

  // --- measure every surface
  const panelDot = await page.evaluate(() => getComputedStyle(document.querySelector('.manage-cat-row[data-category="Work"] .manage-cat-dot')).backgroundColor);
  const gardenDot = await page.evaluate(() => getComputedStyle(document.querySelector('.manage-cat-row[data-category="Garden"] .manage-cat-dot')).backgroundColor);
  check('the panel dot repainted live, without a reload', panelDot === TEAL, panelDot);
  check('another category is untouched', gardenDot !== TEAL, gardenDot);

  if (fs.existsSync(AXE_JS)) {
    await page.evaluate(fs.readFileSync(AXE_JS, 'utf8'));
    const v = await page.evaluate(async () => {
      const r = await window.axe.run(document.querySelector('.manage-cat-card'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
      return r.violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`);
    });
    //: Known and older than the colour work: each row is a `role=option` that
    //: holds its own ⋯ button (axe `nested-interactive`). Reported, not failed,
    //: so a new finding still fails the run.
    const fresh = v.filter((x) => !x.startsWith('nested-interactive'));
    if (fresh.length !== v.length) console.log('KNOWN (older than this work)', v.filter((x) => x.startsWith('nested-interactive')));
    check('axe: the Manage categories panel has no new violations', fresh.length === 0, fresh);
  }
  await key('Escape');
  await settle(300);

  await page.evaluate(() => { activeCategory = null; switchTab('notes'); showNotesSection('browse'); renderSidebar(); renderEntries(); });
  await settle(900);
  const chip = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.entry-meta .chip.category')].find((c) => c.textContent.trim() === 'Work');
    return el && getComputedStyle(el, '::before').backgroundColor;
  });
  check('the note chip dot is the chosen colour', chip === TEAL, chip);

  await page.evaluate(() => switchTab('graph'));
  await settle(3500);
  const graph = await page.evaluate(() => ({
    nodes: gcTab.nodes.filter((n) => n.category === 'Work').map((n) => n.colour),
    other: gcTab.nodes.filter((n) => n.category === 'Garden').map((n) => n.colour),
  }));
  check('every Work graph node is the chosen colour', graph.nodes.length > 0 && graph.nodes.every((c) => c === '#159172'), graph);
  check('Garden graph nodes keep their automatic colour', graph.other.length > 0 && graph.other.every((c) => c !== '#159172'), graph.other);
  // The legend swatch reads the same function.
  const legend = await page.evaluate(() => [...document.querySelectorAll('#graph-legend .legend-item')].map((e) => [e.textContent.trim(), getComputedStyle(e.querySelector('.legend-dot, span, i') || e).backgroundColor]).slice(0, 4));
  console.log('legend', JSON.stringify(legend));

  // Live: choose Garden's colour while the graph is showing and watch it redraw.
  await page.evaluate(async () => { const m = categoryMeta.get('Garden'); await apiJson(`/categories/${m.id}/colour`, { method: 'PUT', body: JSON.stringify({ colour: 'violet' }) }); await loadCategories(); });
  await settle(3500);
  const live = await page.evaluate(() => gcTab.nodes.filter((n) => n.category === 'Garden').map((n) => n.colour));
  check('the open graph redraws with the new colour', live.length > 0 && live.every((c) => c === '#9b63e9'), live);

  await page.evaluate(() => switchTab('timeline'));
  await settle(2500);
  const tl = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.chip.category')].find((c) => c.textContent.trim() === 'Work');
    return el ? getComputedStyle(el, '::before').backgroundColor : null;
  });
  console.log('timeline chip dot', tl);

  //: Both widgets are hidden in the default layout, so each is rendered into a
  //: scratch host in the page and read there.
  await page.evaluate(() => switchTab('dashboard'));
  await settle(1500);
  const dash = await page.evaluate(async () => {
    const host = document.createElement('div');
    host.id = 'catcolour-host';
    document.body.appendChild(host);
    const bars = document.createElement('div');
    const art = document.createElement('div');
    host.append(bars, art);
    await renderCategoriesWidget(bars);
    await renderArtWidget(art);
    await new Promise((r) => setTimeout(r, 1500));
    const bar = [...bars.querySelectorAll('.cat-row')].find((r) => r.textContent.includes('Work'));
    const dots = [...art.querySelectorAll('.art-legend-item')].map((e) => [e.textContent.trim(), getComputedStyle(e.querySelector('.art-legend-dot')).backgroundColor]);
    const out = { bar: bar ? getComputedStyle(bar.querySelector('.cat-fill')).backgroundColor : null, dots };
    host.remove();
    return out;
  });
  check('the dashboard bar for Work is the chosen colour', dash.bar === TEAL, dash.bar);
  check('the constellation legend dot for Work is the chosen colour', (dash.dots.find((d) => d[0].startsWith('Work')) || [])[1] === TEAL, dash.dots);

  // Survives a reload; Automatic clears back to the hash colour.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await settle(4000);
  const afterReload = await page.evaluate(() => categoryDotColour('Work'));
  check('the choice survives a reload', afterReload === '#159172', afterReload);
  await page.evaluate(() => pickCategoryColour(categoryMeta.get('Work')));
  await settle(500);
  await key('End'); // Automatic
  await key('Enter');
  await settle(1200);
  const cleared = await page.evaluate(() => categoryDotColour('Work'));
  check('Automatic clears it back to the name-hash colour', cleared === autoWork, [cleared, autoWork]);

  fs.mkdirSync(`${process.env.SCRATCH || '.'}/shots`, { recursive: true });
  await browser.close();
  console.log(fails ? `${fails} FAILED (${THEME}, ${W})` : `ALL PASSED (${THEME}, ${W})`);
  process.exit(fails ? 1 : 0);
})();
