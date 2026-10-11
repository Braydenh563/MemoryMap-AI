// What the app's emblem costs per frame, as numbers (brief "logo", 2026-10-11).
//
// The emblem animates wherever it shows (the lock screen's 76px mark, the
// chat welcome, the status bar's mark). Its motion must stay on the
// compositor: this reads Chrome's own counters over a still window with the
// emblem on screen (CDP `Performance.getMetrics`: style recalcs, layouts,
// script and task time) and the trace's Paint events, on the lock screen and
// on the chat's welcome. Run it on the base and on the change; compare.
//
//   BASE=http://127.0.0.1:8796 node scratchpad/ui-sweeps/emblemcost.js
//
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8796';
const WINDOW_MS = Number(process.env.WINDOW_MS || 4000);
const WIDTH = Number(process.env.WIDTH || 1440);

async function measure(page, client, label) {
  const pick = (m) => Object.fromEntries(m.metrics.map((x) => [x.name, x.value]));
  await page.waitForTimeout(2500); // past any arrival
  const browser = page.context().browser();
  await browser.startTracing(page, { categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline'] });
  const a = pick(await client.send('Performance.getMetrics'));
  await page.waitForTimeout(WINDOW_MS);
  const b = pick(await client.send('Performance.getMetrics'));
  const trace = JSON.parse((await browser.stopTracing()).toString());
  const events = trace.traceEvents || trace;
  const count = (name) => events.filter((e) => e.name === name).length;
  if (process.env.DEBUG) console.log(JSON.stringify(events.filter((e) => e.name === 'Paint').slice(0, 6).map((e) => e.args && e.args.data)));
  const d = (k) => +(b[k] - a[k]).toFixed(4);
  const out = {
    label,
    recalcs: d('RecalcStyleCount'),
    layouts: d('LayoutCount'),
    scriptMs: +(d('ScriptDuration') * 1000).toFixed(1),
    taskMs: +(d('TaskDuration') * 1000).toFixed(1),
    paints: count('Paint'),
    rafs: count('FireAnimationFrame'),
  };
  console.log(JSON.stringify(out));
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: 900 } });
  await ctx.addInitScript(([t, motion]) => {
    try {
      localStorage.setItem('theme', t);
      localStorage.setItem('onboardingDone', '1');
      localStorage.setItem('tourDone', '1');
      localStorage.setItem('nm-buddy-hint', 'done');
      //: UI_MOTION=off: the control, every emblem holding its final frame. Set
      //: either way: the pref is synced, so an "off" run outlives its page.
      if (motion) localStorage.setItem('ui-motion', motion);
    } catch (e) {}
  }, [process.env.THEME || 'light', process.env.UI_MOTION || 'on']);
  const page = await ctx.newPage();
  const client = await ctx.newCDPSession(page);
  await client.send('Performance.enable');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await measure(page, client, 'lock');
  await page.fill('#lock-password', 'testpassword123');
  await page.click('#lock-submit');
  await page.waitForTimeout(3500);
  //: A fresh data dir asks about updates first; its dialog takes the clicks.
  if (await page.$('.confirm-overlay')) await page.keyboard.press('Escape');
  await page.click('#tab-btn-chat').catch(() => {});
  await page.waitForTimeout(1500);
  //: NO_EMBLEM=1: the same page with every mark taken out, so what is left
  //: is the rest of the app's own motion.
  if (process.env.NO_EMBLEM) await page.evaluate((sel) => document.querySelectorAll(sel).forEach((a) => a.remove()), process.env.NO_EMBLEM === '1' ? '.emblem-art' : process.env.NO_EMBLEM);
  await measure(page, client, 'chat-welcome');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
