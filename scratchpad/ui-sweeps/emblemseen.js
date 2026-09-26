// The logo on screen where round 1 could not see it (INBOX 426 h): About,
// the welcome (onboarding) and the graph's empty state. For each: is the
// emblem drawn, its size, and does it turn (the animation named and the
// transform moving between two samples 500ms apart), with and without
// reduced motion.
//
//   BASE=http://127.0.0.1:8793 THEME=dark node scratchpad/ui-sweeps/emblemseen.js
const { boot } = require('./lib.js');

function probe(id) {
  const el = document.getElementById(id);
  if (!el) return { id, present: false };
  const spin = el.querySelector('*[style*="animation"], svg, .emblem-spin') || el;
  const moving = [...el.querySelectorAll('*')].find((n) => getComputedStyle(n).animationName !== 'none') || el;
  const r = el.getBoundingClientRect();
  return { id, present: true, visible: el.checkVisibility() && r.width > 0, size: [Math.round(r.width), Math.round(r.height)], anim: getComputedStyle(moving).animationName, t0: getComputedStyle(moving).transform, spinTag: spin.tagName };
}

(async () => {
  let bad = 0;
  for (const reduced of ['no-preference', 'reduce']) {
    const { browser, page } = await boot({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced });
    const checks = [];
    await page.evaluate(() => openSettingsModal('about'));
    await page.waitForTimeout(1200);
    checks.push(['about-emblem', await page.evaluate(probe, 'about-emblem')]);
    await page.waitForTimeout(500);
    checks[0].push(await page.evaluate((id) => { const el = document.getElementById(id); const m = [...el.querySelectorAll('*')].find((n) => getComputedStyle(n).animationName !== 'none') || el; return getComputedStyle(m).transform; }, 'about-emblem'));
    await page.evaluate(() => closeSettingsModal());
    await page.waitForTimeout(400);
    // The first card is Atlas's greeting; the logo is on the cards after it.
    await page.evaluate(() => { openOnboarding(); onboardingNext(); });
    await page.waitForTimeout(1200);
    const ob = await page.evaluate(probe, 'onboarding-emblem');
    await page.waitForTimeout(500);
    checks.push(['onboarding-emblem', ob, await page.evaluate((id) => { const el = document.getElementById(id); const m = [...el.querySelectorAll('*')].find((n) => getComputedStyle(n).animationName !== 'none') || el; return getComputedStyle(m).transform; }, 'onboarding-emblem')]);
    for (const [id, a, t1] of checks) {
      const turns = a.visible && a.anim !== 'none' && t1 !== a.t0;
      if (!turns) bad++;
      console.log(`${turns ? 'ok  ' : 'FAIL'} ${reduced} ${id}: ${JSON.stringify({ visible: a.visible, size: a.size, anim: a.anim, moved: t1 !== a.t0 })}`);
    }
    // The graph's empty state, shown as the renderer shows it for a notebook
    // with no notes (this data dir has notes, so it is shown by hand).
    await page.evaluate(() => { closeOnboarding(); switchTab('graph'); });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const e = document.getElementById('graph-empty'); e.classList.remove('hidden'); e.style.display = 'grid'; });
    await page.waitForTimeout(300);
    const g0 = await page.evaluate(probe, 'graph-empty-emblem');
    await page.waitForTimeout(500);
    const g1 = g0.present ? await page.evaluate((id) => { const el = document.getElementById(id); const m = [...el.querySelectorAll('*')].find((n) => getComputedStyle(n).animationName !== 'none') || el; return getComputedStyle(m).transform; }, 'graph-empty-emblem') : null;
    const gTurns = g0.present && g0.visible && g0.anim !== 'none' && g1 !== g0.t0;
    if (!gTurns) bad++;
    console.log(`${gTurns ? 'ok  ' : 'FAIL'} ${reduced} graph-empty-emblem: ${JSON.stringify({ present: g0.present, visible: g0.visible, size: g0.size, anim: g0.anim, moved: g1 !== g0.t0 })}`);
    await browser.close();
  }
  console.log(bad ? `${bad} failing` : 'the logos turn');
})();
