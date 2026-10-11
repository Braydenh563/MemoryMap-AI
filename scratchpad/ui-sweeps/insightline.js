// Volunteered insight in Ask (CHAT_PLAN decision 73): asks the owner's
// question with the setting at One line and at Nothing, reads the answer's
// closing and the Confirm / Not right rows under it. Needs the gold notebook
// (run gold.js on the same data dir first). The setting is put back after.
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/insightline.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const out = {};
  for (const level of ['one', 'off']) {
    await page.evaluate((v) => api('/preferences', { method: 'PUT', body: JSON.stringify({ insight_level: v }) }), level);
    await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector('#ai-answer')?.replaceChildren());
    await page.fill('#question', 'What have I saved about courses & study?');
    await page.evaluate(() => askQuestion());
    await page.waitForFunction(() => (document.querySelector('#ai-answer')?.innerText || '').trim().length > 10, null, { timeout: 15000 });
    await page.waitForTimeout(2000);
    out[level] = await page.evaluate(() => ({
      plan: /no later note/.test(document.querySelector('#ai-answer').innerText),
      rows: [...document.querySelectorAll('#ask-insights > *')].map((r) => r.innerText.replace(/\s+/g, ' ').trim()),
      buttons: document.querySelectorAll('#ask-insights button').length,
      hidden: document.querySelector('#ask-insights').classList.contains('hidden'),
    }));
    if (level === 'one') {
      await page.locator('#ai-answer').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${process.env.SCRATCH}/shots/insight-one.png` });
    }
  }
  await page.evaluate(() => api('/preferences', { method: 'PUT', body: JSON.stringify({ insight_level: 'one' }) }));
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
