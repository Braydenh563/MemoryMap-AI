// What the app costs to start: scripts parsed, KB over the wire, fetches
// made, and how long the document took, before a single tab has been asked
// for. Written for WORLD_CLASS_PLAN's "Audit, 2026-09-13 night" rows A1 and
// A2 (per-tab module loading, and boot fetching more than it shows), and
// kept because both rows are ratchets: the numbers here are the only way to
// tell a deferred module from a deleted one.
//
//   BASE=http://127.0.0.1:8804 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/boottime.js
//
// Two readings, not one. The first is taken the moment the shell is up: it
// is the figure A1 and A2 are about. The second is taken after every tab in
// the bar has been visited, which is what a deferred loader has to pay back:
// if the second reading is much larger than the pre-split boot figure, the
// split moved the cost rather than removing it.
const { boot } = require('./lib.js');

const SNAP = () => {
  const res = performance.getEntriesByType('resource');
  const nav = performance.getEntriesByType('navigation')[0];
  const js = res.filter((r) => /\.js(\?|$)/.test(r.name));
  const css = res.filter((r) => /\.css(\?|$)/.test(r.name));
  const kb = (a) => Math.round(a.reduce((s, r) => s + (r.transferSize || 0), 0) / 1024);
  const fetches = res.filter((r) => r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest');
  return {
    domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
    load: Math.round(nav.loadEventEnd),
    jsFiles: js.length,
    jsKB: kb(js),
    cssFiles: css.length,
    cssKB: kb(css),
    fetches: fetches.length,
    scriptTags: document.querySelectorAll('script[src]').length,
    heapMB: Math.round((performance.memory?.usedJSHeapSize || 0) / 1048576),
  };
};

const SLOWEST = (n) =>
  performance
    .getEntriesByType('resource')
    .filter((r) => r.initiatorType === 'fetch' || r.initiatorType === 'xmlhttprequest')
    .map((r) => ({ u: r.name.replace(location.origin, '').slice(0, 46), ms: Math.round(r.duration) }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, n);

// Which URL was asked for how many times: a repeat at boot is the A2 shape
// (five `/insights/stats`, two `/preferences`), and a count is the only way
// to see it, a fetch total hides it.
const REPEATS = () => {
  const counts = {};
  for (const r of performance.getEntriesByType('resource')) {
    if (r.initiatorType !== 'fetch' && r.initiatorType !== 'xmlhttprequest') continue;
    const key = r.name.replace(location.origin, '').split('?')[0];
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]);
};

const JSLIST = () =>
  performance
    .getEntriesByType('resource')
    .filter((r) => /\.js(\?|$)/.test(r.name))
    .map((r) => r.name.replace(location.origin, '').split('?')[0]);

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const at_boot = await page.evaluate(SNAP);
  const slowest = await page.evaluate(SLOWEST, 8);
  const repeats = await page.evaluate(REPEATS);
  const bootJs = await page.evaluate(JSLIST);
  const firstTab = await page.evaluate(() => localStorage.getItem('activeTab'));

  console.log('boot          ', JSON.stringify(at_boot));
  console.log('first tab     ', firstTab);
  console.log('boot js       ', JSON.stringify(bootJs));
  console.log('slowest fetch ', JSON.stringify(slowest));
  console.log('repeated      ', JSON.stringify(repeats));

  // Every tab in the bar, plus the two sub-views that own their own module
  // (the Library's Whiteboards landing, and a document open from it).
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('#tab-bar button')].map((b) => b.dataset.tab)
  );
  for (const tab of tabs) {
    await page.evaluate((t) => window.switchTab(t), tab);
    await page.waitForTimeout(900);
  }
  await page.evaluate(() => window.switchTab('library'));
  await page.waitForTimeout(600);
  await page.click('#library-subtabs button[data-library-view="whiteboard"]').catch(() => {});
  await page.waitForTimeout(1200);

  const after = await page.evaluate(SNAP);
  const afterJs = await page.evaluate(JSLIST);
  console.log('after tabs    ', JSON.stringify(after));
  console.log('after js      ', JSON.stringify(afterJs));
  console.log('tabs visited  ', JSON.stringify(tabs));
  console.log('pageerrors    ', errors.length, JSON.stringify(errors.slice(0, 6)));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
