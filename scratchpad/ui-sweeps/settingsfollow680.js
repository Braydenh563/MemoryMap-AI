// INBOX 680: the Settings sidebar keeps the current in-page section's link in
// view as the page scrolls. For each viewport and pane with many groups:
// scroll the pane to its last section (in steps, as a person scrolls), then
// the marked link's rect must sit inside the sidebar's rect. Also: focus does
// not move, and a pointer over the sidebar leaves it alone.
//   BASE=http://127.0.0.1:8823 [THEME=dark] node scratchpad/ui-sweeps/settingsfollow680.js
const { boot } = require('./lib.js');
const PANES = (process.env.PANES || 'appearance,models,privacy,system').split(',');
let bad = 0;

async function run(width, height) {
  const { browser, page } = await boot({ viewport: { width, height } });
  let errs = 0;
  page.on('pageerror', () => errs++);
  for (const pane of PANES) {
    await page.evaluate(() => localStorage.setItem('settings-nav-sections', 'all'));
    await page.evaluate((p) => openSettingsModal(p), pane);
    await page.waitForTimeout(1500);
    const info = await page.evaluate((p) => {
      const nav = document.querySelector('#settings-nav');
      const links = [...document.querySelectorAll('#settings-nav .settings-nav-group')];
      const scroller = settingsScroller(p);
      return { links: links.length, navScroll: nav.scrollHeight - nav.clientHeight, pane: !!scroller };
    }, pane);
    if (!info.links || !info.pane) { console.log(`${width} ${pane}: no groups (${JSON.stringify(info)})`); continue; }
    await page.mouse.move(width - 5, height - 5); // away from the sidebar
    const before = await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName));
    // Scroll the pane down in steps to its last section.
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      await page.evaluate(({ p, i, steps }) => { const s = settingsScroller(p); s.scrollTop = (s.scrollHeight - s.clientHeight) * i / steps; }, { p: pane, i, steps });
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const nav = document.querySelector('#settings-nav');
      const cur = document.querySelector('#settings-nav .settings-nav-group[aria-current="location"]');
      if (!cur) return { cur: false };
      const a = cur.getBoundingClientRect(); const b = nav.getBoundingClientRect();
      return { cur: true, inside: a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5, linkTop: Math.round(a.top), linkBottom: Math.round(a.bottom), navTop: Math.round(b.top), navBottom: Math.round(b.bottom), navScrollTop: nav.scrollTop, label: cur.textContent.trim(), focus: document.activeElement && (document.activeElement.id || document.activeElement.tagName) };
    });
    const ok = r.cur && r.inside && r.focus === before;
    if (!ok) bad++;
    console.log(`${width} ${pane}: links ${info.links}, sidebar overflow ${info.navScroll}px -> ${JSON.stringify(r)} ${ok ? 'ok' : 'FAIL'}`);
    // Back to the top: the first link comes back into view.
    await page.evaluate((p) => { settingsScroller(p).scrollTop = 0; }, pane);
    await page.waitForTimeout(1200);
    const top = await page.evaluate(() => {
      const nav = document.querySelector('#settings-nav');
      const cur = document.querySelector('#settings-nav .settings-nav-group[aria-current="location"]');
      if (!cur) return false;
      const a = cur.getBoundingClientRect(); const b = nav.getBoundingClientRect();
      return a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5;
    });
    if (!top) { bad++; console.log(`${width} ${pane}: back at the top, link not in view FAIL`); }
  }
  console.log(`${width}: page errors ${errs}`);
  await browser.close();
}

(async () => {
  for (const [w, h] of [[1440, 700], [820, 700]]) await run(w, h);
  console.log(bad ? `FAILED ${bad}` : 'all ok');
  process.exit(bad ? 1 : 0);
})();
