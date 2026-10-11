// The answer's voice (CHAT_PLAN decision 72): Settings, Personas, How Atlas
// sounds with no model. Reads the four choices and the live sample, picks
// Playful, asks the Ask box the owner's question with no model and reads the
// opening, then puts the voice back.
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/voice.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => openSettingsModal('personas', 'pref-voice'));
  await page.waitForFunction(() => document.getElementById('pref-voice-sample')?.textContent.length > 10, null, { timeout: 15000 });
  const read = () => page.evaluate(() => ({
    options: [...document.querySelectorAll('#pref-voice option')].map((o) => o.textContent),
    value: document.getElementById('pref-voice').value,
    sample: document.getElementById('pref-voice-sample').textContent,
    sampleVisible: document.getElementById('pref-voice-sample').getBoundingClientRect().height > 0,
  }));
  const before = await read();
  await page.selectOption('#pref-voice', 'playful');
  await page.waitForTimeout(800);
  const playful = await read();
  await page.locator('#pref-voice').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${process.env.SCRATCH}/shots/voice-settings.png` });
  await page.keyboard.press('Escape');
  await page.evaluate(() => { closeSettingsModal?.(); switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
  await page.waitForTimeout(600);
  await page.fill('#question', 'What have I saved about courses & study?');
  await page.evaluate(() => askQuestion());
  await page.waitForSelector('#ai-answer .digest-offer', { timeout: 15000 });
  const answer = await page.evaluate(() => [...document.querySelectorAll('#ai-answer p')].map((p) => p.textContent));
  await page.evaluate(() => apiJson('/preferences', { method: 'PUT', body: JSON.stringify({ composer_voice: 'natural' }) }));
  console.log(JSON.stringify({ before, playful, answerFirst: answer[0], answerLast: answer[answer.length - 1] }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
