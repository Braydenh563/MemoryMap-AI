// INBOX 523: no empty strip on the right of a notification row.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const out = await page.evaluate(async () => {
    recordNotification({ kind: 'task', title: 'Started: Warming up the filing model that has a long name' });
    await openNotifications();
    const row = document.querySelector('#notif-list .notif-row');
    const r = row.getBoundingClientRect(), t = row.querySelector('.notif-time').getBoundingClientRect(), a = row.querySelector('.notif-row-actions').getBoundingClientRect();
    return { rowRight: Math.round(r.right), timeRight: Math.round(t.right), gap: Math.round(r.right - t.right), actions: [Math.round(a.left), Math.round(a.right), Math.round(a.top - r.top)] };
  });
  await page.hover('#notif-list .notif-row');
  await page.waitForTimeout(300);
  const hov = await page.evaluate(() => { const row = document.querySelector('#notif-list .notif-row'); const s = getComputedStyle(row.querySelector('.notif-row-actions')); return { actOp: s.opacity, timeOp: getComputedStyle(row.querySelector('.notif-time')).opacity }; });
  console.log(JSON.stringify({ ...out, ...hov }));
  await browser.close();
})();
