// Does anything the app asks for come back a failure while nobody is told?
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node requests.js
//
// `errors.js` watches the console, which catches a thrown exception and a
// bad SVG attribute. It does not catch the other half of "it does nothing
// and says nothing": a request that answers 404 or 500 into a `.catch(() =>
// null)`, which is how most of this app reads a response it can live
// without. That is the right shape for a poll and the wrong one for a
// feature, and from the outside the two look identical.
//
// So this tours the app the way a person does, seven tabs, four Notes
// sub-tabs, every Library view and every Settings section, and fails on any
// response of 400 or above.
//
// **A 401 is not exempt.** The lock screen's own probe answers one before
// unlock, which is why the tour starts after `boot()` has logged in: every
// 401 after that point is a session the app lost and did not mention.
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const BASE = process.env.BASE || 'http://127.0.0.1:8781';
const PW = 'testpassword123';
const TABS = ['dashboard', 'notes', 'library', 'chat', 'graph', 'timeline', 'reminders'];
const NOTES_SUBTABS = ['capture', 'browse', 'draft', 'ask'];
const LIBRARY_VIEWS = ['notes', 'documents', 'images', 'files', 'boards', 'bookmarks'];

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('theme', 'light'); localStorage.setItem('onboardingDone', '1'); } catch (e) {}
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#lock-password', { state: 'visible', timeout: 20000 });
  await page.fill('#lock-password', PW);
  await page.click('#lock-submit');
  await page.waitForTimeout(3000);
  if (await page.$('#lock-password') && await page.isVisible('#lock-password')) {
    await page.fill('#lock-password', PW); await page.click('#lock-submit'); await page.waitForTimeout(3000);
  }
  await page.evaluate(() => { const o = document.getElementById('onboarding-overlay'); if (o) o.classList.add('hidden'); });
  await page.waitForTimeout(3000);

  //: Watching starts here, after the login, for the reason in the header.
  const bad = [];
  page.on('response', (response) => {
    if (response.status() >= 400) {
      bad.push(`${response.status()} ${response.request().method()} ${response.url().replace(/^https?:\/\/[^/]+/, '')}`);
    }
  });

  for (const tab of TABS) {
    await page.evaluate((name) => { try { switchTab(name); } catch (e) {} }, tab);
    await page.waitForTimeout(2200);
  }
  for (const sub of NOTES_SUBTABS) {
    await page.evaluate((name) => { try { switchTab('notes'); showNotesSection(name); } catch (e) {} }, sub);
    await page.waitForTimeout(1400);
  }
  await page.evaluate(() => { try { switchTab('library'); } catch (e) {} });
  await page.waitForTimeout(1400);
  for (const view of LIBRARY_VIEWS) {
    //: By what the button says rather than by an id, because the Library's
    //: view switcher has been rebuilt twice and a list of ids here would go
    //: quietly out of date, which is the failure this sweep is about.
    const clicked = await page.evaluate((name) => {
      const button = [...document.querySelectorAll('#library-views button, .library-nav button, [data-library-view]')]
        .find((b) => (b.dataset.libraryView || b.textContent.trim().toLowerCase()).includes(name));
      if (!button) return false;
      button.click();
      return true;
    }, view);
    if (clicked) await page.waitForTimeout(1600);
  }
  await page.evaluate(() => { try { openSettingsModal(); } catch (e) {} });
  await page.waitForTimeout(1400);
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll('#settings-nav button[data-section]')].map((b) => b.dataset.section));
  for (const section of sections) {
    await page.evaluate((name) => { try { showSettingsSection(name); } catch (e) {} }, section);
    await page.waitForTimeout(1100);
  }

  const counted = {};
  for (const row of bad) counted[row] = (counted[row] || 0) + 1;
  const rows = Object.entries(counted).sort((a, b) => b[1] - a[1]);
  console.log(`toured ${TABS.length} tabs, ${NOTES_SUBTABS.length} sub-tabs, ${LIBRARY_VIEWS.length} library views, ${sections.length} settings sections`);
  for (const [what, times] of rows) console.log(`    x${String(times).padStart(3)}  ${what}`);
  console.log(rows.length ? `FAIL: ${rows.length} findings` : 'PASS: 0 findings');
  await browser.close();
  process.exit(rows.length ? 1 : 0);
})();
