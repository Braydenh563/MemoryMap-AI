// INBOX 269 (2), the second half of the vibecoded check: what each surface
// does when its own data does not arrive.
//
// This is the tell a screenshot never shows and a demo never hits. A surface
// that has never been run against a failure does one of three things, all of
// which read as the app being broken rather than the request being broken:
// it spins forever, it shows its empty state ("No notes yet" when you have
// four hundred), or it shows nothing at all.
//
// The vendored ui-ux-pro-max corpus rates this High under Feedback: "leave
// long waits unexplained" and "blank empty screens" are its two Don'ts.
//
// Method: fail every /api call for one tab, switch to it, and read what is on
// screen after the request has had time to fail. A pass is any of an error
// message, a retry affordance, or a toast: something that says the app knows.
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node vibefail.js
const { boot } = require('./lib.js');

// The tabs this app actually has (`data-tab` in index.html), each with the
// function that re-reads its data. A tab switch alone is not enough: most of
// these paint from what they already hold, so switching away and back
// measured nothing failing. A first run listed a "files" tab, which does not
// exist, and duly reported the previous tab's screen as that tab's.
const TABS = [
  { tab: 'notes', load: 'loadEntries' },
  { tab: 'timeline', load: 'renderTimeline' },
  { tab: 'library', load: 'loadLibrary' },
  { tab: 'reminders', load: 'loadReminders' },
  { tab: 'graph', load: 'renderGraph' },
  //: The dashboard is a grid of independent widgets, so a whole-surface
  //: error block is the wrong shape for it: what it owes is that no widget
  //: invents a figure. Its four stat tiles used to print "0 this week",
  //: "0 day streak", "0 reminders" from empty arrays when every request had
  //: failed, which is a statement about the person's week rather than about
  //: the app.
  { tab: 'dashboard', load: 'renderDashboard', expect: 'noInventedFigures' },
];

(async () => {
  const { page, browser } = await boot({});
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 140)));
  await page.waitForTimeout(3500);

  //: Seeded through the app's own session rather than by a shell script: the
  //: password is only set by the first unlock, which the browser does, so
  //: `seed-notebook.sh` against a fresh data dir has no token to use. An
  //: empty notebook would also make this probe meaningless, since "Your
  //: notebook is empty" would then be true.
  await page.evaluate(async () => {
    for (let i = 0; i < 6; i++) {
      await apiJson('/entries', {
        method: 'POST',
        body: JSON.stringify({ content: `Failure probe note ${i}, written on 2026-03-0${i + 1}.`, category: 'General' }),
      }).catch(() => {});
    }
    await apiJson('/documents', {
      method: 'POST', body: JSON.stringify({ title: 'Failure probe doc', content: 'One paragraph.' }),
    }).catch(() => {});
  });
  await page.waitForTimeout(1500);

  // Visit each tab once with the network healthy, so the failure run measures
  // "the refresh failed" rather than "this tab has never loaded", which is a
  // different and much rarer situation.
  for (const { tab } of TABS) {
    await page.evaluate((t) => switchTab(t), tab).catch(() => {});
    await page.waitForTimeout(1500);
  }

  let failing = false;
  //: **There is no `/api` prefix.** `api()` in app.js calls `fetch('/entries')`
  //: directly, so a route pattern of `**/api/**` matched nothing at all and
  //: the first run of this probe reported seven surfaces unchanged after a
  //: fix that was in fact never exercised. Everything is routed, and the
  //: static assets and the session are let through by extension and by path,
  //: because failing those is a different test (a broken install, not a
  //: broken request).
  const LET_THROUGH = /\.(js|css|html|map|ico|png|jpg|svg|woff2?|ttf)(\?|$)|\/auth\/|^\/?$/;
  await page.route('**/*', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (!failing || LET_THROUGH.test(path)) return route.continue();
    await route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"probe"}' });
  });

  const findings = [];
  for (const { tab, load, expect } of TABS) {
    await page.evaluate((t) => switchTab(t), tab).catch(() => {});
    await page.waitForTimeout(800);
    failing = true;
    // Ask the tab to reload its own data, the way its refresh control does.
    const ran = await page.evaluate((name) => {
      const fn = window[name];
      if (typeof fn !== 'function') return `no such loader: ${name}`;
      try { Promise.resolve(fn()).catch(() => {}); } catch (e) { /* handled on screen */ }
      return '';
    }, load);
    if (ran) findings.push(`${tab}: ${ran}`);
    await page.waitForTimeout(4500);

    const said = await page.evaluate(() => {
      const vis = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      };
      const texts = [...document.querySelectorAll('.error, .status.error, [role="alert"], .toast, .empty-state, .surface-error')]
        .filter(vis)
        .map((e) => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 70))
        .filter(Boolean);
      // A spinner still turning after the request has already failed is the
      // "spins forever" case, and is worth naming separately from silence.
      const spinners = [...document.querySelectorAll('.spinner, .loading, [aria-busy="true"], .skeleton')]
        .filter(vis).length;
      return { texts, spinners };
    });
    failing = false;

    if (expect === 'noInventedFigures') {
      const tiles = await page.evaluate(() => [...document.querySelectorAll('.stat-tile')]
        .map((t) => t.textContent.replace(/\s+/g, ' ').trim()));
      const invented = tiles.filter((t) => /^0\b/.test(t));
      if (invented.length) findings.push(`${tab}: ${invented.length} stat tile(s) show a figure they could not read: ${JSON.stringify(invented)}`);
      failing = false;
      await page.evaluate((t) => switchTab(t), tab).catch(() => {});
      await page.waitForTimeout(1800);
      continue;
    }
    const saidSomething = said.texts.some((t) => /could not|failed|error|try again|retry|went wrong|offline|unavailable/i.test(t));
    if (!saidSomething) {
      findings.push(`${tab}: nothing on screen says the request failed` +
        (said.spinners ? ` (${said.spinners} spinner(s) still turning)` : '') +
        (said.texts.length ? ` :: showing ${JSON.stringify(said.texts.slice(0, 2))}` : ' :: nothing at all'));
    }
    // Let the tab recover before the next one, so a failure does not carry.
    await page.evaluate((t) => switchTab(t), tab).catch(() => {});
    await page.waitForTimeout(1800);
  }

  for (const line of findings) console.log(`  ${line}`);
  if (errors.length) console.log(`page errors: ${errors.length}`, errors.slice(0, 3));
  console.log(findings.length ? `FAIL: ${findings.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log('ERR ' + e.message); process.exit(1); });
