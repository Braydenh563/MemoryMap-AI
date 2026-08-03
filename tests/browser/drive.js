// Shared harness: launch Chromium, unlock/first-run, skip onboarding.
const { chromium } = require("/opt/node22/lib/node_modules/playwright");

const BASE = "http://127.0.0.1:8781";
const PASSWORD = "memorymap-dev-1";

async function open({ width = 1280, height = 860 } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("CONSOLE ERROR:", m.text());
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const overlay = page.locator("#lock-overlay");
  if (await overlay.isVisible()) {
    await page.fill("#lock-password", PASSWORD);
    await page.click("#lock-submit");
    await page.waitForTimeout(1500);
  }
  // Onboarding overlay, if present.
  await page.evaluate(() => {
    const o = document.getElementById("onboarding-overlay");
    if (o) o.classList.add("hidden");
  });
  await page.waitForTimeout(500);
  return { browser, page };
}

module.exports = { open, BASE, PASSWORD };
