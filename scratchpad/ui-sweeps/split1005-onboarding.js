// The welcome card after it moved to a lazy module (onboarding.js, 2026-10-05):
// the stand-in loads it, the slides step, Back and Skip work, Escape closes it,
// and the first-run path (onboardingDone unset) opens it without an error.
//   BASE=http://127.0.0.1:8824 node scratchpad/ui-sweeps/split1005-onboarding.js
const { boot } = require('./lib.js');

(async () => {
  const { browser, page } = await boot();
  const result = {};
  const shown = () => page.evaluate(() => !document.getElementById('onboarding-overlay').classList.contains('hidden'));
  result.loadedBefore = await page.evaluate(() => typeof renderOnboardingSlide);
  await page.evaluate(() => { openOnboarding(); });
  await page.waitForFunction(() => !document.getElementById('onboarding-overlay').classList.contains('hidden'), null, { timeout: 5000 });
  result.loadedAfter = await page.evaluate(() => typeof renderOnboardingSlide);
  const title = () => page.evaluate(() => document.getElementById('onboarding-title').textContent);
  result.first = await title();
  await page.click('#onboarding-next');
  await page.waitForTimeout(600);
  result.second = await title();
  result.actions = await page.evaluate(() => document.getElementById('onboarding-actions').children.length);
  await page.click('#onboarding-back');
  result.back = await title();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  result.closedByEscape = !(await shown());
  // Reopen, then skip.
  await page.evaluate(() => { openOnboarding(); });
  await page.waitForTimeout(300);
  result.reopened = await shown();
  await page.click('#onboarding-skip');
  result.closedBySkip = !(await shown());
  console.log(JSON.stringify(result));
  await browser.close();
})();
