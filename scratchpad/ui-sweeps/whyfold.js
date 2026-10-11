// "Why this answer" in Ask (CHAT_PLAN B30): asks the owner's question, reads
// the fold under the answer shut and then open, and measures it: the lines,
// the seconds column's left edges (one column), the panel's ground and the
// summary's box. Needs the gold notebook (run gold.js on the same data dir).
//
//   BASE=http://127.0.0.1:8872 SCRATCH=<dir> PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/whyfold.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => { switchTab('notes'); if (window.showNotesSection) showNotesSection('ask'); });
  await page.waitForTimeout(500);
  await page.fill('#question', 'What have I saved about courses & study?');
  await page.evaluate(() => askQuestion());
  await page.waitForFunction(() => document.querySelector('#ask-why .why-fold'), null, { timeout: 15000 });
  const shut = await page.evaluate(() => {
    const fold = document.querySelector('#ask-why .why-fold');
    return { open: fold.open, summary: fold.querySelector('summary').innerText.trim(), height: Math.round(fold.getBoundingClientRect().height) };
  });
  await page.click('#ask-why .why-fold > summary');
  await page.waitForTimeout(300);
  const open = await page.evaluate(() => {
    const fold = document.querySelector('#ask-why .why-fold');
    const rows = [...fold.querySelectorAll('.why-lines > li')];
    const style = getComputedStyle(fold);
    return {
      open: fold.open,
      lines: rows.map((r) => r.innerText.replace(/\s+/g, ' ').trim()),
      atLefts: [...new Set(rows.map((r) => Math.round(r.children[1].getBoundingClientRect().left)))],
      ground: style.backgroundColor,
      border: style.borderTopWidth,
      fitsFoot: fold.getBoundingClientRect().right <= document.querySelector('#ask-answer-foot').getBoundingClientRect().right + 1,
    };
  });
  await page.locator('#ask-why').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${process.env.SCRATCH}/shots/why-open.png` });
  console.log(JSON.stringify({ shut, open }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
