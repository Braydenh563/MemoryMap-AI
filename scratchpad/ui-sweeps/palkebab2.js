// INBOX 230: "this more actions kebab button at the bottom of the popup agent
// doesnt show any dropdown menu." The menu is built, opened and positioned; it
// draws *under* the surface it belongs to.
//
//   BASE=http://127.0.0.1:8801 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/palkebab2.js
//
// The measurement that settles it is `document.elementFromPoint` at the menu's
// own first row: a menu that is there but painted behind returns the surface's
// element, not its own row. Both surfaces that host an escaped kebab above a
// dialog are checked, the popup agent inside the command palette (overlay
// z-index 2000) and the Atlas sheet (1010).
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };

  const openMenu = (hostId) => page.evaluate((id) => {
    document.getElementById(id)?.querySelector('.menu-wrap > button')?.click();
  }, hostId);

  const measure = (hostId) => page.evaluate((id) => {
    const host = document.getElementById(id);
    const menu = document.querySelector('body > .action-menu:not(.hidden)')
      || host?.querySelector('.action-menu:not(.hidden)');
    if (!menu) return { open: false };
    const r = menu.getBoundingClientRect();
    const cs = getComputedStyle(menu);
    const rows = [...menu.querySelectorAll('.menu-item')];
    const first = rows[0] ? rows[0].getBoundingClientRect() : null;
    const hit = document.elementFromPoint(
      r.left + r.width / 2,
      first ? first.top + first.height / 2 : r.top + 8,
    );
    const overlays = [...document.querySelectorAll('.command-palette-overlay, .modal-overlay')]
      .filter((el) => !el.classList.contains('hidden'))
      .map((el) => `${el.id || el.className.split(' ')[0]}@${getComputedStyle(el).zIndex}`);
    return {
      open: true,
      escaped: menu.classList.contains('action-menu-escaped'),
      parent: menu.parentElement.tagName.toLowerCase(),
      rows: rows.length,
      rect: `${Math.round(r.width)}x${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)}`,
      z: cs.zIndex,
      hit: hit ? `${hit.tagName.toLowerCase()}.${(hit.className || '').toString().split(' ')[0]}` : null,
      hitIsMenuRow: !!hit && menu.contains(hit),
      overlays,
    };
  }, hostId);

  // 1. The popup agent, whose overlay is the command palette at 2000.
  await page.evaluate(() => { toggleAgentPalette(); renderCmdPaletteMenu(); });
  await page.waitForTimeout(500);
  await openMenu('command-palette-menu');
  await page.waitForTimeout(300);
  const pal = await measure('command-palette-menu');
  console.log(`  palette: ${JSON.stringify(pal)}`);
  check('popup agent kebab menu is on top', pal.open && pal.hitIsMenuRow,
    `menu ${pal.rows} rows, ${pal.rect}, z-index ${pal.z} over ${(pal.overlays || []).join(' ')}; elementFromPoint on its first row returned ${pal.hit}`);

  // 2. The Atlas sheet's kebab, over the sheet overlay at 1010.
  await page.evaluate(() => { toggleAgentPalette(); openHelpChat(); });
  await page.waitForTimeout(600);
  await openMenu('help-chat-menu');
  await page.waitForTimeout(300);
  const sheet = await measure('help-chat-menu');
  console.log(`  sheet:   ${JSON.stringify(sheet)}`);
  check('Atlas sheet kebab menu is on top', sheet.open && sheet.hitIsMenuRow,
    `menu ${sheet.rows} rows, ${sheet.rect}, z-index ${sheet.z} over ${(sheet.overlays || []).join(' ')}; elementFromPoint on its first row returned ${sheet.hit}`);

  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
