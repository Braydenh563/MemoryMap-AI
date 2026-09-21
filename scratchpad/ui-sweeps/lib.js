const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const OUT = (process.env.SCRATCH||'.') + '/shots';
require('fs').mkdirSync(OUT,{recursive:true});
const PW = 'testpassword123';
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
// The browser-context options a sweep may ask for, beyond the viewport.
//
// This list is why INBOX 284 existed: `boot` used to pass `opts.viewport` and
// nothing else, so a sweep that wrote `boot({viewport:{width:390...},
// hasTouch:true, isMobile:true})` got a *desktop* context at a phone's width
// and measured every `(pointer: coarse)` and `(hover: none)` rule on the wrong
// side of its own media query, silently. Two sweeps built their own context to
// get around it (graphtouch.js, then graphphone.js and wbphone.js) rather than
// fix it here. Passing them through is the fix; naming them in one list is so
// the next option a sweep needs is added once, here, rather than worked around
// a fourth time.
//
// `isMobile` also turns on Chromium's mobile viewport and a mobile user agent,
// which is what makes `(pointer: coarse)` match; `hasTouch` alone gives the
// touch API without the media query, so the two are asked for together
// everywhere in this directory.
const CTX_OPTS = ['hasTouch', 'isMobile', 'deviceScaleFactor', 'locale',
  'timezoneId', 'colorScheme', 'reducedMotion', 'forcedColors', 'userAgent'];
async function boot(opts={}) {
  const browser = await chromium.launch();
  const ctxOpts = {viewport: opts.viewport||{width:1440,height:900}, deviceScaleFactor:1};
  for (const k of CTX_OPTS) if (opts[k] !== undefined) ctxOpts[k] = opts[k];
  const ctx = await browser.newContext(ctxOpts);
  // Deterministic theme: the app remembers the last theme server-side, so a
  // sweep after a dark screenshot run would otherwise measure dark. THEME=dark
  // to sweep the other one.
  // The welcome tour is a race, not a step. Every context is a fresh profile,
  // so `maybeShowOnboarding` opens it after unlock, sometimes *after* the
  // hide below has already run, and then every click times out on
  // "#onboarding-overlay intercepts pointer events" (it cost two sweep runs).
  // Marking it done before the app boots is the only ordering that cannot
  // lose; the hide below stays as the belt to this braces.
  // `tourDone` for the same reason, and it is the same race one step along:
  // an install that has already seen the welcome is offered the guided tour
  // once, in a toast with a "Take the tour" button (maybeShowOnboarding in
  // app.js). A sweep that let that offer appear would measure a toast nobody
  // asked about, and a click landing on it. A sweep that wants the tour opens
  // it itself (scratchpad/ui-sweeps/tour.js does).
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
      localStorage.setItem('onboardingDone', '1');
      localStorage.setItem('tourDone', '1');
    } catch (e) {}
  }, process.env.THEME || 'light');
  const page = await ctx.newPage();
  page.on('pageerror', e=>console.log('PAGEERROR:', e.message, '\n', (e.stack||'').split('\n').slice(0,6).join('\n')));
  page.on('console', m=>{ if(m.type()==='error') console.log('CONSOLE-ERR:', m.text().slice(0,160)); });
  await page.goto(BASE + '/', {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#lock-password', {state:'visible', timeout:20000});
  await page.fill('#lock-password', PW);
  await page.click('#lock-submit');
  await page.waitForTimeout(3000);
  if (await page.$('#lock-password') && await page.isVisible('#lock-password')) {
    await page.fill('#lock-password', PW); await page.click('#lock-submit'); await page.waitForTimeout(3000);
  }
  await page.evaluate(()=>{ const o=document.getElementById('onboarding-overlay'); if(o) o.classList.add('hidden'); });
  await page.waitForTimeout(800);
  return {browser, ctx, page, OUT};
}
module.exports = {boot, OUT, PW, BASE};
