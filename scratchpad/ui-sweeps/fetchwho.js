// Who fetched what at boot. A fetch count says a URL was asked for three
// times; only a stack says which three lines did it, and WORLD_CLASS_PLAN's
// A2 row is a list of duplicate call sites. Prints one line per fetch of the
// URL given in WHO (default /preferences) with the two app.js frames under
// `apiJson`.
//
//   BASE=http://127.0.0.1:8804 WHO=/preferences PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/fetchwho.js
const WHO = process.env.WHO || '/preferences';

(async () => {
  // The hook has to be installed before app.js runs, so this sweep builds its
  // own context rather than using lib.js's boot(): an init script is the only
  // place a fetch wrapper can be put that app.js's own first call will see.
  const { chromium } = require('/opt/node22/lib/node_modules/playwright');
  const b2 = await chromium.launch();
  const ctx = await b2.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('onboardingDone', '1');
    } catch (e) {}
    window.__fetchLog = [];
    const real = window.fetch;
    window.fetch = function (...args) {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      const method = (args[1] && args[1].method) || 'GET';
      window.__fetchLog.push({ url, method, stack: new Error().stack });
      return real.apply(this, args);
    };
  });
  const page2 = await ctx.newPage();
  await page2.goto((process.env.BASE || 'http://127.0.0.1:8804') + '/', { waitUntil: 'domcontentloaded' });
  await page2.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await page2.fill('#lock-password', 'testpassword123');
  await page2.click('#lock-submit');
  await page2.waitForTimeout(6000);
  const log = await page2.evaluate((w) => (window.__fetchLog || []).filter((e) => e.url.includes(w)), WHO);
  console.log(WHO, 'fetched', log.length, 'times');
  for (const entry of log) {
    const frames = (entry.stack || '')
      .split('\n')
      .filter((l) => /:\d+:\d+/.test(l))
      .slice(1, 6)
      .map((l) => l.trim().replace(/https?:\/\/[^/]+/, ''));
    console.log(' ', entry.method, entry.url, '\n     ', frames.join('\n      '));
  }
  const all = await page2.evaluate(() => {
    const counts = {};
    for (const e of window.__fetchLog || []) {
      const key = e.method + ' ' + e.url.replace(location.origin, '').split('?')[0];
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  });
  console.log('all boot fetches', JSON.stringify(all));
  await b2.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
