// The owner's question in Ask, every paragraph prose (2026-10-11): counts
// the bold label lines, where each paragraph's mark sits, and what the row
// under the answer says. Writes $SCRATCH/shots/ask-prose-foot.png.
//   BASE=... node scratchpad/ui-sweeps/askprose.js
const { boot, OUT } = require('./lib.js');
const path = require('path');

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
  await page.waitForTimeout(800);
  await page.fill('#question', 'What have I saved about courses & study?');
  await page.evaluate(() => askQuestion());
  await page.waitForTimeout(4000);
  const out = await page.evaluate(() => {
    const box = document.getElementById('ai-answer');
    const paras = [...box.querySelectorAll(':scope > p')];
    const insights = document.getElementById('ask-insights');
    return {
      paragraphs: paras.length,
      labelLines: paras.filter((p) => p.firstElementChild && p.firstElementChild.tagName === 'STRONG' && p.firstChild === p.firstElementChild).length,
      //: Each mark is the last thing in its paragraph (bar the full stop).
      marksMidLine: paras.filter((p) => { const m = p.querySelector('.answer-citation'); return m && (p.textContent.trim().length - (p.textContent.lastIndexOf(m.textContent) + m.textContent.length)) > 2; }).length,
      insightRows: insights && !insights.classList.contains('hidden') ? [...insights.querySelectorAll('.insight-text')].map((e) => e.textContent) : [],
      openPlanSaid: (document.body.innerText.match(/no later note/g) || []).length,
      texts: paras.map((p) => p.textContent),
    };
  });
  const foot = await page.$('#ask-insights');
  if (foot) await foot.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(OUT, 'ask-prose-foot.png') });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
