// INBOX 669: the body's blend at an act's start, sampled (onehand, seated,
// in the large view): its keyframes and the body's turn each frame.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
  await page.evaluate(() => { localStorage.setItem('atlas-look', 'feminine'); document.documentElement.dataset.avatarMotion = 'always'; });
  await page.evaluate(() => { localStorage.removeItem('nm-buddy-spots'); const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.querySelector('#nm-buddy .nm-buddy-face').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
  await page.waitForTimeout(1500);
  await page.evaluate((pose) => { nmb.pose = pose; document.getElementById('nm-buddy').dataset.pose = pose; }, process.env.POSE || 'sit');
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async (act) => {
    const char = document.querySelector('#nm-buddy .nm-buddy-char');
    nameMarkBuddyAct(act);
    const anims = char.getAnimations().map((a) => ({ id: a.id, name: a.animationName, kf: a.effect.getKeyframes(), t: a.currentTime, comp: a.effect.composite }));
    const at = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 450) {
      await new Promise((r) => requestAnimationFrame(r));
      const cs = getComputedStyle(char);
      at.push([Math.round(performance.now() - t0), cs.rotate, cs.transformOrigin, char.getAnimations().map((a) => (a.id || a.animationName) + ':' + Math.round(a.currentTime)).join(',')]);
    }
    return { anims, at: at.filter((_, i) => i % 3 === 0) };
  }, process.env.ACT || 'onehand');
  console.log(JSON.stringify(out.anims, null, 0));
  for (const r of out.at) console.log(r.join('  '));
  await browser.close();
})();
