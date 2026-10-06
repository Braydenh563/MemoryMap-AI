// INBOX 669: what a large view costs at rest, a second (frames, main-thread
// task time, style recalcs, layouts), Atlas's own view against the
// companion visiting it. CASES=atlas-m,buddy-m node atlas669-cost.js
const { boot } = require('./lib.js');
(async () => {
  for (const c of (process.env.CASES || 'atlas-m,atlas-f,buddy-m,buddy-f').split(',')) {
    const { browser, page } = await boot({ viewport: { width: 1280, height: 800 } });
    const look = c.endsWith('-f') ? 'feminine' : 'masculine';
    await page.evaluate((look) => { localStorage.setItem('atlas-look', look); document.documentElement.dataset.avatarMotion = 'always'; }, look);
    await page.evaluate(() => { localStorage.removeItem('nm-buddy-spots'); const b = document.getElementById('avatar-buddy'); b.value = 'atlas'; b.dispatchEvent(new Event('change', { bubbles: true })); });
    await page.waitForTimeout(3500);
    if (c.startsWith('buddy')) await page.evaluate(() => document.querySelector('#nm-buddy .nm-buddy-face').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    else await page.evaluate(() => openNameMarkViewer('Atlas'));
    await page.waitForTimeout(2500);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Performance.enable');
    const get = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
    const a = await get();
    const frames = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n += 1; if (performance.now() - t0 < 5000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
    const b = await get();
    const per = (k) => +((b[k] - a[k]) / 5).toFixed(k.endsWith('Duration') ? 3 : 1);
    const anims = await page.evaluate(() => { const r = document.querySelector('.nm-viewer-figure'); return r.getAnimations({ subtree: true }).filter((x) => x.playState === 'running').map((x) => (x.effect.target.getAttribute('class') || '').split(' ').slice(0, 2).join('.') + ':' + (x.animationName || x.id || 'js')); });
    const rig = await page.evaluate(() => { const box = document.querySelector('.nm-viewer-figure .atl-figure-box'); return box ? { moving: box.hasAttribute('data-atl-moving'), rig: !!box.atlasRig } : null; });
    console.log(c, JSON.stringify({ fps: frames / 5, taskMsPerS: +(per('TaskDuration') * 1000).toFixed(0), scriptMsPerS: +(per('ScriptDuration') * 1000).toFixed(0), recalcPerS: per('RecalcStyleCount'), layoutPerS: per('LayoutCount'), rig, svgAnims: anims.filter((x) => !/^atl-lw|^atl-orbit|^nm-buddy|^atl-ring|^atl-figure/.test(x)) }));
    await browser.close();
  }
})();
