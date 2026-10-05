// The Graph: every seeded note is a node, and its Concept maps door lands
// on the boards themselves.
const { test, expect } = require("@playwright/test");
const { watchErrors, openApp, openTab, api } = require("../helpers");

test("the graph draws the notebook's notes", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  const notes = await api(page, "/entries/count");
  await openTab(page, "graph");
  await expect
    .poll(() => page.evaluate(() => (typeof graphNodesRef !== "undefined" && graphNodesRef ? graphNodesRef.length : 0)))
    .toBeGreaterThanOrEqual(Math.min(70, notes.count));
  expect(errors).toEqual([]);
});

test("Concept maps on the Graph lands on the Library's boards, first visit or not", async ({ page }) => {
  await openApp(page);
  await openTab(page, "graph");
  await page.click("#graph-concept-maps");
  await expect(page.locator("#tab-library")).toBeVisible();
  await expect(page.locator("#library-view-whiteboard")).toBeVisible();
});
