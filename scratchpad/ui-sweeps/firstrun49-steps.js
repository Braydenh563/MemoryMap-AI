// Brief 49 (WORLD_CLASS 25c): the first steps on a fresh notebook, at a width
// and theme; SAMPLE=1 adds the sample notebook, asks it, removes it.
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...(W < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.evaluate(() => document.getElementById('recovery-key-skip')?.click());
  await page.waitForSelector('.first-steps', { timeout: 15000 });
  const tag = `${W}-${process.env.THEME || 'light'}`;
  const m = () => page.evaluate(() => {
    const r = (el) => { const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round); };
    const card = document.querySelector('.first-steps');
    return { card: card && r(card), tiles: card ? [...card.querySelectorAll('.start-step')].map((t) => [t.tagName, r(t), t.className]) : [],
      more: card ? [...card.querySelectorAll('.first-steps-more button')].map((b) => [b.innerText.trim(), r(b)[3]]) : [],
      input: (() => { const i = document.getElementById('first-steps-name'); return i ? [r(i), getComputedStyle(i).fontSize] : null; })(),
      hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth, entries: allEntries.length };
  });
  console.log('EMPTY', JSON.stringify(await m()));
  await page.screenshot({ path: `${process.env.SCRATCH}/steps-${tag}.png` });
  if (process.env.SAMPLE) {
    await page.click('.first-steps-more button:has-text("Try a sample notebook")');
    await page.waitForFunction(() => allEntries.length >= 8, null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    const toastText = await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.innerText.trim()).join(' | '));
    console.log('SAMPLE', JSON.stringify(await m()), 'TOAST', toastText);
    await page.screenshot({ path: `${process.env.SCRATCH}/steps-sample-${tag}.png` });
    // Ask the welcome note's question with no model.
    await page.evaluate(() => openAskFromDashboard());
    await page.waitForSelector('#question', { state: 'visible' });
    await page.fill('#question', 'where is the spare key?');
    await page.press('#question', 'Enter');
    const ok = await page.waitForFunction(() => /blue flowerpot/.test(document.querySelector('#tab-notes').innerText), null, { timeout: 30000 }).then(() => true).catch(() => false);
    console.log('ASK found', ok);
    const graph = await page.evaluate(async () => (await apiJson('/graph')).edges?.length ?? (await apiJson('/graph')).links?.length);
    console.log('GRAPH edges', graph);
    await page.evaluate(() => switchTab('dashboard'));
    await page.waitForTimeout(2500);
    await page.click('.first-steps-more button:has-text("Remove the sample notes")');
    await page.waitForFunction(() => allEntries.length === 0, null, { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    console.log('REMOVED', JSON.stringify(await m()), 'TOAST', await page.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.innerText.trim()).join(' | ')));
  }
  if (process.env.SAMPLE) {
    await page.evaluate(() => switchTab('notes')); await page.waitForTimeout(1500);
    console.log('SIDEBAR', await page.evaluate(() => [...document.querySelectorAll('#sidebar li')].filter((li) => li.getBoundingClientRect().height > 0).map((li) => li.innerText.replace(/\s+/g, ' ').trim()).join(' | ')));
  }
  console.log('ERRS', JSON.stringify(errs));
  await browser.close();
})();
