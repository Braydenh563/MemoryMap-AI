// The node ring's "More" slot opens the node's menu, by a real click (owner
// report, 2026-09-23: the radial More slot must open the node's menu). A
// document-level click handler closing the menu on the same press that
// opened it would pass any test that called the handler directly, so this
// presses the slot with the mouse, then waits, then reads the menu.
//
// Also reports the menu's height and rows against the window at 1184x760,
// the ring's slot count and whether a slot carries a transform.
//
//   BASE=http://127.0.0.1:8791 node scratchpad/ui-sweeps/mapmore.js
const {boot, OUT} = require('./lib.js');

async function newMap(page, name) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click('#wb-boards-new');
  await page.waitForTimeout(700);
  await page.fill('.confirm-overlay input[type=text]', name);
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click('.confirm-overlay .confirm-actions button:last-child');
  await page.waitForTimeout(2500);
  await page.keyboard.press('Escape');
}

(async () => {
  const {browser, page} = await boot({viewport: {width: 1184, height: 760}});
  const fails = [];
  await newMap(page, `More map ${Date.now()}`);
  const kidId = await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    const kid = await wbMapAddChild(root.id);
    return kid?.id ?? root.id;
  });
  await page.waitForTimeout(1200);
  await page.mouse.click(300, 700);
  await page.waitForTimeout(300);
  await page.click(`.wb-object[data-id="${kidId}"]`, {button: 'right'});
  await page.waitForTimeout(500);
  const ring = await page.evaluate(() => {
    const r = document.getElementById('wb-map-radial');
    const slots = [...r.querySelectorAll('.wb-map-radial-slot')];
    return {open: !r.classList.contains('hidden'), slots: slots.length,
      transformed: slots.filter((s) => getComputedStyle(s).transform !== 'none').map((s) => s.id)};
  });
  console.log('ring', JSON.stringify(ring));
  if (!ring.open) fails.push('ring did not open on right-click');
  await page.screenshot({path: OUT + '/mapmore-ring.png'});
  const more = await page.$('#wb-radial-more');
  const box = await more.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(600);
  const menu = await page.evaluate(() => {
    const open = [...document.querySelectorAll('.action-menu:not(.hidden), [role="menu"]:not(.hidden)')]
      .filter((m) => getComputedStyle(m).display !== 'none' && m.getBoundingClientRect().height > 0);
    return open.map((m) => {
      const r = m.getBoundingClientRect();
      const items = [...m.querySelectorAll('[role="menuitem"], .menu-item')].filter((i) => i.getBoundingClientRect().height > 0);
      return {cls: String(m.className).slice(0, 60), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
        scroll: m.scrollHeight > m.clientHeight + 1, items: items.length,
        seps: m.querySelectorAll('.menu-sep').length, first: items[0]?.textContent.trim().slice(0, 30)};
    });
  });
  console.log('menu after More', JSON.stringify(menu), 'window h', 760);
  if (!menu.length) fails.push('More did not open a menu (or it closed on the same click)');
  for (const m of menu) if (m.bottom > 760 || m.top < 0) fails.push(`menu off screen ${m.top}..${m.bottom}`);
  await page.screenshot({path: OUT + '/mapmore-menu.png'});
  // Keyboard: Shift+F10 on the selected node reaches the same menu.
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'OK radial More opens the node menu');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
