// The picker dialogs (INBOX 548): `pickLibraryItemDialog` (the map's "Point a
// new node at…"), `pickEntryDialog`, `pickNotesDialog` and `pickMediaDialog`
// on one shell, `pickerDialog` in selection.js. At 1440 and 390 (THEME=dark
// for dark) asserts, per dialog:
//   - the dialog head (a 16px title, the X last), the `.search-field` well,
//     one filled button at most, the card inside the window, no page overflow;
//   - rows on the rich picker (a 2rem tile, a title over one muted line), one
//     height, none overflowing; the list one height on every source tab;
//   - the keys: Down lights the next row, Enter takes it, Escape closes and
//     gives the focus back; the tabs walk with the arrows;
//   - several notes: the Attach picker's rows, each on one line, the foot on
//     one row, the button off until a tick.
//
//   BASE=http://127.0.0.1:8810 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/pickers.js
const { boot } = require('./lib.js');

(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(ok ? 'ok  ' : 'FAIL', name, ok ? '' : JSON.stringify(detail));
  };
  const theme = process.env.THEME || 'light';
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const w = viewport.width;
    const { browser, page, OUT } = await boot({ viewport });
    await page.evaluate(async () => {
      for (const t of ['Picker sweep: a fairly long note title that should ellipsise inside its row', 'Picker sweep two']) {
        await apiJson('/entries', { method: 'POST', body: JSON.stringify({ title: t, content: `${t}\n\nBody.` }) }).catch(() => 0);
      }
      if (typeof loadEntries === 'function') await loadEntries();
    });
    await page.waitForTimeout(800);
    const measure = () => page.evaluate(() => {
      const card = document.querySelector('.confirm-overlay .entry-pick-card');
      if (!card) return null;
      const r = card.getBoundingClientRect();
      const title = card.querySelector('.dialog-head-title');
      const btns = [...card.querySelector('.dialog-head-actions').children];
      const rows = [...card.querySelectorAll('.entry-pick-row, .note-picker-row')];
      const list = card.querySelector('.entry-pick-list, .media-pick-grid');
      return {
        inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        width: Math.round(r.width),
        titleSize: title && getComputedStyle(title).fontSize,
        lastIsClose: btns[btns.length - 1]?.getAttribute('aria-label') === 'Close',
        field: !!card.querySelector('.search-field > .search-field-input'),
        filled: card.querySelectorAll('button.accent:not(.ghost)').length,
        rows: rows.length,
        heights: [...new Set(rows.map((row) => Math.round(row.getBoundingClientRect().height)))],
        overflow: rows.filter((row) => row.scrollWidth > row.clientWidth + 1).length,
        // One line per row: the tile and the text share a row (they stacked
        // once, under `.space-dialog label`'s block rule).
        stacked: rows.filter((row) => {
          const tile = row.querySelector('.rich-picker-tile')?.getBoundingClientRect();
          const text = row.querySelector('.rich-picker-text, .note-picker-lines')?.getBoundingClientRect();
          return tile && text && text.left < tile.right;
        }).length,
        footRows: new Set([...card.querySelectorAll('.space-dialog-actions button')].map((b) => Math.round(b.getBoundingClientRect().top))).size,
        tiles: [...new Set(rows.map((row) => Math.round(row.querySelector('.rich-picker-tile')?.getBoundingClientRect().width || 0)))],
        abouts: rows.filter((row) => row.querySelector('.rich-picker-about, .note-picker-meta')?.textContent.trim()).length,
        listH: list && Math.round(list.getBoundingClientRect().height),
        pageOverflow: document.documentElement.scrollWidth - innerWidth,
        active: document.activeElement?.className,
      };
    });

    // 1. The map's picker, the one the owner pointed at.
    await page.evaluate(() => {
      document.body.dataset.opener = '1';
      window.__pick = 'pending';
      pickLibraryItemDialog('Point a new node at…').then((v) => (window.__pick = v));
    });
    await page.waitForTimeout(600);
    let m = await measure();
    check(`${w} ${theme} library picker: head, field, X last, inside`, m && m.titleSize === '16px' && m.lastIsClose && m.field && m.inside && m.pageOverflow === 0, m);
    check(`${w} ${theme} library picker: rich rows (2rem tile, a facts line), one height, no overflow`, m && m.rows >= 2 && m.tiles.length === 1 && m.tiles[0] === 32 && m.abouts === m.rows && m.heights.length === 1 && m.overflow === 0 && m.stacked === 0, m);
    await page.screenshot({ path: `${OUT}/picker-library-${w}-${theme}.png` });
    const listHs = [m.listH];
    for (const kind of ['document', 'file', 'link']) {
      await page.click(`.entry-pick-card [data-pick-kind="${kind}"]`);
      await page.waitForTimeout(500);
      listHs.push((await measure()).listH);
    }
    check(`${w} ${theme} library picker: one list height on every tab`, new Set(listHs).size === 1, listHs);
    await page.focus('.entry-pick-card [data-pick-kind="link"]');
    await page.keyboard.press('ArrowRight');
    const tab = await page.evaluate(() => document.activeElement?.dataset.pickKind);
    check(`${w} ${theme} library picker: the arrows walk the tabs (wrapping)`, tab === 'note', tab);
    await page.focus('.entry-pick-card .search-field-input');
    const lit0 = await page.evaluate(() => document.activeElement.getAttribute('aria-activedescendant'));
    await page.keyboard.press('ArrowDown');
    const lit1 = await page.evaluate(() => document.activeElement.getAttribute('aria-activedescendant'));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const picked = await page.evaluate(() => ({ v: window.__pick && window.__pick.kind, open: !!document.querySelector('.entry-pick-card') }));
    check(`${w} ${theme} library picker: Down lights the next row, Enter takes it`, lit0 && lit1 && lit0 !== lit1 && picked.v === 'note' && !picked.open, { lit0, lit1, picked });

    // 2. One note.
    await page.evaluate(() => { window.__pick = 'pending'; pickEntryDialog('Add this to which note?').then((v) => (window.__pick = v)); });
    await page.waitForTimeout(500);
    m = await measure();
    check(`${w} ${theme} note picker: the same shell and rows`, m && m.titleSize === '16px' && m.lastIsClose && m.field && m.rows >= 2 && m.tiles[0] === 32 && m.overflow === 0 && m.inside, m);
    await page.screenshot({ path: `${OUT}/picker-entry-${w}-${theme}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const esc = await page.evaluate(() => ({ v: window.__pick, open: !!document.querySelector('.entry-pick-card') }));
    check(`${w} ${theme} note picker: Escape closes with nothing`, esc.v === null && !esc.open, esc);

    // 3. Several notes.
    await page.evaluate(() => { window.__pick = 'pending'; pickNotesDialog('Make a map of these notes', { confirmLabel: 'Propose a map' }).then((v) => (window.__pick = v)); });
    await page.waitForTimeout(500);
    m = await measure();
    const off = await page.evaluate(() => [...document.querySelectorAll('.entry-pick-card .space-dialog-actions button')].find((b) => /Propose/.test(b.textContent))?.disabled);
    check(`${w} ${theme} notes picker: Attach rows, one filled button, off until a tick`, m && m.rows >= 2 && m.filled === 1 && off === true && m.overflow === 0 && m.stacked === 0 && m.footRows === 1 && m.inside, { m, off });
    await page.focus('.entry-pick-card .search-field-input');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    const on = await page.evaluate(() => [...document.querySelectorAll('.entry-pick-card .space-dialog-actions button')].find((b) => /Propose/.test(b.textContent))?.disabled);
    await page.screenshot({ path: `${OUT}/picker-notes-${w}-${theme}.png` });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const many = await page.evaluate(() => window.__pick);
    check(`${w} ${theme} notes picker: Down, Space ticks, Enter confirms`, on === false && Array.isArray(many) && many.length === 1, { on, many });

    // 4. Pictures.
    await page.evaluate(() => { window.__pick = 'pending'; pickMediaDialog().then((v) => (window.__pick = v)); });
    await page.waitForTimeout(800);
    m = await measure();
    check(`${w} ${theme} media picker: the same shell`, m && m.titleSize === '16px' && m.lastIsClose && m.field && m.inside, m);
    await page.screenshot({ path: `${OUT}/picker-media-${w}-${theme}.png` });
    await page.click('.entry-pick-card .dialog-head-actions button');
    await page.waitForTimeout(200);
    check(`${w} ${theme} media picker: the X closes`, await page.evaluate(() => window.__pick === null && !document.querySelector('.entry-pick-card')), null);
    await browser.close();
  }
  console.log(fails ? `${fails} failing` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
