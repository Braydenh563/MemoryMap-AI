// INBOX 803 (the owner): in light mode the Notebook constellation sat on plain
// white where dark has a tinted well, and switching theme redrew it in one
// frame ("jolts a bit and doesn't have a smooth fade transition").
// Measures (1) the wash colour at the canvas's top-left in light and dark,
// against the card it sits on, and (2) the same pixel on the page, sampled as
// fast as screenshots allow across a theme switch: a fade shows intermediate
// values, a jolt shows two. REDUCE=1 emulates reduced motion (expect instant).
//   BASE=http://127.0.0.1:8868 SCRATCH=/tmp/x node scratchpad/ui-sweeps/constellationtheme.js
const { boot } = require('./lib.js');
const fs = require('fs');
const CATS = [{ name: 'Work', count: 30 }, { name: 'Home', count: 18 }, { name: 'Ideas', count: 12 }];
(async () => {
  const { browser, ctx, page } = await boot({ viewport: { width: 1440, height: 900 }, ...(process.env.REDUCE ? { reducedMotion: 'reduce' } : {}) });
  await ctx.route('**/insights/stats*', async (route) => {
    const res = await route.fetch(); const body = await res.json();
    body.categories = CATS; body.total_entries = 60; await route.fulfill({ response: res, json: body });
  });
  await page.evaluate(async () => {
    const have = await apiJson('/entries?limit=1').catch(() => []);
    if (!(Array.isArray(have) ? have.length : (have.items || have.entries || []).length)) for (const c of ['One', 'Two', 'Three']) await apiJson('/entries', { method: 'POST', body: JSON.stringify({ content: c }) });
    switchTab('dashboard');
    const l = dashLayout(); if (!l.order.includes('art')) l.order.unshift('art'); l.hidden = l.hidden.filter((h) => h !== 'art'); await saveDashLayout(l);
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (await page.isVisible('#lock-password').catch(() => false)) { await page.fill('#lock-password', 'testpassword123'); await page.click('#lock-submit'); }
  await page.waitForTimeout(2500);
  await page.evaluate(() => switchTab('dashboard'));
  await page.waitForFunction(() => document.querySelector('.art-holder canvas'), null, { timeout: 20000, polling: 200 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('[data-widget="art"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  const spot = () => page.evaluate(() => { const r = document.querySelector('.art-holder').getBoundingClientRect(); return { x: Math.round(r.x + 6), y: Math.round(r.y + 6) }; });
  const mode = () => page.evaluate(() => document.documentElement.dataset.mode);
  const wash = async () => {
    const s = await spot();
    return page.evaluate(({ x, y }) => { const c = document.querySelector('.art-holder canvas'); const r = c.getBoundingClientRect(); const k = c.width / r.width; const d = c.getContext('2d').getImageData(Math.round((x - r.x) * k), Math.round((y - r.y) * k), 1, 1).data; const card = getComputedStyle(document.querySelector('[data-widget="art"]')).backgroundColor; return { wash: [d[0], d[1], d[2]], card }; }, s);
  };
  const out = { mode: await mode(), ...(await wash()) };
  console.log('rest', JSON.stringify(out));
  await page.locator('[data-widget="art"]').screenshot({ path: (process.env.SCRATCH || '.') + `/art-${out.mode}.png` });
  // Switch, and record every animation frame: how much of the OLD picture is
  // still showing. Reading pixels back every frame cost most of a frame, so
  // the composite is worked out from what is on screen instead: the old sky is
  // a veil canvas (its opacity), or nothing (already the new one). The veil
  // being the only thing that carries the old picture is checked by the first
  // sample (the old sky must read 1 straight after the click, in the same task).
  await page.evaluate(() => {
    window.__frames = [];
    const oldShare = () => {
      const holder = document.querySelector('.art-holder');
      const veil = holder.querySelector('canvas.art-veil');
      const live = holder.querySelector('canvas:not(.art-veil)');
      // No veil: the old sky is whatever the live canvas was before the click.
      return veil ? Number(getComputedStyle(veil).opacity) : (window.__clicked && live ? 0 : 1);
    };
    const sample = () => window.__frames.push({ t: performance.now(), old: oldShare() });
    const loop = () => { sample(); if (performance.now() - window.__t0 < 1800) requestAnimationFrame(loop); };
    window.__t0 = performance.now();
    sample();
    document.getElementById('theme-btn').click();
    window.__clicked = true;
    sample();
    requestAnimationFrame(loop);
  });
  await page.waitForTimeout(2300);
  const fr = await page.evaluate(() => window.__frames);
  let big = 0; let gap = 0; let firstGone = null;
  for (let i = 1; i < fr.length; i += 1) { big = Math.max(big, Math.abs(fr[i].old - fr[i - 1].old)); gap = Math.max(gap, fr[i].t - fr[i - 1].t); if (firstGone === null && fr[i].old < 0.01) firstGone = fr[i].t - fr[0].t; }
  const mid = fr.filter((f) => f.old > 0.05 && f.old < 0.95).length;
  console.log(`frames ${fr.length}, largest single-frame step of the old picture ${(big * 100).toFixed(0)}% (longest frame ${gap.toFixed(0)}ms), frames part-faded ${mid}, old picture gone after ${firstGone === null ? 'never' : firstGone.toFixed(0) + 'ms'}`);
  await page.waitForTimeout(800);
  console.log('after', await mode(), JSON.stringify(await wash()));
  await browser.close();
})();
