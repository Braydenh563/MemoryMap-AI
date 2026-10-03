// Every item in the selected-text ⋯ menu, pressed, and what the person sees
// within three seconds (INBOX 446, the owner: "make sure the other highlight
// text popup meatball menu items work properly with proper learnability and
// indicators as well"). An item passes when something on screen answers it:
// a toast, a dialog, a tab change, a field filled. Silence is a FAIL.
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/selmenu.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

  const select = async () => {
    await page.keyboard.press('Escape');
    await page.evaluate(() => { switchTab('notes'); document.querySelector('[data-section="browse"]')?.click(); });
    await page.waitForTimeout(1200);
    const el = await page.$('#entry-list > li');
    const b = await el.boundingBox();
    await page.mouse.move(b.x + 20, b.y + 18);
    await page.mouse.down();
    await page.mouse.move(b.x + 260, b.y + 22, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const opener = await page.$('.selection-popup:not(.hidden) [aria-haspopup]');
    if (!opener) throw new Error('no ⋯ after selecting');
    await opener.click();
    await page.waitForTimeout(400);
  };
  const snapshot = () => page.evaluate(() => ({
    toasts: [...document.querySelectorAll('#toast-box .toast')].map((t) => t.textContent.replace(/\s+/g, ' ').trim()),
    dialogs: [...document.querySelectorAll('[role="dialog"], dialog[open], .modal:not(.hidden)')].filter((d) => d.checkVisibility?.()).map((d) => d.id || d.className.split(' ')[0]),
    tab: document.querySelector('.tab-page:not(.hidden)')?.id || '',
    section: document.querySelector('[data-section][aria-selected="true"]')?.dataset.section || '',
    active: document.activeElement?.id || document.activeElement?.className?.split?.(' ')[0] || '',
  }));

  await select();
  const labels = await page.$$eval('.action-menu:not(.hidden) [role=menuitem]', (els) => els.map((e) => e.textContent.trim()));
  const out = [];
  for (const label of labels) {
    try {
      await select();
      const before = await snapshot();
      await page.locator('.action-menu:not(.hidden) [role=menuitem]', { hasText: label }).first().click();
      await page.waitForTimeout(3000);
      const after = await snapshot();
      const said = [];
      const newToasts = after.toasts.filter((t) => !before.toasts.includes(t));
      if (newToasts.length) said.push(`toast "${newToasts.join(' / ').slice(0, 70)}"`);
      const newDialogs = after.dialogs.filter((d) => !before.dialogs.includes(d));
      if (newDialogs.length) said.push(`dialog ${newDialogs.join(',')}`);
      if (after.tab !== before.tab || after.section !== before.section) said.push(`went to ${after.tab}/${after.section}`);
      if (after.active !== before.active && after.active) said.push(`focus ${after.active}`);
      out.push(`${said.length ? 'PASS' : 'FAIL'} ${label.padEnd(26)} ${said.join('; ') || 'nothing visible happened'}`);
    } catch (e) {
      out.push(`FAIL ${label.padEnd(26)} ${e.message.split('\n')[0]}`);
    }
  }
  console.log(out.join('\n'));
  if (errors.length) console.log(`errors: ${[...new Set(errors)].join(' | ')}`);
  await browser.close();
})();
