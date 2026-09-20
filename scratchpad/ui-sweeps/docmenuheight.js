// INBOX: "can you also make more sub-menus in the documents meatball button
// dropdown or smth because it is still almost off the bottom of the screen."
//
// The menu's own height against the window's, at the sizes the report is
// about, plus how many rows it has. A menu taller than the room under its
// button is one that either scrolls inside itself or runs off the screen, and
// both are the same complaint.
const { boot } = require('./lib.js');

(async () => {
  const findings = [];
  for (const [w, h] of [[1440, 900], [1280, 800], [816, 1216], [1024, 720]]) {
    const { page, browser } = await boot({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));
    await page.waitForTimeout(3500);
    const id = await page.evaluate(async () => (await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Menu height probe', content: '# A document\n\nSome text.\n' }) })).id);
    await page.evaluate((d) => { switchTab('documents'); setTimeout(() => openDocument(d), 200); }, id);
    await page.waitForTimeout(4500);
    const r = await page.evaluate(() => {
      const menu = document.getElementById('doc-dock-menu');
      menu.open = true;
      const list = menu.querySelector('.doc-dock-menu-list');
      const box = list.getBoundingClientRect();
      const rows = [...list.children].filter((el) => el.offsetParent !== null);
      return {
        top: Math.round(box.top), bottom: Math.round(box.bottom),
        height: Math.round(box.height), window: innerHeight,
        rows: rows.length,
        scrolls: list.scrollHeight > list.clientHeight + 1,
        overflowBelow: Math.round(box.bottom - innerHeight),
        labels: rows.map((el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)),
      };
    });
    console.log(`${w}x${h}: list ${r.height}px in a ${r.window}px window, ${r.rows} rows, top ${r.top} bottom ${r.bottom}, scrolls ${r.scrolls}, past the bottom by ${r.overflowBelow}px`);
    if (w === 1440) console.log('  rows:', r.labels.join(' | '));

    // Each flyout: it has to open, its rows have to be reachable, and it has
    // to stay on the screen. A group that saves a row by hiding one off the
    // edge has not helped.
    const groups = await page.$$('#doc-dock-menu .menu-group > .has-submenu');
    for (const opener of groups) {
      const name = (await opener.evaluate((el) => el.textContent.replace(/\s+/g, ' ').trim())).slice(0, 24);
      await opener.hover();
      await page.waitForTimeout(500);
      const flyout = await page.evaluate((label) => {
        const group = [...document.querySelectorAll('#doc-dock-menu .menu-group')]
          .find((g) => g.querySelector('.has-submenu')?.textContent.replace(/\s+/g, ' ').trim().startsWith(label));
        // The flyout is reparented to <body> while open, so look for the one
        // that holds this group's own rows rather than inside the group.
        const panel = group?.querySelector('.action-menu.submenu')
          || [...document.querySelectorAll('body > .action-menu.submenu')].pop();
        if (!panel) return { open: false };
        const b = panel.getBoundingClientRect();
        const rows = [...panel.querySelectorAll('.menu-item')];
        const offscreen = rows.filter((el) => {
          const rr = el.getBoundingClientRect();
          return rr.width === 0 || rr.bottom > innerHeight + 1 || rr.right > innerWidth + 1 || rr.top < -1 || rr.left < -1;
        }).length;
        return { open: b.width > 0 && b.height > 0, rows: rows.length, offscreen,
                 past: Math.round(Math.max(0, b.bottom - innerHeight, b.right - innerWidth)) };
      }, name.split('\u203a')[0].trim());
      console.log(`    flyout "${name}": open ${flyout.open}, ${flyout.rows} rows, ${flyout.offscreen} off screen, past the edge by ${flyout.past}px`);
      if (!flyout.open) findings.push(`${w}x${h}: flyout "${name}" did not open`);
      if (flyout.offscreen) findings.push(`${w}x${h}: ${flyout.offscreen} row(s) of "${name}" are off screen`);
      if (flyout.past > 0) findings.push(`${w}x${h}: flyout "${name}" runs ${flyout.past}px past the edge`);
    }
    if (r.scrolls || r.overflowBelow > 0) findings.push(`${w}x${h}: ${r.scrolls ? 'scrolls inside itself' : ''}${r.overflowBelow > 0 ? ` runs ${r.overflowBelow}px past the bottom` : ''}`.trim());
    if (errors.length) findings.push(`${w}x${h}: ${errors.length} page error(s)`);
    await browser.close();
  }
  for (const line of findings) console.log(`    ${line}`);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
