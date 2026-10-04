// INBOX 508: one notification can be removed, and a removed overdue
// reminder does not come back on the next open.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot();
  const out = await page.evaluate(async () => {
    localStorage.removeItem('notifications');
    localStorage.removeItem('notificationsDismissed');
    recordNotification({ kind: 'task', title: 'Job A done' });
    recordNotification({ kind: 'task', title: 'Job B done' });
    recordNotification({ kind: 'reminder', title: 'Overdue thing', key: 'reminder:999999' });
    await openNotifications();
    const rows = () => [...document.querySelectorAll('#notif-list .notif-row')];
    const before = rows().length;
    const btn = rows()[1].querySelector('.notif-dismiss');
    const r = btn.getBoundingClientRect();
    const row = rows()[1].getBoundingClientRect();
    btn.click();
    await new Promise((res) => setTimeout(res, 300));
    const focusAfter = document.activeElement?.className;
    const tg = rows()[0].querySelector('.notif-read-toggle').getBoundingClientRect();
    const after = rows().map((li) => li.querySelector('.notif-title').textContent);
    // Remove the reminder row, then reopen: it must stay gone.
    rows().find((li) => /Overdue/.test(li.textContent))?.querySelector('.notif-dismiss').click();
    await new Promise((res) => setTimeout(res, 300));
    recordNotification({ kind: 'reminder', title: 'Overdue thing', key: 'reminder:999999' });
    closeNotifications(); await openNotifications();
    return { before, after, finalRows: rows().map((li) => li.querySelector('.notif-title').textContent),
      btn: [Math.round(r.width), Math.round(r.height)], centredY: Math.abs((r.top + r.height / 2) - (row.top + row.height / 2)) < 2,
      focusAfter, toggle: [Math.round(tg.width), Math.round(tg.height)] };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
