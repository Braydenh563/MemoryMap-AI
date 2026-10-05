// WORLD_CLASS_PLAN row 31, item 261: Settings, Account, Re-encrypt private
// notes, through the real controls. A private note is made, the pane's button
// is pressed with the password, the confirm is answered, and the page is read
// afterwards: the status says how many notes moved, this tab's new token works,
// and the private note still reads as its own text.
//   BASE=http://127.0.0.1:8795 WIDTH=390 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node rekeyui.js
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const results = [];
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); };
  const s = Date.now().toString(36).slice(-4);
  const id = await page.evaluate(async (s) => {
    const note = await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Rekey secret ${s}` }) });
    await apiJson(`/entries/${note.id}/privacy`, { method: 'POST', body: JSON.stringify({ private: true }) });
    return note.id;
  }, s);
  await page.evaluate(() => openSettingsModal('account'));
  await page.waitForTimeout(1500);
  const geo = await page.evaluate(() => {
    const group = document.getElementById('account-rekey').closest('.settings-group');
    const r = group.getBoundingClientRect(); const pane = document.getElementById('settings-account').getBoundingClientRect();
    const btn = document.getElementById('account-rekey').getBoundingClientRect();
    return { inPane: r.left >= pane.left - 1 && r.right <= pane.right + 1, btnH: Math.round(btn.height), filled: getComputedStyle(document.getElementById('account-rekey')).backgroundColor, sideways: document.scrollingElement.scrollWidth > document.scrollingElement.clientWidth };
  });
  console.log(JSON.stringify(geo));
  check('the group fits the pane, nothing sideways', geo.inPane && !geo.sideways);
  check('the button is a target high', geo.btnH >= (width < 600 ? 32 : 24), String(geo.btnH));
  // Empty password: said, nothing sent.
  await page.evaluate(() => document.getElementById('account-rekey').click());
  await page.waitForTimeout(300);
  check('no password says so', /current password/i.test(await page.evaluate(() => document.getElementById('account-rekey-status').textContent)));
  await page.fill('#account-rekey-password', 'testpassword123');
  await page.evaluate(() => document.getElementById('account-rekey').click());
  await page.waitForSelector('.confirm-card', { timeout: 4000 });
  const dialog = await page.evaluate(() => document.querySelector('.confirm-card .confirm-text, .confirm-card p')?.textContent || '');
  check('the confirm says what happens', /new encryption key/.test(dialog) && /other session/.test(dialog), dialog.slice(0, 80));
  await page.evaluate(() => [...document.querySelectorAll('.confirm-card button')].find((b) => /Re-encrypt/.test(b.textContent)).click());
  await page.waitForTimeout(3500);
  const status = await page.evaluate(() => document.getElementById('account-rekey-status').textContent);
  check('the status says how many moved', /^Done: \d+ private notes? re-encrypted\.$/.test(status), status);
  const after = await page.evaluate(async (id) => {
    const note = await apiJson(`/entries/${id}`);
    return { readable: /Rekey secret/.test(note.content || ''), private: note.is_private };
  }, id);
  check('this tab still works and the private note still reads as its text', after.readable && after.private, JSON.stringify(after));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(failed ? `FAIL ${failed}` : `PASS ${results.length} of ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
