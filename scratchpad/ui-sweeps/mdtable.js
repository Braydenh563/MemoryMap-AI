// INBOX 172: a table or code block the model wrote can be copied, saved and
// read in full view. As numbers.
//
//   BASE=http://127.0.0.1:8931 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node mdtable.js
const { boot } = require('./lib.js');

(async () => {
  const { page, browser } = await boot({});
  const errs = []; page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  const bad = [];
  await page.evaluate(() => switchTab('chat'));
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const host = document.createElement('div'); host.className = 'bubble-answer'; document.getElementById('chat-messages').appendChild(host);
    const md = '| Name | Score |\n| --- | --- |\n| Alpha | 1 |\n| Beta, "two" | 2 |\n\nline one<br>line two\n\n```js\nconsole.log(1)\n```';
    renderMarkdown(host, md);
    const block = host.querySelector('.md-table-block');
    const labels = [...block.querySelectorAll('.code-bar button')].map((b) => b.textContent.trim());
    const codeLabels = [...host.querySelectorAll('.code-block:not(.md-table-block) .code-bar button')].map((b) => b.textContent.trim());
    const brs = host.querySelectorAll('p br').length;
    // CSV: in a browser tab saveFile hands the file to the browser as a
    // download (the desktop shell writes it to the exports folder); the
    // download is caught outside this evaluate.
    window.__csvBtn = [...block.querySelectorAll('button')].find((b) => b.textContent.trim() === 'CSV');
    const fullBtn = [...block.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Full view');
    fullBtn.click();
    const cs = getComputedStyle(block); const rect = block.getBoundingClientRect();
    const fullState = { position: cs.position, left: Math.round(rect.left), right: Math.round(rect.right), top: Math.round(rect.top), bottom: Math.round(rect.bottom), label: fullBtn.textContent.trim(), z: cs.zIndex };
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    const back = { position: getComputedStyle(block).position, label: fullBtn.textContent.trim() };
    return { labels, codeLabels, brs, fullState, back, vw: innerWidth, vh: innerHeight };
  });
  console.log(`172 table bar   ${JSON.stringify(r.labels)}; code bar ${JSON.stringify(r.codeLabels)}; <br> rendered ${r.brs}`);
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
    page.evaluate(() => window.__csvBtn.click()),
  ]);
  let csvText = null;
  if (download) { const fs = require('fs'); csvText = fs.readFileSync(await download.path(), 'utf8'); }
  console.log(`172 csv         download ${download ? download.suggestedFilename() : 'none'}: ${JSON.stringify(csvText)}`);
  console.log(`172 full view   ${r.fullState.position} at ${r.fullState.left},${r.fullState.top} to ${r.fullState.right},${r.fullState.bottom} in ${r.vw}x${r.vh}, z ${r.fullState.z}, button "${r.fullState.label}"; after Escape ${r.back.position} "${r.back.label}"`);
  if (r.labels.join() !== '⧉ Copy,Markdown,CSV,Full view' || r.codeLabels.join() !== '⧉ Copy,Save' || r.brs !== 1) bad.push('bars');
  if (!download || !/"Beta, ""two""","2"/.test(csvText || '')) bad.push('csv');
  const f = r.fullState;
  if (f.position !== 'fixed' || f.left < 0 || f.top < 0 || f.right > r.vw || f.bottom > r.vh || r.back.position === 'fixed') bad.push('full view');
  console.log(`console errors ${errs.length}${errs.length ? ' ' + errs.join(' | ') : ''}`);
  await browser.close();
  if (bad.length || errs.length) { console.log('FAIL: ' + bad.join('; ')); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
