// INBOX 669: what moves the whole figure when a scene act (facepalm) starts
// in the large view. Prints each box's rect before and just after.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
  await page.evaluate(() => { localStorage.setItem('atlas-look', 'masculine'); document.documentElement.dataset.avatarMotion = 'always'; });
  await page.evaluate(() => { localStorage.removeItem('nm-buddy-spots'); const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.querySelector('#nm-buddy .nm-buddy-face').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async (act) => {
    const sel = ['.nm-viewer-figure', '#nm-buddy', '#nm-buddy .nm-buddy-face', '#nm-buddy .nm-buddy-char', '#nm-buddy .atl-figure-box', '#nm-buddy .atl-layer-body'];
    const rd = () => sel.map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return `${s}: ${r.left.toFixed(1)},${r.top.toFixed(1)} ${r.width.toFixed(0)}x${r.height.toFixed(0)} pos=${cs.position} left=${cs.left} tr=${cs.transform} scale=${cs.scale}`; });
    const a = rd();
    nameMarkBuddyAct(act);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const b = rd();
    return { a, b, cls: document.getElementById('nm-buddy').className };
  }, process.env.ACT || 'facepalm');
  console.log(out.cls);
  out.a.forEach((x, i) => { console.log(' before', x); console.log(' after ', out.b[i]); });
  await browser.close();
})();
