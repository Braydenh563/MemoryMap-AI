// A note after it is written: edit it in its form and save, bin it and
// restore it from the Library, and an edit left unsaved kept across a
// reload. (Private notes and the lock are in first-run.spec.js.) Each test
// writes its own note through the real composer.
const { test, expect } = require("@playwright/test");
const { watchErrors, openApp, api, captureNote, noteExists, noteRow, menuItem, reloadApp } = require("../helpers");

test("the edit form saves a new title, body and tag, and they survive a reload", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  const id = await captureNote(page, "Draft agenda for the offsite: roadmap in the afternoon");
  const row = await noteRow(page, id);
  await row.locator('button[aria-label="Edit this entry"]').click();
  const title = row.locator(".note-edit-title");
  await expect(title).toBeVisible();
  await title.fill("Offsite agenda");
  const body = row.locator('.cm-content[aria-label="Note text"]');
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText("\n\nDinner somewhere with a long table.");
  await row.locator(".note-edit-tag-input").fill("offsite");
  await page.keyboard.press("Enter");
  await row.locator("button", { hasText: "Save changes" }).click();
  await expect(row.locator(".note-edit-title")).toHaveCount(0);

  await reloadApp(page);
  const saved = await api(page, `/entries/${id}`);
  expect(saved.title).toBe("Offsite agenda");
  expect(saved.content).toContain("roadmap in the afternoon");
  expect(saved.content).toContain("Dinner somewhere with a long table.");
  expect(saved.tags).toContain("offsite");
  // And the card the list draws says so.
  await expect(await noteRow(page, id)).toContainText("Offsite agenda");
  expect(errors).toEqual([]);
});

test("Move to bin, then Restore from the Library's bin, brings the note back", async ({ page }) => {
  await openApp(page);
  const text = `Bin check ${Date.now()}: renew the passport before March`;
  const id = await captureNote(page, text);
  const row = await noteRow(page, id);
  await menuItem(page, row, "Move to bin");
  await expect.poll(() => noteExists(page, id)).toBe(false);
  await expect(page.locator(`#entry-list > li[data-id="${id}"]`)).toHaveCount(0);

  // The bin, the way the Guide says to reach it: Ctrl+K, "Open the bin".
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Open the bin");
  await page.keyboard.press("Enter");
  await expect(page.locator("#tab-library")).toBeVisible();
  const binned = page.locator("#library-grid .library-card", { hasText: text });
  await expect(binned).toBeVisible();
  await binned.locator("button[aria-label^=\"Actions for\"]").click();
  await page.locator(".action-menu:not(.hidden) [role=menuitem]", { hasText: "Restore" }).click();
  await expect.poll(() => noteExists(page, id)).toBe(true);

  await reloadApp(page);
  await expect(await noteRow(page, id)).toContainText("renew the passport");
});

test("an edit left unsaved in the form survives a reload and can be reopened", async ({ page }) => {
  await openApp(page);
  const id = await captureNote(page, `Reload check ${Date.now() % 100000}: the bike lock code`);
  const row = await noteRow(page, id);
  await row.locator('button[aria-label="Edit this entry"]').click();
  const body = row.locator('.cm-content[aria-label="Note text"]');
  await body.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.insertText(" is 2210, not 2201");
  // The browser asks before leaving; this run says Leave, the way a person
  // in a hurry does, and the edit must still be there to come back to.
  page.once("dialog", (dialog) => dialog.accept());
  await reloadApp(page);
  const offer = page.locator(".toast", { hasText: "unsaved changes" });
  await expect(offer).toBeVisible({ timeout: 15_000 });
  await offer.getByRole("button", { name: "Open them" }).click();
  const form = page.locator(`#entry-list > li[data-id="${id}"] textarea.note-edit-box`);
  await expect(form).toHaveValue(/is 2210, not 2201/);
  await page.locator(`#entry-list > li[data-id="${id}"]`).locator("button", { hasText: "Save changes" }).click();
  await expect.poll(async () => (await api(page, `/entries/${id}`)).content).toContain("is 2210, not 2201");
});

// Found by this suite flaking on CI settings: the tag list is fetched on the
// field's first focus, and when that answer came after the tag was typed and
// Enter pressed, the list opened then, every tag in it, over Save changes; a
// press meant for Save took a tag nobody chose. The answer is held back here
// so the order is certain, not a matter of load.
test("a tag typed and entered before the tag list arrives does not open the list over Save", async ({ page }) => {
  await openApp(page);
  const id = await captureNote(page, `Tag race ${Date.now()}: call the plumber about the boiler`);
  const row = await noteRow(page, id);
  await row.locator('button[aria-label="Edit this entry"]').click();
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route(/\/tags(\?|$)/, async (route) => {
    await held;
    await route.continue();
  });
  const input = row.locator(".note-edit-tag-input");
  await input.click();
  await page.keyboard.insertText("plumbing");
  await page.keyboard.press("Enter");
  await expect(row.locator(".note-edit-tags")).toContainText("plumbing");
  release();
  await page.waitForResponse(/\/tags(\?|$)/);
  // The list's own work after the answer is one render; give it that frame.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  await expect(page.locator(".tag-suggest:not(.hidden)")).toHaveCount(0);
  await row.locator("button", { hasText: "Save changes" }).click();
  await expect.poll(async () => (await api(page, `/entries/${id}`)).tags).toEqual(["plumbing"]);
});

// And the guard above keeps the list itself: a press in an empty tags field,
// with the tags slow to come, still opens it once they do.
test("a press in an empty tags field shows the tags already used", async ({ page }) => {
  await openApp(page);
  const id = await captureNote(page, `Tag list ${Date.now()}: the sourdough starter needs feeding`);
  const row = await noteRow(page, id);
  await row.locator('button[aria-label="Edit this entry"]').click();
  let release;
  const held = new Promise((resolve) => (release = resolve));
  await page.route(/\/tags(\?|$)/, async (route) => {
    await held;
    await route.continue();
  });
  await row.locator(".note-edit-tag-input").click();
  release();
  await expect(page.locator(".tag-suggest:not(.hidden) [role=option]").first()).toBeVisible();
});
