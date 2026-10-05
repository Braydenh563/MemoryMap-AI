// CHAT_PLAN, INBOX 63's open lines, measured: the Capture foot's word count
// and reading time, a word count on each Write with Atlas pane, the draft
// pane in the body font, and Escape clearing the Ask question.
const { boot } = require('./lib.js');
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)));
  await page.waitForTimeout(2500);
  await page.evaluate(() => switchTab('notes'));
  await page.waitForTimeout(1000);
  const sub = (label) => page.evaluate((l) => [...document.querySelectorAll('#tab-notes button')].find((x) => x.textContent.trim() === l && x.offsetParent)?.click(), label);
  const results = {};
  await sub('Capture');
  await page.waitForTimeout(800);
  await page.click('#entry-content');
  await page.keyboard.type('Pack the tent, the stove and two warm layers for the weekend');
  await page.waitForTimeout(300);
  results.capture = await page.evaluate(() => {
    const c = document.getElementById('entry-count');
    const r = c.getBoundingClientRect();
    return { text: c.textContent, h: Math.round(r.height), visible: r.width > 0 };
  });
  await page.evaluate(() => { const b = document.getElementById('entry-content'); b.value = ''; b.dispatchEvent(new Event('input')); });
  await sub('Write with Atlas');
  await page.waitForTimeout(800);
  await page.click('#draft-thoughts');
  await page.keyboard.type('tent stove layers weekend');
  await page.evaluate(() => { const d = document.getElementById('draft-text'); d.value = 'A short draft of five words.'; d.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(300);
  results.write = await page.evaluate(() => {
    const t = document.getElementById('draft-thoughts-count');
    const d = document.getElementById('draft-count');
    const tb = t.getBoundingClientRect();
    const db = d.getBoundingClientRect();
    const draft = getComputedStyle(document.getElementById('draft-text'));
    const thoughts = getComputedStyle(document.getElementById('draft-thoughts'));
    return {
      thoughts: t.textContent, draft: d.textContent,
      headsLevel: Math.abs(tb.top - db.top) < 2,
      draftFont: draft.fontFamily.slice(0, 40), thoughtsFont: thoughts.fontFamily.slice(0, 40),
      sameFont: draft.fontFamily === thoughts.fontFamily, draftSize: draft.fontSize, thoughtsSize: thoughts.fontSize,
    };
  });
  await page.evaluate(() => { for (const id of ['draft-thoughts', 'draft-text']) { const b = document.getElementById(id); b.value = ''; b.dispatchEvent(new Event('input')); } });
  await sub('Ask');
  await page.waitForTimeout(800);
  await page.fill('#question', 'what do I pack');
  await page.focus('#question');
  await page.keyboard.press('Escape');
  results.ask = await page.evaluate(() => ({ value: document.getElementById('question').value, stillAsk: !document.getElementById('question').closest('.hidden') }));
  console.log(W, process.env.THEME || 'light', JSON.stringify(results));
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  console.log('errors:', errors.length, errors.slice(0, 3));
  await browser.close();
})();
