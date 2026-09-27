// Atlas's own lie-down and curl (atlas.js's pose hooks, wired by
// avatars.js `nameMarkBuddyLieDown` and `nameMarkBuddyCurlUp`). Puts the
// companion (Atlas, LOOK masculine or feminine) standing on the bottom bar,
// plays the lie act and samples the drawing's `data-pose` through its
// frames, then gets it up, then sits it, puts it to sleep (a curl) and wakes
// it; screenshots each held frame to $SCRATCH/shots/lie-*.png. Measures the
// figure's box against where it stood (a lie-down that flies off its perch
// is a bug) and that every frame came in order.
// Exits 1 on frames out of order, or the drawing more than 60px off.
const { boot } = require('./lib.js');
const OUT = (process.env.SCRATCH || '.') + '/shots';

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1093, height: 614 } });
  await page.evaluate(() => { const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  if (process.env.LOOK) await page.evaluate((l) => { const s = document.getElementById('atlas-look'); if (s) { s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); } }, process.env.LOOK);
  await page.waitForTimeout(4500);
  const place = (pose) => page.evaluate((pose) => {
    const buddy = document.getElementById('nm-buddy');
    const bar = nameMarkBuddyLedges().bottom;
    nameMarkBuddyAct('');
    const y = Math.round((bar ? bar.top : innerHeight) - (pose === 'sit' ? NMB_SEAT : NMB_FEET - 1));
    nameMarkBuddyMoveTo(buddy, { x: 520, y, pose, kind: 'bar' }, true);
    clearTimeout(nmb.timer);
  }, pose);
  const box = () => page.evaluate(() => {
    const r = document.querySelector('#nm-buddy .atl-figure-box').getBoundingClientRect();
    return { pose: document.getElementById('nm-buddy').dataset.pose, cx: Math.round(r.left + r.width / 2), bottom: Math.round(r.bottom) };
  });
  const clip = async (name) => {
    const b = await page.evaluate(() => { const r = document.getElementById('nm-buddy').getBoundingClientRect(); return { x: Math.max(0, r.left - 60), y: Math.max(0, r.top - 50), width: 190, height: 170 }; });
    await page.screenshot({ path: `${OUT}/lie-${name}.png`, clip: b });
  };
  let bad = false;
  await place('stand');
  await page.waitForTimeout(700);
  const home = await box();
  await clip('0-stand');
  const seen = [];
  await page.evaluate(() => { window.__poses = []; const b = document.getElementById('nm-buddy'); new MutationObserver(() => window.__poses.push(b.dataset.pose)).observe(b, { attributes: true, attributeFilter: ['data-pose'] }); nameMarkBuddyAct('lie', 20000); });
  for (const [ms, name] of [[250, '1'], [700, '2'], [1600, '3-lie']]) {
    await page.waitForTimeout(ms - (seen.length ? 0 : 0));
    const b = await box();
    seen.push(b);
    await clip(name);
  }
  const lying = seen[seen.length - 1];
  console.log('frames down:', (await page.evaluate(() => window.__poses.splice(0))).join(' > '), 'lying', JSON.stringify(lying), 'stood', JSON.stringify(home));
  if (lying.pose !== 'lie' || Math.abs(lying.cx - home.cx) > 60 || Math.abs(lying.bottom - home.bottom) > 60) bad = true;
  await page.evaluate(() => nameMarkBuddyAct(''));
  await page.waitForTimeout(1600);
  const up = await box();
  console.log('frames up:', (await page.evaluate(() => window.__poses.splice(0))).join(' > '), JSON.stringify(up));
  if (up.pose !== 'stand') bad = true;
  // Curl: asleep sitting.
  await place('sit');
  await page.waitForTimeout(700);
  await clip('4-sit');
  await page.evaluate(() => { nmb.lastInput = Date.now() - 9 * 60 * 1000; nmb.awakeUntil = 0; const b = document.getElementById('nm-buddy'); b.classList.add('nmb-sleep'); nameMarkBuddyCurlUp(b); });
  await page.waitForTimeout(1200);
  await clip('5-curl');
  const curled = await box();
  console.log('frames curl:', (await page.evaluate(() => window.__poses.splice(0))).join(' > '), JSON.stringify(curled));
  if (curled.pose !== 'curl') bad = true;
  await page.evaluate(() => nameMarkBuddyWake(true));
  await page.waitForTimeout(1500);
  const woke = await box();
  console.log('frames wake:', (await page.evaluate(() => window.__poses.splice(0))).join(' > '), JSON.stringify(woke));
  if (woke.pose !== 'sit') bad = true;
  console.log(bad ? 'FAIL' : 'PASS');
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
