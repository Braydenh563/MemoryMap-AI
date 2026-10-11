// Census (ledger 1410): each top-bar control: does it carry a help popover (data-help-for or a '?' next to it)
// and does the command palette find it by its name?
const { boot } = require('./lib.js');
const ROW = { 'space-switcher-btn': /Switch space/, 'tab-btn-dashboard': /Go to Dashboard/, 'tab-btn-notes': /Go to Notes/, 'tab-btn-chat': /Go to Chat/, 'tab-btn-graph': /Go to Graph/, 'tab-btn-library': /Go to Library/, 'tab-btn-timeline': /Go to Timeline/, 'tab-btn-reminders': /Go to Reminders/, 'notif-btn': /Open notifications/, 'theme-btn': /Toggle light\/dark/, 'settings-btn': /Open Settings/, 'lock-btn': /Lock MemoryMap/, 'quit-btn': /Quit MemoryMap/ };
const TERMS = { 'space-switcher-btn': 'space', 'notif-btn': 'notifications', 'theme-btn': 'dark mode', 'lock-btn': 'lock', 'settings-btn': 'open settings', 'quit-btn': 'quit' };
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => document.getElementById('recovery-key-dialog')?.close());
  const ctrls = await page.evaluate(() => [...document.querySelectorAll('#top-bar > * button[id], #top-bar button[id]')].filter((b) => !b.closest('#notif-panel') && b.id !== 'notif-mute-toggle' && b.offsetParent !== null).map((b) => ({ id: b.id, name: (b.getAttribute('aria-label') || b.title || b.textContent).trim(), help: b.hasAttribute('data-help-for') })));
  const input = '#palette-input';
  const out = [];
  for (const c of ctrls) {
    await page.evaluate(() => openPalette()); await page.waitForTimeout(700);
    const field = await page.$('#palette-input');
    if (!field) { out.push({ ...c, palette: 'no-field' }); continue; }
    await field.fill((TERMS[c.id] || c.name.replace(/[:(].*$/, ''))); await page.waitForTimeout(500);
    const rows = await page.$$eval('#palette-list [role="option"], #palette-list li', (r) => r.slice(0, 12).map((x) => x.textContent.trim().replace(/\s+/g, ' ').slice(0, 36)));
    out.push({ id: c.id, help: c.help, row: rows.some((r) => ROW[c.id].test(r)) });
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  }
  for (const o of out) console.log(JSON.stringify(o));
  console.log('palette rows', out.filter((o) => o.row).length, '/', out.length, ' help popovers', out.filter((o) => o.help).length, '/', out.length);
  await browser.close();
})();
