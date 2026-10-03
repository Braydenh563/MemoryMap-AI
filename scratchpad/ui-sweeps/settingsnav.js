// Settings navigation behaviour (INBOX 444): the nav's groups, a deep link that
// still names the old section, the in-section index, the search results and
// focus landing on the section heading. BASE=... node settingsnav.js
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const out = {};
  await page.evaluate(() => openSettingsModal('general', 'search-relevance-group'));
  await page.waitForTimeout(1200);
  out.deepLinkSection = await page.evaluate(() => currentSettingsSection);
  out.deepLinkVisible = await page.evaluate(() => !!document.getElementById('search-relevance-group').getClientRects().length);
  out.groups = await page.evaluate(() => [...document.querySelectorAll('#settings-nav .nav-group-label')].map((l) => l.textContent.trim()));
  out.paneTitle = await page.evaluate(() => document.querySelector('#settings-searchindex .settings-pane-title h3, #settings-searchindex .help-head h3')?.textContent);
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
