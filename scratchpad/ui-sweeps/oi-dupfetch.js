// Which code asked for the same URL twice during boot: the JS stack of every
// request to the endpoints `boottime.js` reports as repeated.
process.env.BASE = process.env.BASE || 'http://127.0.0.1:8801';
const {chromium} = require('playwright');
const {PW, BASE} = require('./lib.js');
const WATCH = (process.env.WATCH || '/chat/recent,/entries/most-accessed,/reminders').split(',');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}});
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('onboardingDone', '1');
      localStorage.setItem('tourDone', '1');
      localStorage.setItem('activeTab', 'dashboard');
    } catch (e) {}
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  const seen = [];
  cdp.on('Network.requestWillBeSent', (ev) => {
    const path = ev.request.url.replace(/^https?:\/\/[^/]+/, '');
    if (!WATCH.some((w) => path === w || path.startsWith(w + '?'))) return;
    const frames = [];
    let stack = ev.initiator && ev.initiator.stack;
    while (stack && frames.length < 14) {
      for (const f of stack.callFrames) frames.push(`${f.functionName || '(anon)'}:${f.lineNumber + 1}`);
      stack = stack.parent;
    }
    seen.push(`${path}\n    ${frames.slice(0, 14).join(' < ')}`);
  });
  await page.goto(BASE + '/', {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#lock-password', {state: 'visible', timeout: 20000});
  await page.fill('#lock-password', PW);
  await page.click('#lock-submit');
  await page.waitForTimeout(6000);
  for (const line of seen) console.log(line);
  await browser.close();
})();
