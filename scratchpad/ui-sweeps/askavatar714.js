// INBOX 714 part 1: the mini avatar must not add a gap under the Ask answer's
// head. Measures, for the composed answer card and the history ("asked ...")
// card, the distance from the name span's bottom to the first text line of the
// answer, with the avatar shown and with it removed (display none). Within 2px
// is a pass. Also reports the head row and avatar boxes.
//
//   bash scratchpad/ui-sweeps/serve.sh 8852 /tmp/mm-714
//   BASE=http://127.0.0.1:8852 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers THEME=light node scratchpad/ui-sweeps/askavatar714.js
const { boot } = require('./lib.js');

async function run(width) {
  const { page, browser } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(600);
  await page.evaluate(() => showNotesSection('ask'));
  await page.waitForTimeout(3500);
  const bad = [];
  const measure = () => page.evaluate(() => {
    const head = document.querySelector('.answer-head');
    const title = head.querySelector('.answer-title');
    const name = title.querySelector('span:not(.msg-avatar)');
    const av = title.querySelector('.msg-avatar');
    const a = document.getElementById('ai-answer');
    const range = document.createRange();
    const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
    let first = null;
    while (walker.nextNode()) { if (walker.currentNode.textContent.trim()) { first = walker.currentNode; break; } }
    range.selectNodeContents(first);
    const line = range.getClientRects()[0];
    const n = name.getBoundingClientRect(), h = head.getBoundingClientRect(), t = title.getBoundingClientRect(), ar = av.getBoundingClientRect();
    return { gap: +(line.top - n.bottom).toFixed(1), headH: +h.height.toFixed(1), titleH: +t.height.toFixed(1), avH: +ar.height.toFixed(1), avDisplay: getComputedStyle(av).display, nameH: +n.height.toFixed(1), nameCy: +((n.top + n.bottom) / 2).toFixed(1), avCy: +((ar.top + ar.bottom) / 2).toFixed(1) };
  });
  const ask = async (q) => {
    await page.fill('#question', q);
    await page.click('#ask-btn');
    await page.waitForFunction(() => { const a = document.getElementById('ai-answer'); return a && !a.classList.contains('is-generating') && a.textContent.trim().length > 0; }, null, { timeout: 20000 });
    await page.waitForTimeout(500);
  };
  const history = async () => {
    await page.evaluate(() => { document.getElementById('ask-history-toggle').click(); });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const r = document.querySelector('#ask-history-panel li, #ask-history-panel [data-turn-id], #ask-history-panel button.ask-history-row');
      if (r) (r.querySelector('button') || r).click();
    });
    await page.waitForTimeout(1200);
  };
  for (const [label, prep] of [['composed', () => ask('What is the Harbor launch plan?')], ['history', history]]) {
    await prep();
    const on = await measure();
    // The CSP refuses an injected stylesheet; hide through the element.
    await page.evaluate(() => { document.querySelector('.answer-head .msg-avatar').style.setProperty('display', 'none', 'important'); });
    const off = await measure();
    await page.evaluate(() => { document.querySelector('.answer-head .msg-avatar').style.removeProperty('display'); });
    const diff = +(on.gap - off.gap).toFixed(1);
    console.log(`[${width}] ${label}: on ${JSON.stringify(on)} off.gap ${off.gap} diff ${diff}`);
    if (Math.abs(diff) > 2) bad.push(`${label}: gap ${on.gap} with avatar vs ${off.gap} without`);
  }
  console.log(`[${width}] ${bad.length ? bad.join('; ') : 'ok'}`);
  await browser.close();
  return bad.length;
}
(async () => { let b = 0; for (const w of [1440, 390]) b += await run(w); process.exit(b ? 1 : 0); })();
