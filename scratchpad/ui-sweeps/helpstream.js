// The Guide streams on a locked notebook. The owner: "streaming is also
// broken". The stream fetch sent no auth header, so it 401'd and the panel
// fell back to the one-shot route. This asks a question and reads the
// status the stream route actually answered with, plus what the panel did.
const { boot } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  await page.waitForTimeout(2500);
  const seen = [];
  page.on('response', (r) => { if (r.url().includes('/help/ask')) seen.push({ url: r.url().replace(/^.*?\/help/, '/help'), status: r.status() }); });
  await page.evaluate(() => { if (typeof helpChatOpen === 'function') helpChatOpen(); else if (typeof openHelpChat === 'function') openHelpChat(); });
  await page.waitForTimeout(600);
  const opened = await page.evaluate(() => !!document.getElementById('help-chat-input') && document.getElementById('help-chat-input').getBoundingClientRect().height > 0);
  await page.evaluate(() => submitHelpChatQuestion('What does Performance mode do?'));
  await page.waitForTimeout(3000);
  const shown = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.help-chat-msg.is-assistant')];
    const last = rows[rows.length - 1];
    return { text: (last?.textContent || '').slice(0, 900), badges: [...(last?.querySelectorAll('.chip, .badge') || [])].map((b) => b.textContent.trim()).slice(0, 4) };
  });
  console.log('opened', opened, 'responses', JSON.stringify(seen), 'shown', JSON.stringify(shown));
  const findings = [];
  const stream = seen.find((r) => r.url.endsWith('/help/ask/stream'));
  if (!stream) findings.push('the stream route was never called');
  else if (stream.status !== 200) findings.push('stream answered ' + stream.status);
  if (seen.some((r) => r.url.endsWith('/help/ask'))) findings.push('fell back to the one-shot route');
  if (!/Performance mode/.test(shown.text)) findings.push('answer does not mention Performance mode: ' + shown.text);
  console.log(findings.length ? 'FAIL: ' + findings.join('\n  ') : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})();
