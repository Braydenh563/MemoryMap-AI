// Smoke suite: every tab loads, throws nothing, and doesn't overflow the
// viewport. Not a feature test — the Python suite already covers behaviour
// with the API faked; this is the one thing it structurally cannot see; a
// tab that renders wrong, a console exception on load, a card that pushes
// the page sideways.
const { test, expect } = require("@playwright/test");

// Mirrors app.js's own TABS array, minus "documents" — §36F replaced it with
// Library in the nav bar rather than keeping both (see index.html's own
// comment above #tab-btn-library), so it has no persistent #tab-btn-documents
// to click; it's reached by opening a document from the Library instead.
// Found by this suite's first real run, which is exactly the job it's for.
const TABS = [
  "dashboard",
  "notes",
  "chat",
  "graph",
  "library",
  "timeline",
  "reminders",
];

test.describe("every tab loads clean", () => {
  for (const tab of TABS) {
    test(`${tab} tab: no console errors, no layout overflow`, async ({ page }) => {
      const pageErrors = [];
      const consoleErrors = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      await page.goto("/");
      await page.waitForSelector(`#tab-btn-${tab}`, { timeout: 15_000 });
      await page.click(`#tab-btn-${tab}`);
      await page.waitForTimeout(500); // let async loads (fetches, renders) settle

      await expect(page.locator(`#tab-${tab}`)).toBeVisible();

      // The `--page-viewport`/`--page-sticky-h` traps HANDOVER.md names by
      // name: a box sized against a guess at the window, not the box it's
      // actually in, pushes the page wider than the screen rather than
      // clipping — which is invisible to a test that only checks elements
      // exist, and exactly what this catches.
      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth - root.clientWidth;
      });
      expect(
        overflow,
        `#tab-${tab} is ${overflow}px wider than the viewport — something is overflowing horizontally`
      ).toBeLessThanOrEqual(1); // 1px of rounding slack, not a real overflow

      expect(pageErrors, `uncaught exceptions on ${tab}: ${pageErrors.join("; ")}`).toEqual([]);
      expect(
        consoleErrors,
        `console.error on ${tab}: ${consoleErrors.join("; ")}`
      ).toEqual([]);
    });
  }
});

test("capturing a note makes it appear in Notes -> Browse", async ({ page }) => {
  await page.goto("/");
  await page.click("#tab-btn-notes");
  // The Notes tab defaults to its "Your notes" (browse) sub-tab — the
  // capture box lives under its own sub-tab and isn't visible until it's
  // selected (index.html's #notes-subtabs, data-section="capture").
  await page.click('[data-section="capture"]');
  await page.waitForSelector("#entry-content", { timeout: 10_000 });

  const marker = `E2E smoke-test note ${Date.now()}`;
  await page.fill("#entry-content", marker);
  await page.click("#save-btn");
  await page.waitForTimeout(1000); // filing (even the fake AI path) is async

  await page.click('[data-section="browse"]');
  await page.waitForTimeout(300);
  await expect(page.locator("#entry-list")).toContainText(marker, { timeout: 10_000 });
});
