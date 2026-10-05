// Runs once before the suite, for each of the two servers the config starts:
//
//   1. make the account through the real lock screen (a brand-new data dir
//      answers the first submit by creating it), skip the welcome, answer the
//      updates question "Don't check" (no network either way), and save the
//      cookies and localStorage so every spec starts past the lock screen;
//   2. for the "notebook" server only, seed `fixtures/notebook.json` through
//      the API: 75 notes filed in seven categories, 87 links, three
//      documents. Through the API rather than the UI because the seed is the
//      setting, not the thing under test; the capture specs then write their
//      own notes through the real composer on top of it.
//
// Doing the sign-in once here rather than in each spec's beforeEach is the
// same reason a login flow is usually factored out of an E2E suite: the lock
// screen has its own spec (first-run.spec.js), and the rest would otherwise
// re-prove it working N times.
const { chromium } = require("@playwright/test");
const path = require("path");
const config = require("./playwright.config.js");
const notebook = require("./fixtures/notebook.json");

async function signIn(baseURL, statePath) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#lock-password", { timeout: 20_000 });

  const stillLocked = () =>
    page.evaluate(() => !document.getElementById("lock-overlay")?.classList.contains("hidden"));

  await page.fill("#lock-password", config.E2E_PASSWORD);
  await page.click("#lock-submit");
  // The same submit is "create the account" on a new data dir and "unlock"
  // on a returning one (app.js's setupMode branch). Checked through the
  // `.hidden` class rather than Playwright's visibility wait: the overlay is
  // mid-transition right after a submit.
  await page.waitForFunction(() => !!localStorage.getItem("token"), null, { timeout: 20_000 });
  await page.waitForTimeout(800);
  if (await stillLocked()) {
    const field = page.locator("#lock-password");
    if (await field.isVisible().catch(() => false)) {
      await field.fill(config.E2E_PASSWORD);
      await page.click("#lock-submit");
      await page.waitForTimeout(800);
    }
  }

  const onboarding = page.locator("#onboarding-overlay");
  if (await onboarding.isVisible().catch(() => false)) {
    const skip = page.locator("#onboarding-skip");
    if (await skip.isVisible().catch(() => false)) await skip.click();
    else await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  // A first start asks once whether to check for updates; "Don't check"
  // touches no network.
  const dontCheck = page.locator(".confirm-overlay button", { hasText: "Don't check" });
  if (await dontCheck.isVisible().catch(() => false)) {
    await dontCheck.click();
    await page.waitForTimeout(300);
  }
  // The guided tour's offer and the companion's one-time hint are toasts
  // that would sit over clicks; marked seen the way a returning user has.
  await page.evaluate(() => {
    localStorage.setItem("onboardingDone", "1");
    localStorage.setItem("tourDone", "1");
    localStorage.setItem("nm-buddy-hint", "done");
  });
  const token = await page.evaluate(() => localStorage.getItem("token"));
  await page.context().storageState({ path: statePath });
  await browser.close();
  return token;
}

async function call(baseURL, token, method, route, body) {
  const response = await fetch(baseURL + route, {
    method,
    headers: { "X-Auth-Token": token, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${route}: ${response.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

async function seed(baseURL, token) {
  const ids = {};
  for (const note of notebook.notes) {
    const made = await call(baseURL, token, "POST", "/entries", {
      content: note.content,
      tags: note.tags,
      category: note.category,
    });
    ids[note.key] = made.id;
  }
  for (const link of notebook.links) {
    const body = { target_id: ids[link.to] };
    if (link.reason) body.reason = link.reason;
    await call(baseURL, token, "POST", `/entries/${ids[link.from]}/links`, body);
  }
  for (const doc of notebook.documents) {
    await call(baseURL, token, "POST", "/documents", doc);
  }
}

module.exports = async () => {
  const token = await signIn(config.BASE_URL, path.join(__dirname, ".auth-state.json"));
  await seed(config.BASE_URL, token);
  await signIn(config.FRESH_URL, path.join(__dirname, ".auth-fresh.json"));
};
