// INBOX 430: the companion gets out of a popup's way (the owner: "the
// notifications panel was blocked by it"). Puts Atlas where the
// notifications panel opens, opens the panel from its bell, and measures:
// how faded the companion is 150ms after (should be dodged), whether it
// has stepped out from under the panel within 4s, and whether it is back
// to full opacity then. Exits 1 on any of the three failing.
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(2500);
  // Where the panel opens: open it once, measure, close.
  await page.click('#notif-btn');
  await page.waitForTimeout(400);
  const panel = await page.evaluate(() => { const r = document.getElementById('notif-panel').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }; });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  // Put the companion in the middle of that box.
  await page.evaluate((p) => {
    const buddy = document.getElementById('nm-buddy');
    nmb.ride?.el && (nmb.ride = null);
    nameMarkBuddyPut(buddy, (p.left + p.right) / 2 - 32, p.top + 40);
    nmb.pose = 'float'; buddy.dataset.pose = 'float';
  }, panel);
  await page.waitForTimeout(300);
  await page.click('#notif-btn');
  await page.waitForTimeout(150);
  const at150 = await page.evaluate(() => ({ dodged: document.getElementById('nm-buddy').classList.contains('nmb-dodge'), opacity: +getComputedStyle(document.getElementById('nm-buddy')).opacity }));
  await page.waitForTimeout(4000);
  const later = await page.evaluate(() => {
    const p = document.getElementById('notif-panel').getBoundingClientRect();
    const me = document.querySelector('#nm-buddy .nm-buddy-face').getBoundingClientRect();
    const under = p.left < me.right && p.right > me.left && p.top < me.bottom && p.bottom > me.top;
    return { under, open: !document.getElementById('notif-panel').classList.contains('hidden'), dodged: document.getElementById('nm-buddy').classList.contains('nmb-dodge'), opacity: +getComputedStyle(document.getElementById('nm-buddy')).opacity };
  });
  console.log(JSON.stringify({ panel, at150, later }));
  const bad = !at150.dodged || later.under || later.opacity < 0.95;
  console.log(bad ? 'FAIL' : 'PASS');
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
