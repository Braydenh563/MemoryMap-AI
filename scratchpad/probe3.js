const { boot } = require('./ui-sweeps/lib.js');
(async () => {
  const { page, browser } = await boot({});
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(800);
  const id = await page.evaluate(async () => (await apiJson('/ask-history?limit=1')).turns[0].id);
  await page.evaluate((i) => viewAskHistoryTurn(i), id);
  await page.waitForTimeout(1000);
  const before = await page.evaluate(() => ({
    answer: document.getElementById('ai-answer').textContent.trim().slice(0, 40),
    marks: document.querySelectorAll('#ai-answer .answer-citation').length,
  }));
  console.log('before reload ' + JSON.stringify(before));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  const after = await page.evaluate(() => {
    const a = document.getElementById('ai-answer');
    const idle = document.getElementById('ask-idle');
    return {
      tab: document.querySelector('.tab-page:not([hidden])')?.id || null,
      answer: a ? a.textContent.trim().slice(0, 40) : null,
      marks: document.querySelectorAll('#ai-answer .answer-citation').length,
      idleHidden: idle ? idle.classList.contains('hidden') : null,
    };
  });
  console.log('after reload  ' + JSON.stringify(after));
  await browser.close();
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
