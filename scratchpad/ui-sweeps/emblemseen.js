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
    const g = await page.evaluate(() => ({ slot: !!document.getElementById('graph-empty-emblem'), emptyIcon: !!document.querySelector('#graph-empty .empty-icon') }));
    console.log(`note ${reduced} graph empty state: emblem element ${g.slot ? 'present' : 'absent'} (EMBLEM_SLOTS names graph-empty-emblem), icon ${g.emptyIcon ? 'present' : 'absent'}`);
    await browser.close();
  }
  console.log(bad ? `${bad} failing` : 'the logos turn');
})();
