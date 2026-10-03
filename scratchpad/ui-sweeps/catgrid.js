// The Manage categories panel as a grid (INBOX 433): the rows' geometry
// (so a before, served with OVERRIDE_JS/OVERRIDE_CSS, compares with an
// after) and every behaviour the listbox had: a click selects, Ctrl adds,
// arrows/Home/End move, Space toggles, Right reaches the ⋯ and Left comes
// back, the context-menu key opens the row's menu, the footer counts the
// selection, Enter and a double click show the notes.
const { boot } = require('./lib.js');

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const opts = { viewport: { width, height: 900 } };
  if (width < 600) { opts.hasTouch = true; opts.isMobile = true; }
  const { browser, page } = await boot(opts);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const open = async () => {
    await page.evaluate(() => openManageCategories());
    await page.waitForTimeout(900);
  };
  await open();
  const stop = () => page.evaluate(() => {
    const a = document.activeElement;
    const row = a.closest('[data-category]');
    return `${row ? row.dataset.category : '-'}:${a.closest('.menu-wrap') ? 'menu' : a.className.split(' ')[0] || a.tagName}`;
  });
  console.log('geometry', await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.manage-cat-row')].slice(0, 3);
    return JSON.stringify(rows.map((r) => {
      const b = r.getBoundingClientRect();
      const part = (sel) => { const e = r.querySelector(sel); if (!e) return null; const x = e.getBoundingClientRect(); return [Math.round(x.left - b.left), Math.round(x.top - b.top), Math.round(x.width), Math.round(x.height)]; };
      return { h: Math.round(b.height), dot: part('.manage-cat-dot'), name: part('.manage-cat-name'), count: part('.manage-cat-count'), menu: part('.manage-cat-menu > button') || part('.manage-cat-spacer') };
    }));
  }));
  const rowSel = (n) => `.manage-cat-row:nth-child(${n})`;
  await page.click(`${rowSel(2)} .manage-cat-name`);
  await page.waitForTimeout(200);
  await page.click(`${rowSel(3)} .manage-cat-name`, { modifiers: ['Control'] });
  await page.waitForTimeout(200);
  console.log('selected after click + ctrl-click', await page.evaluate(() => [...document.querySelectorAll('.manage-cat-row[aria-selected="true"]')].map((r) => r.dataset.category).join(',')),
    '| footer', await page.evaluate(() => document.querySelector('.manage-cat-footer:not(.hidden) .manage-cat-footer-label')?.textContent));
  console.log('focus after click', await stop());
  await page.keyboard.press('ArrowDown'); const down = await stop();
  await page.keyboard.press('Home'); const home = await stop();
  await page.keyboard.press('End'); const end = await stop();
  await page.keyboard.press('ArrowUp'); const up = await stop();
  console.log('arrows', down, home, end, up);
  await page.keyboard.press('Space'); await page.waitForTimeout(150);
  console.log('space toggles', await page.evaluate(() => document.activeElement.closest('[data-category]')?.getAttribute('aria-selected')), await stop());
  await page.keyboard.press('ArrowRight'); const right = await stop();
  await page.keyboard.press('ArrowLeft'); const left = await stop();
  console.log('right/left', right, left);
  console.log('ring', await page.evaluate(() => {
    const row = document.activeElement.closest('.manage-cat-row');
    return row ? getComputedStyle(row).outlineStyle + ' ' + getComputedStyle(row).outlineWidth : 'none';
  }));
  await page.keyboard.press('Shift+F10'); await page.waitForTimeout(250);
  console.log('shift+f10 menu open', await page.evaluate(() => [...document.querySelectorAll('.action-menu')].some((m) => !m.classList.contains('hidden') && m.getClientRects().length)));
  await page.keyboard.press('Escape'); await page.waitForTimeout(200);
  console.log('focus after menu escape', await stop());
  console.log('tab stops in grid', await page.evaluate(() => document.querySelectorAll('.manage-cat-list [tabindex="0"]').length));
  await page.keyboard.press('Enter'); await page.waitForTimeout(600);
  console.log('enter shows notes', await page.evaluate(() => typeof activeCategory !== 'undefined' ? activeCategory : '?'));
  await open();
  await page.dblclick(`${rowSel(4)} .manage-cat-name`); await page.waitForTimeout(600);
  console.log('dblclick shows notes', await page.evaluate(() => activeCategory));
  console.log('page errors', errors.length, errors.slice(0, 2).join(' | '));
  await browser.close();
})();
