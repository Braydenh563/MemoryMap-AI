// What changes during an Atlas float: every attribute mutation under #nm-buddy
// (element, attribute) counted over the move, the animations running and their
// properties, plus a CPU profile's top self-time functions. Env: BASE, KIND.
const { boot } = require('./lib.js');
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const cdp = await page.context().newCDPSession(page);
  await page.evaluate((k) => {
    localStorage.setItem('atlas-look', 'masculine'); localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true }));
  }, process.env.KIND || 'atlas');
  await page.waitForTimeout(3500);
  await page.evaluate(() => {
    clearTimeout(nmb.timer);
    window.nameMarkBuddySchedule = () => {}; window.nameMarkBuddyTick = () => {};
    window.nameMarkBuddyQueuePlace = () => {}; window.nameMarkBuddyCheck = () => {};
    const b = document.getElementById('nm-buddy'); nameMarkBuddyRide(null, 400, 420); nameMarkBuddyMoveTo(b, { kind: 'card', pose: 'stand', legs: '', x: 400, y: 420 }, true);
  });
  await page.waitForTimeout(800);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const r = await page.evaluate(async () => {
    const buddy = document.getElementById('nm-buddy');
    const desc = (t) => (t.tagName || '').toLowerCase() + '.' + [...(t.classList || [])].slice(0, 3).join('.');
    const muts = {};
    const mo = new MutationObserver((list) => { for (const m of list) { const k = `${desc(m.target)} [${m.attributeName}]`; muts[k] = (muts[k] || 0) + 1; } });
    mo.observe(document.body, { attributes: true, subtree: true });
    nameMarkBuddyMoveTo(buddy, { kind: 'card', pose: 'stand', legs: '', x: 560, y: 380 });
    const seen = {};
    const t0 = performance.now();
    await new Promise((res) => {
      const tick = () => {
        for (const a of buddy.getAnimations({ subtree: true })) {
          const props = new Set();
          for (const k of a.effect.getKeyframes()) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) props.add(p);
          const key = `${a.animationName || a.transitionProperty || a.id || '?'} ${a.constructor.name} ${desc(a.effect.target)} [${[...props]}]`;
          seen[key] = (seen[key] || 0) + 1;
        }
        if (performance.now() - t0 < 2600) requestAnimationFrame(tick); else res();
      };
      requestAnimationFrame(tick);
    });
    mo.disconnect();
    const top = Object.entries(muts).sort((a, b) => b[1] - a[1]).slice(0, 25);
    return { muts: top, anims: Object.entries(seen).filter(([k, v]) => v < 150).sort((a, b) => b[1] - a[1]).slice(0, 30) };
  });
  const { profile } = await cdp.send('Profiler.stop');
  const self = {};
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  (profile.samples || []).forEach((id, i) => {
    const f = byId.get(id).callFrame;
    const k = `${f.functionName || '(anon)'}@${(f.url || '').split('/').pop().split('?')[0]}:${f.lineNumber + 1}`;
    self[k] = (self[k] || 0) + (profile.timeDeltas[i] || 0) / 1000;
  });
  console.log(JSON.stringify(r, null, 1));
  console.log(Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${v.toFixed(1)}ms ${k}`).join('\n'));
  await browser.close();
})();
