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
    //: Back to a clean Notes list without a reload (a reload locks the app):
    //: close whatever the last item opened, then select the first note's
    //: opening words with the real mouse.
    for (let i = 0; i < 3; i++) await page.keyboard.press('Escape');
    await page.evaluate(() => {
      document.querySelectorAll('.modal:not(.hidden), .overlay:not(.hidden)').forEach((m) => m.classList.add('hidden'));
      switchTab('notes');
      document.querySelector('[data-section="browse"]')?.click();
      getSelection().removeAllRanges();
      if (typeof noteSearch !== 'undefined' && noteSearch) { noteSearch = ''; document.getElementById('note-search').value = ''; renderEntries(); }
    });
    await page.waitForTimeout(1200);
    const box = await page.evaluate(() => {
      const li = document.querySelector('#entry-list > li');
      const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.textContent.trim().length > 12 && !n.parentElement.closest('button, .entry-meta, .entry-actions') ? 1 : 3) });
      const node = walker.nextNode();
      if (!node) return null;
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, Math.min(node.textContent.length, 20));
      const r = range.getBoundingClientRect();
      return { x: r.left, y: r.top + r.height / 2, w: r.width };
    });
    if (!box) throw new Error('no text in the first note');
    await page.mouse.move(box.x + 1, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.w - 1, box.y, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);
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
