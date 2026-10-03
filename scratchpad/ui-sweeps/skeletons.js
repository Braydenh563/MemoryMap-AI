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
// Two read BLANK and are right (2026-10-03): chat/conversations is answered
// at boot and not fetched again on the tab, so its "No saved chats yet" is
// the answer; graph draws on a canvas from the notes already loaded.
const { boot } = require('./lib.js');

const DELAY = Number(process.env.DELAY || 1500);
const STATIC = /\.(js|css|png|svg|ico|woff2?|webmanifest|gguf|json)(\?|$)|\/vendor\/|\/js\//;

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
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (STATIC.test(url) || route.request().resourceType() === 'document') return route.continue();
    await new Promise((r) => setTimeout(r, DELAY));
    return route.continue().catch(() => {});
  });
  const out = [];
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
      const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true, opacityProperty: true });
      const skeletons = [...root.querySelectorAll('.skeleton, [aria-busy="true"]')].filter(vis).length;
      const empty = [...root.querySelectorAll('.empty-state, .empty-title, [class*="empty"]')].filter(vis).map((e) => e.textContent.trim().slice(0, 60)).filter(Boolean);
      return { skeletons, empty: empty.slice(0, 2), text: root.innerText.trim().slice(0, 80).replace(/\s+/g, ' ') };
    }, view.within);
    const verdict = r.missing ? 'MISSING' : r.skeletons ? 'ok' : r.empty.length ? 'EMPTY-TOO-SOON' : 'BLANK';
    out.push(`${verdict.padEnd(15)} ${view.name}${r.empty && r.empty.length ? `  "${r.empty[0]}"` : ''}${verdict === 'BLANK' ? `  [${r.text}]` : ''}`);
  }
  console.log(out.join('\n'));
  await browser.close();
})();
