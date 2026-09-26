// Reminders: "Add to calendar (.ics)" on a row's menu and "Add all" in the dock's More.
//
//   BASE=http://127.0.0.1:8847 node scratchpad/ui-sweeps/remindersics.js   (W=390 for a phone)
//
// Each click must produce a real download (the route is locked, so a plain
// link would save "Locked: unlock first"): the file is text/calendar, starts
// with BEGIN:VCALENDAR, and names the reminder by its UID.
const { boot } = require('./lib.js');
const fs = require('fs');

(async () => {
  const W = Number(process.env.W || 1440);
  const shots = process.env.SHOTS || '.';
  fs.mkdirSync(shots, { recursive: true });
  const { browser, page } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 }, acceptDownloads: true });
  const out = [];
  const check = (name, ok, detail = '') => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);
  const made = await page.evaluate(async () => {
    const due = new Date(Date.now() + 2 * 86400000).toISOString();
    const r = await apiJson('/reminders', { method: 'POST', body: JSON.stringify({ text: 'Renew the passport, then book flights', due_at: due, recurring: 'weekly' }) });
    switchTab('reminders');
    await loadReminders();
    return r;
  });
  await page.waitForTimeout(1200);
  const read = async (download) => fs.readFileSync(await download.path(), 'utf8');

  await page.click('#reminders-more-menu > summary');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/reminders-more-${W}.png` });
  const [all] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click('#reminders-export-ics')]);
  const allText = await read(all);
  check('Add all downloads a calendar', allText.startsWith('BEGIN:VCALENDAR\r\n') && allText.includes(`UID:reminder-${made.id}@memorymap.local`), `${all.suggestedFilename()} ${allText.length} bytes`);
  const closed = await page.evaluate(() => !document.getElementById('reminders-more-menu').open);
  check('the menu closes', closed);

  //: The row's actions are revealed by hovering the row (they sit where the
  //: due date is), so the row is hovered first, as a pointer would.
  const row = await page.$(`#reminder-groups li[data-id="${made.id}"]`);
  await row.hover({ force: true });
  await page.waitForTimeout(300);
  const kebab = await row.$('button[aria-label^="Actions for the reminder"]');
  await kebab.click({ force: true });
  await page.waitForTimeout(300);
  const items = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].filter((b) => b.getClientRects().length).map((b) => b.textContent.trim()));
  check('the row menu offers it', items.some((t) => /Add to calendar/.test(t)), JSON.stringify(items));
  const [one] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.locator('[role="menuitem"]:visible', { hasText: 'Add to calendar' }).click(),
  ]);
  const oneText = await read(one);
  check('one reminder downloads one event', (oneText.match(/BEGIN:VEVENT/g) || []).length === 1 && oneText.includes('RRULE:FREQ=WEEKLY'), `${one.suggestedFilename()}`);
  console.log(out.join('\n'));
  await browser.close();
})();
