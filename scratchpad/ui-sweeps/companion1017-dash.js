// B35 (INBOX 904): the companion does not scroll with what it is perched on when
// that thing scrolls, on the dashboard. Lists the dashboard's scrollers.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 640 } });
  await page.evaluate(async () => {
    const have = (await apiJson('/entries?limit=50')).length;
    for (let i = have; i < 30; i += 1) await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: `Dash probe note ${i}. A line of words so the card has a body to it.` }) });
  });
  await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'me'; b.dispatchEvent(new Event('change', { bubbles: true })); localStorage.removeItem('nm-buddy-spots'); });
  await page.evaluate(() => revealTab('dashboard'));
  await page.waitForTimeout(4000);
  await page.waitForTimeout(3000);
  const list = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('#tab-dashboard *')) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1) out.push({ id: el.id, cls: el.className.toString().slice(0, 50), sh: el.scrollHeight, ch: el.clientHeight });
    }
    const root = document.scrollingElement;
    return { out, pageSH: root.scrollHeight, pageCH: root.clientHeight, glue: nmb.glue ? { cls: nmb.glue.el.className.toString().slice(0, 60), scroller: nmb.glue.scroller ? (nmb.glue.scroller.id || nmb.glue.scroller.className.toString().slice(0, 40)) : null } : null, ride: !!nmb.ride, perch: nmb.perch, pose: nmb.pose };
  });
  console.log(JSON.stringify(list, null, 1));
  await browser.close();
})();
