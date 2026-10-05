// What every lazily loaded view shows while its data is on the way (INBOX
// 435 (6), the owner: "there is no clear skeleton loaders for many features
// that are lazily loaded like the boards and maps in the library and other
// places").
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/skeletons.js          (DELAY=1500 ms)
//
// After boot, every API request (anything not a static file) is held for
// DELAY ms. Each view is then opened and read at 300 ms: it passes when its
// list shows `.skeleton` placeholders or `aria-busy`, and fails when it is
// blank or already says it is empty (an empty state shown before the answer
// is a lie the person may act on). Prints one line per view.
//
// Some views read BLANK and are right, and the sweep says so (EXPECTED below)
// rather than leaving a finding to be explained each run (2026-10-03):
// chat/conversations is answered at boot and not fetched again on the tab, so
// its "No saved chats yet" is the answer; graph draws on a canvas from the
// notes already loaded; documents/list at 390 is a drawer that is closed until
// asked for, so there is no list on screen to hold a placeholder.
//
// WIDTH=390 reads the phone shapes (default 1440). Exit code 1 when a view is
// MISSING, EMPTY-TOO-SOON or BLANK without being expected.
const { boot } = require('./lib.js');

const DELAY = Number(process.env.DELAY || 1500);
const STATIC = /\.(js|css|png|svg|ico|woff2?|webmanifest|gguf|json)(\?|$)|\/vendor\/|\/js\//;

const WIDTH = Number(process.env.WIDTH || 1440);

//: Views that are right to show no placeholder, by name, with the width they
//: apply at (0 = every width). A view listed here that *does* show one is not
//: a failure, only a note: the list says what is permitted, not what is true.
const EXPECTED_BLANK = [
  { name: 'chat/conversations', reason: 'answered at boot, not fetched on the tab', maxWidth: 0 },
  { name: 'graph', reason: 'drawn on a canvas from the notes already loaded', maxWidth: 0 },
  { name: 'documents/list', reason: 'a drawer, closed until asked for', maxWidth: 599 },
];
const expectedBlank = (name) => EXPECTED_BLANK.find((e) => e.name === name && (!e.maxWidth || WIDTH <= e.maxWidth));

const VIEWS = [
  { name: 'library/docs', open: "switchTab('library'); document.querySelector('#library-subtabs [data-target=\"library-view-docs\"]').click()", within: '#library-view-docs' },
  { name: 'library/boards and maps', open: "switchTab('library'); document.querySelector('#library-subtabs [data-target=\"library-view-whiteboard\"]').click()", within: '#library-view-whiteboard' },
  { name: 'library/media', open: "switchTab('library'); document.querySelector('#library-subtabs [data-target=\"library-view-media\"]').click()", within: '#library-view-media' },
  { name: 'library/skills', open: "switchTab('library'); document.querySelector('#library-subtabs [data-target=\"library-view-skills\"]').click()", within: '#library-view-skills' },
  { name: 'library/links', open: "switchTab('library'); document.querySelector('#library-subtabs [data-target=\"library-view-links\"]').click()", within: '#library-view-links' },
  { name: 'library/contents', open: "switchTab('library'); document.querySelector('#library-subtabs [data-target=\"library-view-contents\"]').click()", within: '#library-view-contents' },
  { name: 'reminders', open: "switchTab('reminders')", within: '#tab-reminders' },
  { name: 'timeline', open: "switchTab('timeline')", within: '#tab-timeline' },
  { name: 'chat/conversations', open: "switchTab('chat')", within: '#chat-sidebar' },
  { name: 'documents/list', open: "switchTab('documents')", within: '#doc-sidebar' },
  { name: 'graph', open: "switchTab('graph')", within: '#tab-graph' },
];

(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: WIDTH < 600 ? 844 : 900 } });
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (STATIC.test(url) || route.request().resourceType() === 'document') return route.continue();
    await new Promise((r) => setTimeout(r, DELAY));
    return route.continue().catch(() => {});
  });
  const out = [];
  let failed = 0;
  for (const view of VIEWS) {
    //: A fresh page load per view, so nothing it shows was cached by an
    //: earlier view's fetch.
    await page.goto(page.url(), { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(DELAY + 3000);
    //: A sub-tab is pressed after its tab has settled: switching to Library
    //: restores the last sub-tab a moment later, which would undo the press.
    const [tab, sub] = view.open.split('; ');
    await page.evaluate((code) => { try { (0, eval)(code); } catch (e) { console.warn(e.message); } }, tab);
    if (sub) {
      await page.waitForTimeout(600);
      await page.evaluate((code) => { try { (0, eval)(code); } catch (e) { console.warn(e.message); } }, sub);
    }
    await page.waitForTimeout(300);
    const r = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      if (!root) return { missing: true };
      // Not `opacityProperty`: a sub-view fades in over about 300ms, and read at 300ms
      // its skeletons were "invisible" (an ancestor mid-fade at opacity 0 to 0.1)
      // while the app had drawn them 18ms after the press. library/docs read BLANK
      // at 1440 and 390 for exactly that (measured s2-1005: skeletons present at
      // 18ms, checkVisibility with opacity false until about 400ms).
      const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true });
      const skeletons = [...root.querySelectorAll('.skeleton, [aria-busy="true"]')].filter(vis).length;
      const empty = [...root.querySelectorAll('.empty-state, .empty-title, [class*="empty"]')].filter(vis).map((e) => e.textContent.trim().slice(0, 60)).filter(Boolean);
      return { skeletons, empty: empty.slice(0, 2), text: root.innerText.trim().slice(0, 80).replace(/\s+/g, ' ') };
    }, view.within);
    let verdict = r.missing ? 'MISSING' : r.skeletons ? 'ok' : r.empty.length ? 'EMPTY-TOO-SOON' : 'BLANK';
    const allowed = verdict === 'BLANK' && expectedBlank(view.name);
    if (allowed) verdict = 'ok (expected)';
    else if (verdict !== 'ok') failed += 1;
    out.push(`${verdict.padEnd(15)} ${view.name}${r.empty && r.empty.length ? `  "${r.empty[0]}"` : ''}${verdict === 'BLANK' ? `  [${r.text}]` : ''}${allowed ? `  (${allowed.reason})` : ''}`);
  }
  console.log(out.join('\n'));
  console.log(failed ? `${failed} view(s) unexpected` : 'all as expected');
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
