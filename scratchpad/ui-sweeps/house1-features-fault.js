// Ledger 1518: a slow and a failed fetch of app-features.js. The dashboard's Quick
// access must still paint, the palette must still open, and nothing may throw.
//   BASE=... node scratchpad/ui-sweeps/house1-features-fault.js
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const PW = 'testpassword123';
async function run(mode) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 120)));
  await page.route('**/js/app-features.js*', async (route) => {
    if (mode === 'fail') return route.abort('failed');
    await new Promise((r) => setTimeout(r, 6000));
    return route.continue();
  });
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { timeout: 30000 });
  await page.fill('#lock-password', PW); await page.click('#lock-submit');
  await page.waitForFunction(() => !document.documentElement.classList.contains('shell-curtain'), null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => { const o = document.getElementById('onboarding-overlay'); if (o) o.classList.add('hidden'); });
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForTimeout(2500);
  const quick = await page.evaluate(() => {
    const q = document.getElementById('dash-quicklinks');
    return q ? { present: true, kids: q.children.length, shown: !!q.offsetParent } : { present: false };
  });
  const paletteOpens = await page.evaluate(async () => {
    const shown = () => !document.getElementById('palette-overlay').classList.contains('hidden');
    openPalette().catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
    const early = shown();
    await new Promise((r) => setTimeout(r, 9000));
    return { openAt300ms: early, openAfter9s: shown() };
  });
  console.log(JSON.stringify({ mode, elapsedMs: Date.now() - t0, quick, paletteOpens, pageErrors: errors }));
  await browser.close();
}
(async () => { await run('slow'); await run('fail'); })();
