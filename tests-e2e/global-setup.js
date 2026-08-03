// Runs once before the whole suite: first-run password setup (or unlock, if
// the data dir somehow already has an account), skip the onboarding tour,
// then save the resulting cookies/localStorage so every spec starts already
// past the lock screen. Doing this once here instead of in each spec's
// beforeEach is the same reason a login flow is usually factored out of an
// E2E suite — the thing under test is the app's tabs, not the lock screen,
// which the rest of this suite would otherwise re-prove working N times.
const { chromium } = require("@playwright/test");
const path = require("path");
const config = require("./playwright.config.js");

module.exports = async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(config.BASE_URL);
  await page.waitForSelector("#lock-password", { timeout: 15_000 });

  const stillLocked = () =>
    page.evaluate(
      () => !document.getElementById("lock-overlay")?.classList.contains("hidden")
    );

  await page.fill("#lock-password", config.E2E_PASSWORD);
  await page.click("#lock-submit");
  await page.waitForTimeout(1000);

  // The same submit doubles as "create the account" on a brand-new data dir
  // and "unlock" on a returning one — see app.js's setupMode branch. If the
  // lock overlay is still up after the first submit, this was account
  // creation and a second submit unlocks with the password just set. Checked
  // via the `.hidden` class directly rather than Playwright's own visibility
  // wait: the overlay is mid-transition right after a submit, and asking
  // Playwright to click through that was fighting a moving target.
  if (await stillLocked()) {
    await page.fill("#lock-password", config.E2E_PASSWORD);
    await page.click("#lock-submit");
    await page.waitForTimeout(1000);
  }

  const onboarding = page.locator("#onboarding-overlay");
  if (await onboarding.isVisible().catch(() => false)) {
    const skip = page.locator("#onboarding-skip");
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(300);
  }

  await page.context().storageState({
    path: path.join(__dirname, ".auth-state.json"),
  });
  await browser.close();
};
