// INBOX 904 B05: "Connect a model" is a split button; its caret hides the
// no-model notices. Measures every visible notice at the width, presses the
// caret, then "Hide these popups".
//   BASE=http://127.0.0.1:8786 W=1440 node ui1017-b05.js
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { prefs.set('hideOfflineNotice', 'off'); });
  const probe = () => page.evaluate(() => [...document.querySelectorAll('.ai-offline-note')].filter((n) => n.getBoundingClientRect().width > 0 && !n.classList.contains('hidden')).map((n) => {
    const r = n.getBoundingClientRect();
    const s = n.querySelector('.ai-offline-split');
    const m = s && s.querySelector('.split-button-main').getBoundingClientRect();
    const c = s && s.querySelector('.split-button-caret').getBoundingClientRect();
    const sr = s && s.getBoundingClientRect();
    return { id: n.id || n.className.slice(0, 30), box: [Math.round(r.width), Math.round(r.height)], split: s ? [Math.round(sr.width), Math.round(sr.height), 'main', Math.round(m.height), 'caret', Math.round(c.width), Math.round(c.height)] : null, inside: s ? sr.left >= r.left && sr.right <= r.right + 0.5 : null };
  }));
  const out = {};
  for (const [name, go] of [
    ['dashboard', () => page.evaluate(() => switchTab('dashboard'))],
    ['ask', () => page.evaluate(() => { switchTab('notes'); showNotesSection('ask'); })],
    ['chat', () => page.evaluate(() => switchTab('chat'))],
  ]) {
    await go();
    await page.waitForTimeout(1800);
    out[name] = await probe();
  }
  // Press the caret on the first visible split, then the menu row.
  await page.evaluate(() => { switchTab('notes'); showNotesSection('ask'); });
  await page.waitForTimeout(1500);
  const caret = page.locator('.ai-offline-split .split-button-caret:visible').first();
  if (await caret.count()) {
    await caret.click();
    await page.waitForTimeout(400);
    out.menu = await page.evaluate(() => [...document.querySelectorAll('.action-menu:not(.hidden) [role=menuitem]')].map((x) => x.textContent.trim()));
    out.menuStaysThroughTick = await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 4500)); return !!document.querySelector('.action-menu:not(.hidden)'); });
    await page.locator('.action-menu:not(.hidden) [role=menuitem]').first().click();
    await page.waitForTimeout(500);
    out.afterHide = await probe();
    out.pref = await page.evaluate(() => prefs.get('hideOfflineNotice', null));
  }
  out.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(JSON.stringify(out, null, 1));
  await page.screenshot({ path: (process.env.SCRATCH || '.') + `/b05-${W}.png` });
  await browser.close();
})();
