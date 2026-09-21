// INBOX 279 (1): what each of the dashboard's three densities actually costs.
//
// The owner: "fix and refine the full compact and focused views on the
// dashboard as the hero section loses a lot and they can just be improved so
// much more". The claim to test is not "is it shorter", which Compact plainly
// is, but **what each level drops**: the recorded recommendation is that every
// level keeps the hero's identity (the greeting and the one number) and shrinks
// its art and secondary rows instead of losing the hero.
//
// So this measures, per density and per width:
//
//   * the chrome above the widget grid (the top of the page to the top of
//     `#dash-grid`), which is the number INBOX 270 was about;
//   * the hero's own height;
//   * every named band, present or dropped, so "what it drops" is a list
//     rather than an impression.
//
//   BASE=http://127.0.0.1:8991 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     NODE_PATH=/opt/node22/lib/node_modules SCRATCH=/tmp/claude-0 \
//     timeout 115 node dashdensity.js
const { boot } = require('./lib.js');

const BANDS = [
  ['emblem', '#dash-hero-emblem'],
  ['wordmark', '.dash-wordmark'],
  ['greeting', '#dash-greeting'],
  ['submessage', '#dash-submessage'],
  ['clock', '.dash-clock'],
  ['find', '#dash-find'],
  ['quicklinks', '#dash-quicklinks'],
  ['stats', '#dash-stats'],
  ['toolbar', '.dash-toolbar'],
];

let failures = 0;
const check = (label, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}  ${detail}`);
};

async function measure(page, density) {
  return page.evaluate(async (args) => {
    const { density, BANDS } = args;
    applyDashDensity(density);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const round = (n) => Math.round(n * 10) / 10;
    const grid = document.getElementById('dash-grid');
    const hero = document.getElementById('dash-hero');
    const page = document.getElementById('tab-dashboard');
    const top = page.getBoundingClientRect().top;
    const bands = {};
    for (const entry of BANDS) {
      const el = document.querySelector(entry[1]);
      if (!el) { bands[entry[0]] = null; continue; }
      const box = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      bands[entry[0]] = {
        h: round(box.height),
        w: round(box.width),
        shown: box.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden',
        size: cs.fontSize,
      };
    }
    return {
      chrome: round(grid.getBoundingClientRect().top - top),
      hero: round(hero.getBoundingClientRect().height),
      bands,
    };
  }, { density, BANDS });
}

(async () => {
  const { browser, page } = await boot();
  await page.click('[data-tab="dashboard"]');
  await page.waitForTimeout(2500);
  const results = {};
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.waitForTimeout(700);
    results[width] = {};
    for (const density of ['full', 'compact', 'focused']) {
      const m = await measure(page, density);
      results[width][density] = m;
      const dropped = Object.entries(m.bands)
        .filter(([, v]) => v && !v.shown)
        .map(([k]) => k);
      console.log(
        `${width}  ${density.padEnd(8)} chrome ${String(m.chrome).padStart(6)}  hero ${String(m.hero).padStart(5)}  drops: ${dropped.join(', ') || 'nothing'}`
      );
    }
  }

  // The gate the recommendation names: the greeting and the one number survive
  // every level at every width, and every level below Full is really shorter.
  for (const width of [1440, 390]) {
    for (const density of ['full', 'compact', 'focused']) {
      const b = results[width][density].bands;
      check(
        `${width} ${density}: greeting kept`,
        b.greeting && b.greeting.shown,
        `h ${b.greeting && b.greeting.h} at ${b.greeting && b.greeting.size}`
      );
      check(
        `${width} ${density}: the one number kept`,
        b.submessage && b.submessage.shown,
        `h ${b.submessage && b.submessage.h}`
      );
    }
    const full = results[width].full.chrome;
    const compact = results[width].compact.chrome;
    const focused = results[width].focused.chrome;
    check(`${width}: compact is shorter than full`, compact < full, `${compact} < ${full}`);
    check(`${width}: focused is shorter than compact`, focused < compact, `${focused} < ${compact}`);
  }

  console.log(JSON.stringify(results));
  console.log(failures ? `FAILURES ${failures}` : 'all checks passed');
  await browser.close();
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
