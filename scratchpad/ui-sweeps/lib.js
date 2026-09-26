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
  //: SCROLLBARS=1 draws real scrollbars, as Windows does (17px, taking
  //: layout width). Headless Chromium hides them by default, which is the
  //: one difference between a sweep and the owner's desktop window that no
  //: viewport or scale setting reproduces (INBOX 397).
  const browser = await chromium.launch(
    process.env.SCROLLBARS ? { ignoreDefaultArgs: ["--hide-scrollbars"] } : {}
  );
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
  // LOOK picks a look by its preset id (`default` is Classic), for a sweep
  // that has to hold in more than the default look. Unset means whatever the
  // app's own default is, which is what every older sweep measured.
  await ctx.addInitScript((look) => {
    try {
      if (look) localStorage.setItem('themePreset', look);
    } catch (e) {}
  }, process.env.LOOK || '');
  // GLASS=off (or on) sets the glass preference over whatever the look says,
  // for a sweep that has to hold with the glass-off list applied.
  await ctx.addInitScript((glass) => {
    try {
      if (glass) localStorage.setItem('glass', glass);
    } catch (e) {}
  }, process.env.GLASS || '');
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
      localStorage.setItem('onboardingDone', '1');
      localStorage.setItem('tourDone', '1');
      // The companion's one-time nudge is a toast too (avatars.js,
      // `nameMarkBuddyHint`): marked seen for the same reason. A sweep that
      // wants it clears this key.
      if (!localStorage.getItem('nm-buddy-hint-sweep')) localStorage.setItem('nm-buddy-hint', 'done');
    } catch (e) {}
  }, process.env.THEME || 'light');
  // OVERRIDE_JS="whiteboard.js=/tmp/base/whiteboard.js" serves that file in
  // place of the app's own, so a "before" can be measured against a base
  // commit's script on the same server and data dir as the "after".
  if (process.env.OVERRIDE_JS) {
    const [name, file] = process.env.OVERRIDE_JS.split('=');
    const body = require('fs').readFileSync(file, 'utf8');
    await ctx.route(`**/${name}*`, (route) => route.fulfill({ body, contentType: 'application/javascript' }));
  }
  // The same for one stylesheet: OVERRIDE_CSS="07-whiteboard-misc.css=/path".
  if (process.env.OVERRIDE_CSS) {
    const [name, file] = process.env.OVERRIDE_CSS.split('=');
    const body = require('fs').readFileSync(file, 'utf8');
    await ctx.route(`**/css/${name}*`, (route) => route.fulfill({ body, contentType: 'text/css' }));
  }
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
