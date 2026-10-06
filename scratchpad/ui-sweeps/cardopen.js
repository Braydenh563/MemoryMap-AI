// The accessible card (INBOX 433): the Library's cards, the board cards and
// the Documents rows open from their title, whose click area is stretched
// over the card. Measures, per list: what a press at five points of a card
// lands on (the title's overlay, or the card's own tick and ⋯), the Tab
// order into the grid, Enter on the title, an arrow key between cards,
// right-click anywhere on a card, and the focus ring on the card.
const { boot } = require('./lib.js');

async function hits(page, hostSel) {
  return page.evaluate((sel) => {
    const card = [...document.querySelectorAll(sel)].find((c) => c.offsetParent && c.querySelector('.card-open'));
    if (!card) return 'no card';
    const r = card.getBoundingClientRect();
    const name = (el) => !el ? 'null' : el.classList.contains('card-open') ? 'opener'
      : el.closest('.menu-wrap') ? 'menu' : (el.matches('input[type=checkbox]') ? 'tick' : el.tagName.toLowerCase() + '.' + el.className);
    const at = (x, y) => name(document.elementFromPoint(x, y));
    const out = {
      centre: at(r.left + r.width / 2, r.top + r.height / 2),
      bottomLeft: at(r.left + 6, r.bottom - 6),
      topLeft: at(r.left + 6, r.top + 6),
      bottomRight: at(r.right - 6, r.bottom - 6),
    };
    const menuBtn = card.querySelector('.menu-wrap > button');
    if (menuBtn) {
      const b = menuBtn.getBoundingClientRect();
      out.menuButton = at(b.left + b.width / 2, b.top + b.height / 2);
    }
    const tick = card.querySelector('input[type=checkbox]');
    if (tick) {
      card.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      const b = tick.getBoundingClientRect();
      out.tick = b.width ? at(b.left + b.width / 2, b.top + b.height / 2) : 'zero-size';
    }
    out.cardRole = card.getAttribute('role');
    out.cardTabIndex = card.getAttribute('tabindex');
    out.openerName = card.querySelector('.card-open').getAttribute('aria-label') || card.querySelector('.card-open').textContent.trim().slice(0, 40);
    return out;
  }, hostSel);
}

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const opts = { viewport: { width, height: 900 } };
  if (process.env.TOUCH) { opts.hasTouch = true; opts.isMobile = true; }
  const { browser, page } = await boot(opts);
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(1200);

  console.log('library hits', JSON.stringify(await hits(page, '#library-grid .library-card')));
  // The pointer over the card (hover reveals the ⋯), then over the ⋯ itself.
  const card = page.locator('#library-grid .library-card.library-note').first();
  await card.hover();
  await page.waitForTimeout(250);
  console.log('library hits hovered', JSON.stringify(await hits(page, '#library-grid .library-card.library-note')));

  // Tab order: into the grid from the stop before it, and out the far side.
  const where = () => page.evaluate(() => {
    const a = document.activeElement;
    const inGrid = a.closest('#library-grid');
    return (inGrid ? 'GRID:' : '') + (a.classList.contains('card-open') ? 'opener' : a.closest('.menu-wrap') ? 'menu' : a.type === 'checkbox' ? 'tick' : a.id || a.className || a.tagName);
  });
  console.log('grid stops', await page.evaluate(() => document.querySelectorAll('#library-grid [tabindex="0"], #library-grid input:not([tabindex="-1"]), #library-grid button:not([tabindex="-1"])').length));
  await page.evaluate(() => document.querySelector('#library-grid .card-open[tabindex="0"]')?.focus());
  await page.keyboard.press('Shift+Tab');
  const stops = [await where()];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    stops.push(await where());
  }
  console.log('tab order', stops.join(' > '));
  // Focus ring on the card while its title has the keyboard focus.
  await page.evaluate(() => document.querySelector('#library-grid .card-open[tabindex="0"]')?.focus());
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  console.log('ring', await page.evaluate(() => {
    const a = document.activeElement;
    const c = a.closest('.library-card');
    if (!c) return 'focus not on a card: ' + a.className;
    const cs = getComputedStyle(c);
    return JSON.stringify({ on: a.className, outline: cs.outlineStyle + ' ' + cs.outlineWidth, border: cs.borderColor, titleOutline: getComputedStyle(a).outlineStyle });
  }));
  // Arrow right moves to another card's opener.
  const before = await page.evaluate(() => document.activeElement.textContent.trim().slice(0, 30));
  await page.keyboard.press('ArrowRight');
  const after = await page.evaluate(() => [document.activeElement.classList.contains('card-open'), document.activeElement.textContent.trim().slice(0, 30)]);
  console.log('arrow', JSON.stringify({ before, after }));

  // Right-click on the preview area opens the card's menu.
  const box = await card.boundingBox();
  await page.mouse.click(box.x + 12, box.y + box.height - 12, { button: 'right' });
  await page.waitForTimeout(300);
  console.log('context menu', await page.evaluate(() => [...document.querySelectorAll('.action-menu')].filter((m) => m.getClientRects().length && !m.classList.contains('hidden')).length));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // A click at the card's bottom-left opens the note (Notes tab).
  await page.mouse.click(box.x + 12, box.y + box.height - 12);
  await page.waitForTimeout(800);
  console.log('click opens', await page.evaluate(() => document.querySelector('.tab-btn.active, [role=tab][aria-selected=true]')?.dataset?.tab || location.hash));

  // Enter on a title opens too.
  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(900);
  await page.evaluate(() => document.querySelector('#library-grid .library-card.library-note .card-open')?.focus());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  console.log('enter opens', await page.evaluate(() => document.querySelector('.tab-btn.active, [role=tab][aria-selected=true]')?.dataset?.tab || location.hash));

  // The board cards and the Documents rows.
  for (const [target, sel] of [['library-view-whiteboard', '#library-boards-grid .library-card'], ['library-view-docs', '#library-docs-list .doc-list-item']]) {
    await page.evaluate(() => switchTab('library'));
    await page.waitForTimeout(700);
    await page.click(`#library-subtabs [data-target="${target}"]`);
    await page.waitForTimeout(1200);
    const first = page.locator(sel).first();
    await first.hover().catch(() => {});
    await page.waitForTimeout(250);
    console.log(target, JSON.stringify(await hits(page, sel)));
  }
  console.log('page errors', errors.length, errors.slice(0, 3).join(' | '));
  await browser.close();
})();
