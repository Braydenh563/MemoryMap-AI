const { boot } = require('/home/user/MemoryMap-AI/scratchpad/ui-sweeps/lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(3500);
  const id = await page.evaluate(async () => (await apiJson('/documents', { method: 'POST', body: JSON.stringify({ title: 'Switch probe', content: '# Doc\n\ntext\n' }) })).id);
  await page.evaluate((d) => { switchTab('documents'); setTimeout(() => openDocument(d), 200); }, id);
  await page.waitForTimeout(4500);

  const out = {};
  // Open the menu, open "While you write", click a switch.
  await page.evaluate(() => { document.getElementById('doc-dock-menu').open = true; });
  await page.waitForTimeout(300);
  const opener = await page.$$eval('#doc-dock-menu .menu-group > .has-submenu', (els) => {
    const i = els.findIndex((e) => e.textContent.includes('While you write'));
    els[i].setAttribute('data-probe', '1');
    return i;
  });
  await page.hover('[data-probe="1"]');
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => ({
    checked: document.getElementById('doc-autocorrect').checked,
    open: document.getElementById('doc-dock-menu').open,
  }));
  await page.click('#doc-autocorrect-row');
  await page.waitForTimeout(500);
  const afterSwitch = await page.evaluate(() => ({
    checked: document.getElementById('doc-autocorrect').checked,
    open: document.getElementById('doc-dock-menu').open,
  }));
  out.switch = { before, afterSwitch, toggled: before.checked !== afterSwitch.checked, stayedOpen: afterSwitch.open };

  // And a plain row in the same flyout must still close the menu.
  await page.evaluate(() => { document.getElementById('doc-dock-menu').open = true; });
  await page.waitForTimeout(300);
  await page.hover('[data-probe="1"]');
  await page.waitForTimeout(500);
  await page.click('#doc-dim-others');
  await page.waitForTimeout(500);
  out.plainRow = await page.evaluate(() => ({
    open: document.getElementById('doc-dock-menu').open,
    pressed: document.getElementById('doc-dim-others').getAttribute('aria-pressed'),
  }));

  // The download rows were the first group folded, and were closing nothing.
  await page.evaluate(() => { document.getElementById('doc-dock-menu').open = true; });
  await page.waitForTimeout(300);
  await page.$$eval('#doc-dock-menu .menu-group > .has-submenu', (els) => {
    els.find((e) => e.textContent.includes('Download or print'))?.setAttribute('data-probe2', '1');
  });
  await page.hover('[data-probe2="1"]');
  await page.waitForTimeout(500);
  out.downloadRow = await page.evaluate(() => {
    const row = document.getElementById('doc-export-html');
    const before = document.getElementById('doc-dock-menu').open;
    //: Dispatched rather than really clicked: the real one starts a download,
    //: which this probe has no business doing. The close path is the same.
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { before, open: document.getElementById('doc-dock-menu').open };
  });

  console.log(JSON.stringify(out, null, 1));
  const bad = [];
  if (!out.switch.toggled) bad.push('the switch did not toggle');
  if (!out.switch.stayedOpen) bad.push('the menu closed on a switch');
  if (out.plainRow.open) bad.push('a plain row left the menu open');
  if (out.downloadRow.open) bad.push('a download row left the menu open');
  for (const b of bad) console.log('    ' + b);
  console.log(bad.length ? `FAIL: ${bad.length}` : 'PASS: 0 findings');
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
