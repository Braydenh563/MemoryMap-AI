// INBOX 874: the bell panel's read and remove controls are the row's right
// edge column, centred on the row, at desktop and phone widths.
//
//   BASE=http://127.0.0.1:8941 W=1440 node scratchpad/ui-sweeps/notif874.js   (W=390 for a phone)
// Per row: the controls' vertical centre within 1.5px of the row's, their
// right edge one row padding in from the row's, no overlap with the text
// column, both controls drawn (opacity 1) without hovering.
const { boot } = require('./lib.js');
const W = Number(process.env.W || 1440);
const phone = W < 600;
(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: phone ? 844 : 900 }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  const fails = [];
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem('notificationsReadAt', String(now - 3600e3));
    localStorage.setItem('notifications', JSON.stringify([
      { id: 'task:a', kind: 'task', title: 'Finished: tidy tags', detail: '', at: now - 7200e3 },
      { id: 'export:x', kind: 'export', title: 'Saved notes.zip', detail: '/home/someone/MemoryMap/exports/notes.zip', at: now - 5000e3, action: { exports: true } },
      { id: 'untagged:test', kind: 'assist', title: '7 notes have no tags', detail: 'Tags are how notes find each other. Open the list and add a few, then the map and the search both get better at finding what you meant.', at: now - 60e3, action: { tab: 'notes', filter: 'is:untagged' } },
    ]));
  });
  await page.click('#notif-btn');
  await page.waitForTimeout(700);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
  const rows = await page.evaluate(() => [...document.querySelectorAll('#notif-list > li.notif-row')].map((row) => {
    const r = row.getBoundingClientRect();
    const a = row.querySelector('.notif-row-actions').getBoundingClientRect();
    const body = row.querySelector('.notif-body').getBoundingClientRect();
    const cs = getComputedStyle(row);
    const ops = [...row.querySelectorAll('.notif-read-toggle, .notif-dismiss')].map((b) => getComputedStyle(b).opacity);
    const foot = row.querySelector('.notif-foot');
    return {
      h: Math.round(r.height), centreDelta: Math.round(Math.abs((a.top + a.height / 2) - (r.top + r.height / 2)) * 10) / 10,
      rightGap: Math.round((r.right - a.right) * 10) / 10, pad: cs.paddingRight,
      overlap: a.left < body.right - 0.5, opacity: ops.join('/'), inFoot: foot.contains(row.querySelector('.notif-row-actions')),
      actW: Math.round(a.width), bodyW: Math.round(body.width),
    };
  }));
  rows.forEach((r, i) => {
    console.log(JSON.stringify({ i, W, ...r }));
    if (r.centreDelta > 1.5) fails.push(`row ${i}: controls ${r.centreDelta}px off the row's centre`);
    if (Math.abs(r.rightGap - parseFloat(r.pad)) > 1) fails.push(`row ${i}: right gap ${r.rightGap} vs padding ${r.pad}`);
    if (r.overlap) fails.push(`row ${i}: controls overlap the text`);
    if (r.opacity !== '1/1') fails.push(`row ${i}: controls not drawn at rest (${r.opacity})`);
    if (r.inFoot) fails.push(`row ${i}: controls are still on the meta line`);
  });
  if (rows.length !== 3) fails.push(`expected 3 rows, saw ${rows.length}`);
  console.log(fails.length ? 'FAIL ' + fails.join('; ') : 'OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
