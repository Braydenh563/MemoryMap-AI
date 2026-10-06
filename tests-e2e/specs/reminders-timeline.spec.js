// Reminders from plain words, kept across a reload, done and undone, deleted
// and brought back; and the Timeline, which puts notes and reminders on one
// axis. No model: the plain-words reader is the app's own (no AI needed).
const { test, expect } = require("@playwright/test");
const { watchErrors, openApp, openTab, api } = require("../helpers");

function reminderRow(page, text) {
  return page.locator("#tab-reminders li", { hasText: text });
}

test("a reminder typed in plain words gets a due time, survives a reload, and can be marked done", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await openTab(page, "reminders");
  const who = `Sam ${Date.now() % 10000}`;
  await page.click("#reminder-magic");
  await page.keyboard.insertText(`call ${who} tomorrow evening`);
  await page.click("#reminder-magic-add");
  await expect(page.locator("#reminder-magic-status")).toContainText(`Call ${who}`);

  const made = (await api(page, "/reminders")).find((r) => r.text === `Call ${who}`);
  expect(made, "no reminder was saved").toBeTruthy();
  const due = new Date(made.due_at);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  expect(due.toDateString(), "tomorrow evening is tomorrow").toBe(tomorrow.toDateString());
  expect(due.getHours(), "evening is after 5pm").toBeGreaterThanOrEqual(17);

  await page.reload({ waitUntil: "domcontentloaded" });
  await openApp(page);
  await openTab(page, "reminders");
  const row = reminderRow(page, `Call ${who}`);
  await expect(row).toBeVisible();
  // Clicked, not check(): the list redraws at once and moves it to Done.
  await row.locator('input[type="checkbox"]').click();
  await expect
    .poll(async () => (await api(page, "/reminders")).find((r) => r.id === made.id)?.done)
    .toBe(true);
  expect(errors).toEqual([]);
});

test("a deleted reminder comes back with Undo", async ({ page }) => {
  await openApp(page);
  await openTab(page, "reminders");
  const text = `Return the drill ${Date.now() % 10000}`;
  await page.fill("#reminder-text", text);
  await page.click("#reminder-add");
  const row = reminderRow(page, text);
  await expect(row).toBeVisible();
  // The row's actions lie over its time until the pointer is on the row.
  await row.hover();
  await row.locator('button[aria-label^="Actions for"]').click();
  await page.locator(".action-menu:not(.hidden) [role=menuitem]", { hasText: "Delete" }).click();
  const yes = page.locator(".confirm-overlay button:not(:has-text('Cancel'))").last();
  if (await yes.isVisible().catch(() => false)) await yes.click();
  await expect(row).toHaveCount(0);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Control+z");
  await expect(reminderRow(page, text)).toBeVisible();
});

test("the Timeline shows a new note and a reminder, and its search narrows to the match", async ({ page }) => {
  await openApp(page);
  const stamp = Date.now() % 100000;
  const note = await api(page, "/entries", {
    method: "POST",
    body: JSON.stringify({ content: `Timeline probe ${stamp}: the bike needs new brake pads`, category: "Home" }),
  });
  expect(note.id).toBeGreaterThan(0);
  await openTab(page, "timeline");
  const timeline = page.locator("#tab-timeline");
  await expect(timeline).toContainText(`Timeline probe ${stamp}`);
  // Reminders are on it too (the seed has eight; the first spec added more).
  await expect(timeline.locator(".timeline-row").first()).toBeVisible();
  await page.fill("#timeline-search", `probe ${stamp}`);
  await expect.poll(() => timeline.locator(".timeline-row:visible").count()).toBe(1);
});
