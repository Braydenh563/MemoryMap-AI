// What is running inside the companion: every animation (target, name, keyframe
// properties, duration) and, over 1.5s, which elements get attribute/style
// mutations (MutationObserver). Env: BASE, KIND (atlas|me).
const { boot } = require('./lib.js');
const KIND = process.env.KIND || 'atlas';
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((k) => {
    localStorage.setItem('atlas-look', 'masculine'); localStorage.removeItem('nm-buddy-spots');
    const b = document.getElementById('avatar-buddy'); b.value = k; b.dispatchEvent(new Event('change', { bubbles: true }));
  }, KIND);
  await page.waitForTimeout(4000);
  const r = await page.evaluate(async () => {
    const buddy = document.getElementById('nm-buddy');
    const desc = (t) => (t.tagName || '').toLowerCase() + (t.id ? '#' + t.id : '') + '.' + [...(t.classList || [])].join('.');
    const anims = {};
    for (const a of buddy.getAnimations({ subtree: true })) {
      const props = new Set();
      for (const k of a.effect.getKeyframes()) for (const p of Object.keys(k)) if (!['offset', 'easing', 'composite', 'computedOffset'].includes(p)) props.add(p);
      const key = `${a.animationName || a.transitionProperty || '?'} | ${[...props].join(',')} | ${a.effect.getTiming().duration}ms ${a.effect.getTiming().iterations}`;
      (anims[key] = anims[key] || []).push(desc(a.effect.target));
    }
    const muts = {};
    const mo = new MutationObserver((list) => { for (const m of list) { const k = `${desc(m.target)} [${m.attributeName}]`; muts[k] = (muts[k] || 0) + 1; } });
    mo.observe(buddy, { attributes: true, subtree: true });
    await new Promise((res) => setTimeout(res, 1500));
    mo.disconnect();
    const cnt = (sel) => buddy.querySelectorAll(sel).length;
    return { anims: Object.fromEntries(Object.entries(anims).map(([k, v]) => [k, v.length + ' x ' + [...new Set(v)].slice(0, 3).join(' ; ')])), muts, nodes: cnt('*'), cls: buddy.className };
  });
  console.log(JSON.stringify(r, null, 1));
  await browser.close();
})();
