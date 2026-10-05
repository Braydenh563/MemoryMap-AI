// WORLD_CLASS_PLAN row 31, item 99 (c): the AI dot's popup carries the last
// answer's time, model and context fill. A finished turn is reported through
// the page's own `noteAiTurn`, the dot is focused, and the popup is measured:
// the sentence is in it on its own paragraph, and the popup stays inside the
// window at 1440 and 390.
//   BASE=http://127.0.0.1:8795 WIDTH=390 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node aidot.js
const { boot } = require('./lib.js');
(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page } = await boot({ viewport: { width, height: width < 600 ? 844 : 900 }, ...(width < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const results = [];
  const check = (name, ok, detail) => { results.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ' ' + detail : ''}`); };
  const before = await page.evaluate(() => document.getElementById('ai-status-detail').textContent);
  check('no turn yet: no last-answer line', !/Last answer/.test(before), before.slice(0, 60));
  await page.evaluate(() => noteAiTurn({ model: 'llama3.2', elapsedMs: 2410, prompt: 3100, context: 8192 }));
  await page.click('#ai-status');
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const popup = document.getElementById('ai-status-popup');
    const r = popup.getBoundingClientRect();
    const cs = getComputedStyle(popup);
    return { text: document.getElementById('ai-status-detail').textContent, shown: cs.visibility !== 'hidden' && cs.opacity !== '0' && r.width > 0, inside: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log(JSON.stringify(m));
  check('the popup says time, model and context', /Last answer: 2\.4 s on llama3\.2, using 3,100 of 8,192 tokens of context \(38%\)\./.test(m.text));
  check('it is on its own paragraph', /\n\nLast answer/.test(m.text));
  check('the popup is shown and inside the window', m.shown && m.inside, JSON.stringify({ w: m.w, h: m.h }));
  check('no page errors', errors.length === 0, errors.join(' | '));
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(failed ? `FAIL ${failed}` : `PASS ${results.length} of ${results.length}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
