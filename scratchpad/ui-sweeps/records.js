// CHAT_PLAN A3, the app's own records asked in Ask (2026-10-11): each
// question's answer text, whether its offer is a link, and that the
// History offer opens the panel. Writes $SCRATCH/shots/ask-records.png.
//   BASE=... node scratchpad/ui-sweeps/records.js
const { boot, OUT } = require('./lib.js');
const path = require('path');

const QUESTIONS = ['what did I search today', 'what ran overnight', 'when did I last back up'];

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
  await page.waitForTimeout(800);
  const out = [];
  for (const q of QUESTIONS) {
    await page.fill('#question', q);
    const started = Date.now();
    await page.evaluate(() => askQuestion());
    await page.waitForFunction(() => document.querySelector('#ai-answer .digest-offer'), null, { timeout: 15000 }).catch(() => {});
    out.push(await page.evaluate((args) => ({
      q: args.q,
      ms: Date.now() - args.started,
      text: document.getElementById('ai-answer').innerText,
      offer: (document.querySelector('#ai-answer .digest-offer') || {}).textContent || null,
      records: document.querySelectorAll('#raw-results .entry, #raw-results [data-entry-id]').length,
    }), { q, started }));
    if (q === QUESTIONS[0]) {
      await page.screenshot({ path: path.join(OUT, 'ask-records.png') });
      await page.click('#ai-answer .digest-offer').catch(() => {});
      await page.waitForTimeout(600);
      out[0].historyOpen = await page.evaluate(() => !document.getElementById('ask-history-panel').classList.contains('hidden'));
    }
  }
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
