// B35 (INBOX 904): the companion perched on a dashboard panel while the page
// was not yet scrollable (cards still loading); content then arrives, the
// dashboard scrolls, and the companion should go with its panel.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 2600 } });
  await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true })); localStorage.removeItem('nm-buddy-spots'); revealTab('dashboard'); });
  await page.waitForTimeout(4000);
  const pre = await page.evaluate(async () => {
    const t = document.getElementById('tab-dashboard');
    const els = [...document.querySelectorAll('#tab-dashboard .dash-widget')];
    const el = els.find((e) => { const r = e.getBoundingClientRect(); return r.top > 150 && r.top < 600 && r.width > 200; });
    if (!el) return { error: 'no widget', n: els.length };
    const r = el.getBoundingClientRect();
    const buddy = document.getElementById('nm-buddy');
    nameMarkBuddyIndexReset();
    const landed = nameMarkBuddyDrop(Math.round(r.left + r.width / 2), Math.round(r.top - 74));
    nameMarkBuddyMoveTo(buddy, landed, true);
    await new Promise((r) => setTimeout(r, 700));
    el.dataset.probe = '1';
    return { scrollable: t.scrollHeight > t.clientHeight + 1, sh: t.scrollHeight, ch: t.clientHeight, ride: !!nmb.ride, glue: !!nmb.glue, scroller: nmb.glue?.scroller ? 'yes' : 'null' };
  });
  console.log('perched', JSON.stringify(pre));
  if (pre.error) { await browser.close(); return; }
  // content arrives after the perch: the dashboard now scrolls
  await page.evaluate(() => {
    const t = document.getElementById('tab-dashboard');
    const sp = document.createElement('div');
    sp.id = 'probe-spacer';
    sp.style.height = '1600px';
    document.querySelector('[data-probe]').parentElement.appendChild(sp);
  });
  await page.waitForTimeout(2500);
  const state = () => page.evaluate(() => {
    const f = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect();
    const c = document.querySelector('[data-probe]').getBoundingClientRect();
    const t = document.getElementById('tab-dashboard');
    return { fy: Math.round(f.top), cy: Math.round(c.top), st: t.scrollTop, ride: !!nmb.ride, glue: !!nmb.glue, scrollerNow: !!nmb.glue?.scroller };
  });
  console.log('after spacer', JSON.stringify(await page.evaluate(() => { const t = document.getElementById('tab-dashboard'); return { sh: t.scrollHeight, ch: t.clientHeight, ov: getComputedStyle(t).overflowY, h: t.getBoundingClientRect().height, root: document.scrollingElement.scrollHeight }; })));
  const a = await state();
  await page.mouse.move(640, 300);
  for (let k = 0; k < 6; k += 1) { await page.mouse.wheel(0, 40); await page.waitForTimeout(30); }
  const mid = await state();
  await page.waitForTimeout(1500);
  const b = await state();
  console.log('before', JSON.stringify(a), 'mid-scroll', JSON.stringify(mid), 'after', JSON.stringify(b));
  console.log('drift mid', (mid.fy - a.fy) - (mid.cy - a.cy), 'drift settled', (b.fy - a.fy) - (b.cy - a.cy));
  await browser.close();
})();
