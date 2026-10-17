// B35 (INBOX 904): perch the companion on each dashboard panel in turn, scroll
// the dashboard, and print how far the companion drifts from its panel.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 640 } });
  await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true })); localStorage.removeItem('nm-buddy-spots'); revealTab('dashboard'); });
  await page.waitForTimeout(4000);
  const n = await page.evaluate(() => [...document.querySelectorAll('#tab-dashboard .dash-widget, #tab-dashboard .card')].length);
  console.log('panels', n);
  for (let i = 0; i < Math.min(n, 14); i += 1) {
    const info = await page.evaluate(async (i) => {
      const t = document.getElementById('tab-dashboard');
      t.scrollTop = 0;
      await new Promise((r) => setTimeout(r, 400));
      const els = [...document.querySelectorAll('#tab-dashboard .dash-widget, #tab-dashboard .card')];
      const el = els[i];
      const r = el.getBoundingClientRect();
      if (r.top < 120 || r.top > 520 || r.width < 200) return { skip: true, i, top: Math.round(r.top) };
      const buddy = document.getElementById('nm-buddy');
      nameMarkBuddyIndexReset();
      const landed = nameMarkBuddyDrop(Math.round(r.left + r.width / 2), Math.round(r.top - 74));
      nameMarkBuddyMoveTo(buddy, landed, true);
      await new Promise((r) => setTimeout(r, 600));
      const g = nmb.glue;
      return { i, cls: el.className.toString().slice(0, 40), glue: g ? g.el.className.toString().slice(0, 40) : null, scroller: g?.scroller ? (g.scroller.id || g.scroller.className.toString().slice(0, 30)) : null, ride: !!nmb.ride, pose: nmb.pose };
    }, i);
    if (info.skip) continue;
    const before = await page.evaluate(() => { const f = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect(); const el = nmb.glue?.el; const c = el ? el.getBoundingClientRect() : null; return { fy: f.top, cy: c ? c.top : null }; });
    await page.mouse.move(640, 300);
    for (let k = 0; k < 4; k += 1) { await page.mouse.wheel(0, 40); await page.waitForTimeout(40); }
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => { const f = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect(); const el = nmb.glue?.el; const c = el ? el.getBoundingClientRect() : null; return { fy: f.top, cy: c ? c.top : null, st: document.getElementById('tab-dashboard').scrollTop }; });
    const dBuddy = Math.round(after.fy - before.fy), dPanel = after.cy === null ? null : Math.round(after.cy - before.cy);
    console.log(JSON.stringify({ ...info, dBuddy, dPanel, drift: dPanel === null ? null : dBuddy - dPanel, st: after.st }));
  }
  await browser.close();
})();
