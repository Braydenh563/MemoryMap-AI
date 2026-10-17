// INBOX 904 B01: the first steps stay reachable: a Get started menu on the
// dashboard and a copy in the bell, after the card has been hidden.
//   BASE=http://127.0.0.1:8786 W=1440 node ui1017-b01.js
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { prefs.set('firstStepsHidden', '1'); });
  await page.evaluate(() => { switchTab('dashboard'); });
  await page.waitForTimeout(1500);
  const r = {};
  r.card = await page.evaluate(() => !!document.querySelector('.first-steps'));
  r.menuBtn = await page.evaluate(() => {
    const b = document.getElementById('dash-start-menu');
    if (!b) return null;
    const q = b.getBoundingClientRect();
    return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height), b.textContent.trim()];
  });
  if (r.menuBtn) {
    await page.click('#dash-start-menu');
    await page.waitForTimeout(400);
    r.menuRows = await page.evaluate(() => [...document.querySelectorAll('.action-menu:not(.hidden) [role=menuitem]')].map((x) => x.textContent.trim().replace(/\s+/g, ' ') + '|' + Math.round(x.getBoundingClientRect().width)));
    await page.keyboard.press('Escape');
  }
  await page.click('#notif-btn');
  await page.waitForTimeout(1500);
  r.bell = await page.evaluate(() => {
    const li = document.querySelector('.notif-start');
    return li ? li.innerText.replace(/\s+/g, ' ') : null;
  });
  r.bellFits = await page.evaluate(() => {
    const p = document.getElementById('notif-panel').getBoundingClientRect();
    return [...document.querySelectorAll('.notif-start button')].map((b) => {
      const q = b.getBoundingClientRect();
      return q.left >= p.left && q.right <= p.right && q.height >= 24;
    });
  });
  r.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(JSON.stringify(r));
  await browser.close();
})();
