// The first-run path, measured: first open of a fresh data dir to a first note
// filed, tagged and found again by asking. MODE=after uses the first steps;
// MODE=before uses what the base offered (the empty card's tiles, then Notes, Ask).
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE, MODE = process.env.MODE || 'after', W = +(process.env.W || 1440);
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: W < 600 ? 844 : 900 }, ...(W < 600 ? { hasTouch: true, isMobile: true } : {}) });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const acts = []; const act = (what) => acts.push(what);
  const t0 = Date.now();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 30000 });
  await page.fill('#lock-password', 'testpassword123'); act('type password');
  await page.click('#lock-submit'); act('click Set password');
  // The first-run queue (welcome, recovery key offer, update question), one at
  // a time: answered with the quickest "not now" each offers, each one an act.
  let quiet = 0;
  for (let i = 0; i < 60 && quiet < 6; i++) {
    const hit = await page.evaluate(() => {
      const vis = (el) => el && el.offsetParent !== null && el.getBoundingClientRect().height > 0;
      const skip = document.getElementById('onboarding-skip');
      if (vis(skip) && !document.getElementById('onboarding-overlay').classList.contains('hidden')) { skip.click(); return 'click Skip welcome'; }
      const rk = document.getElementById('recovery-key-skip');
      if (vis(rk)) { rk.click(); return 'click Skip recovery key'; }
      const upd = [...document.querySelectorAll('.confirm-overlay')].find((o) => /Check for updates automatically/.test(o.textContent));
      if (upd) { [...upd.querySelectorAll('button')].find((b) => /Don.t check/.test(b.textContent)).click(); return "click Don't check updates"; }
      return '';
    });
    if (hit) { act(hit); quiet = 0; } else quiet += 1;
    await page.waitForTimeout(500);
  }
  // Any queued first-run toast with a tour offer etc. is left alone.
  const tDash = Date.now() - t0;
  let card = null;
  if (MODE === 'after') {
    await page.waitForSelector('.first-steps', { timeout: 20000 });
    card = await page.evaluate(() => ({ title: document.querySelector('#first-steps-title').textContent,
      steps: [...document.querySelectorAll('.first-steps .start-step')].map((b) => b.innerText.replace(/\s+/g, ' ')),
      more: [...document.querySelectorAll('.first-steps-more button')].map((b) => b.innerText.trim()),
      nudge: !!document.getElementById('dash-name-nudge'),
      rect: (() => { const r = document.querySelector('.first-steps').getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); })(),
      hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    await page.fill('#first-steps-name', 'Robin'); act('type name');
    await page.press('#first-steps-name', 'Enter'); act('Enter');
    await page.waitForFunction(() => document.querySelector('.first-steps .start-step.is-done'), null, { timeout: 10000 });
    await page.click('.first-steps .start-step:nth-child(2)'); act('click 2. Write a note');
  } else {
    await page.waitForSelector('.dash-getting-started', { timeout: 20000 });
    await page.click('.dash-getting-started .start-step:nth-child(1)'); act('click Write your first note');
  }
  const focusWait = Date.now();
  await page.waitForFunction(() => { const a = document.activeElement; return a && (a.isContentEditable || a.id === 'entry-content' || a.closest?.('.cm-editor')); }, null, { timeout: 10000 }).catch(() => {});
  const focused = await page.evaluate(() => { const a = document.activeElement; return [a?.tagName, a?.id, a?.className?.toString().slice(0, 40), Date.now()]; });
  focused.push(Date.now() - focusWait);
  await page.keyboard.type('The spare key is under the blue pot #home'); act('type note');
  await page.keyboard.press('Control+Enter'); act('Ctrl+Enter');
  const tSaved = Date.now() - t0;
  await page.waitForFunction(() => /no AI model|Filed|Saved|Uncategorised|filed/i.test(document.getElementById('save-status')?.textContent || ''), null, { timeout: 20000 }).catch(() => {});
  const status = await page.evaluate(() => document.getElementById('save-status')?.textContent.trim());
  if (MODE === 'after') {
    await page.click('#save-status button:has-text("Ask about it")'); act('click Ask about it');
  } else {
    await page.click('#notes-subtabs [data-section="ask"]'); act('click Ask sub-tab');
  }
  await page.waitForSelector('#question', { state: 'visible', timeout: 10000 });
  await page.fill('#question', 'where is the spare key'); act('type question');
  await page.press('#question', 'Enter'); act('Enter');
  const found = await page.waitForFunction(() => /blue pot/.test(document.querySelector('#tab-notes')?.innerText.split('where is the spare key').slice(-1)[0] || ''), null, { timeout: 30000 }).then(() => true).catch(() => false);
  const tFound = Date.now() - t0;
  const entry = await page.evaluate(async () => { const r = await apiJson('/entries?limit=5'); const rows = Array.isArray(r) ? r : r.entries; return rows.map((e) => ({ category: e.category, tags: e.tags })); });
  let later = null;
  if (MODE === 'after') {
    await page.click('#tabs [data-tab="dashboard"], nav [data-tab="dashboard"]').catch(() => {});
    await page.waitForTimeout(2500);
    later = await page.evaluate(() => ({ card: !!document.querySelector('.first-steps'), done: [...document.querySelectorAll('.first-steps .start-step')].map((b) => b.className.includes('is-done')), widgets: document.querySelectorAll('#dash-grid .dash-widget').length, hidden: localStorage.getItem('firstStepsHidden') }));
  }
  console.log(JSON.stringify({ focused, MODE, W, seconds: { dashboard: tDash / 1000, saved: tSaved / 1000, foundAgain: tFound / 1000 }, actions: acts.length, acts, card, status, found, entry, later, errs }, null, 1));
  await browser.close();
})();
