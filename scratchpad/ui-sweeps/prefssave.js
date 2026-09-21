// INBOX 263 (3): "no visual confirmation popup shows when I use ctrl s to save
// my preferences settings, and there is no visual indications that the
// preferences settings are the only settings that dont save automatically."
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(4000);
  await page.evaluate(() => openSettingsModal('preferences'));
  await page.waitForTimeout(1500);

  const standing = await page.evaluate(() => {
    const p = document.querySelector('#settings-preferences > p.muted');
    return p ? p.textContent.replace(/\s+/g, ' ').trim() : null;
  });
  const before = await page.evaluate(() => ({
    unsavedShown: !document.getElementById('prefs-unsaved').classList.contains('hidden'),
    buttonClass: document.getElementById('prefs-save').className,
  }));

  // Type into a field the way a person does, so `input` really fires.
  await page.click('#pref-display-name');
  await page.keyboard.type('Brayden');
  await page.waitForTimeout(400);
  const dirty = await page.evaluate(() => ({
    unsavedShown: !document.getElementById('prefs-unsaved').classList.contains('hidden'),
    buttonClass: document.getElementById('prefs-save').className,
  }));

  // ctrl+s, which the section's copy has always promised.
  await page.keyboard.down('Control');
  await page.keyboard.press('s');
  await page.keyboard.up('Control');
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    toasts: [...document.querySelectorAll('.toast, #toast-stack > *')].map((t) => t.textContent.trim().slice(0, 40)),
    unsavedShown: !document.getElementById('prefs-unsaved').classList.contains('hidden'),
    buttonClass: document.getElementById('prefs-save').className,
    status: document.getElementById('prefs-status').textContent,
  }));
  // And it really reached the server, not just the screen.
  const stored = await page.evaluate(async () => (await apiJson('/preferences')).display_name);

  console.log(JSON.stringify({ standing, before, dirty, after, stored }, null, 1));
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
