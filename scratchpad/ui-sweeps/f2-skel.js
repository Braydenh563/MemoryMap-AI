// Skeletons while a list loads, and a toast that arrives and leaves
// (INBOX 399 (4)). The Library's and the Timeline's first responses are held
// back 1.5s; the list must show placeholders during the wait, mark itself
// busy, and hold none once its rows are drawn. Then a toast: its opacity
// 40ms in, settled, and 60ms after it is dismissed.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const results = [];
  const check = (label, ok, detail) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  ${detail || ''}`); };
  let hold = true;
  await page.route(/\/(library|timeline)(\?|$)/, async (route) => {
    if (hold) await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  for (const [tab, sel] of [['library', '#library-grid'], ['timeline', '#timeline-feed']]) {
    // Empty the list first, as a first visit would find it.
    await page.evaluate((s) => document.querySelector(s)?.replaceChildren(), sel);
    await page.evaluate((t) => switchTab(t), tab);
    await page.waitForTimeout(500);
    const during = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return { skel: el.querySelectorAll(':scope > .skeleton').length, busy: el.getAttribute('aria-busy'), h: el.querySelector('.skeleton')?.getBoundingClientRect().height };
    }, sel);
    check(`${tab}: placeholders while loading`, during.skel >= 3 && during.busy === 'true', JSON.stringify(during));
    await page.waitForTimeout(2500);
    const after = await page.evaluate((s) => {
      const el = document.querySelector(s);
      return { skel: el.querySelectorAll('.skeleton').length, busy: el.getAttribute('aria-busy'), kids: el.children.length };
    }, sel);
    check(`${tab}: none once drawn`, after.skel === 0 && after.busy === null && after.kids > 0, JSON.stringify(after));
  }
  hold = false;
  await page.evaluate(() => toast('Saved to your notebook'));
  await page.waitForTimeout(40);
  const t40 = await page.evaluate(() => +getComputedStyle(document.querySelector('.toast')).opacity);
  await page.waitForTimeout(400);
  const t400 = await page.evaluate(() => +getComputedStyle(document.querySelector('.toast')).opacity);
  check('toast fades in', t40 < 0.9 && t400 === 1, `opacity ${t40.toFixed(2)} at 40ms, ${t400} at 440ms`);
  await page.evaluate(() => document.querySelector('.toast .toast-close').click());
  await page.waitForTimeout(60);
  const leaving = await page.evaluate(() => { const t = document.querySelector('.toast'); return t ? +getComputedStyle(t).opacity : 'gone'; });
  await page.waitForTimeout(450);
  const gone = await page.evaluate(() => document.querySelectorAll('.toast').length);
  check('toast fades out, then is removed', typeof leaving === 'number' && leaving < 1 && gone === 0, `opacity ${leaving} at 60ms, ${gone} left at 510ms`);
  // A '?' popover: fades in from its button, and settles where it was placed.
  await page.evaluate(() => openSettingsModal('appearance'));
  await page.waitForTimeout(1500);
  const opened = await page.evaluate(() => {
    const t = [...document.querySelectorAll('[data-help-for]')].find((e) => e.checkVisibility());
    if (!t) return false;
    t.click();
    return true;
  });
  if (opened) {
    await page.waitForTimeout(30);
    const p30 = await page.evaluate(() => +getComputedStyle(document.querySelector('.help-popover')).opacity);
    await page.waitForTimeout(400);
    const settled = await page.evaluate(() => {
      const p = document.querySelector('.help-popover');
      const cs = getComputedStyle(p);
      return { opacity: +cs.opacity, translate: cs.translate, top: p.getBoundingClientRect().top, styleTop: parseFloat(p.style.top) };
    });
    check('help popover fades in and settles where it was placed', p30 < 1 && settled.opacity === 1 && Math.abs(settled.top - settled.styleTop) < 0.5,
      `opacity ${p30.toFixed(2)} at 30ms; ${JSON.stringify(settled)}`);
  } else {
    check('help popover found', false);
  }
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  await browser.close();
})();
