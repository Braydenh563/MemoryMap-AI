// A note after it is written: open it, edit it in its form and save, make it
// private and read it again after the app is locked and unlocked, bin it and
// restore it from the Library. Each test writes its own note through the
// real composer, so none depends on another's leftovers.
const { test, expect } = require("@playwright/test");
const { watchErrors, openApp, openTab, api, captureNote, noteExists } = require("../helpers");

async function noteRow(page, id) {
  await openTab(page, "notes");
  await page.click('#notes-subtabs [data-section="browse"]');
  const row = page.locator(`#entry-list > li[data-id="${id}"]`);
  await expect(row).toBeVisible();
  return row;
}

async function menuItem(page, row, label) {
  await row.locator('button[aria-label="More actions"]').click();
  await page.locator(".action-menu:not(.hidden)").getByText(label, { exact: true }).click();
}

// The confirm card's filled button, whatever verb it reads (`confirmVerb`).
async function confirm(page) {
  const button = page.locator(".confirm-overlay button:not(:has-text('Cancel'))").last();
  await expect(button).toBeVisible();
  await button.click();
}

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

  await page.reload({ waitUntil: "domcontentloaded" });
  await openApp(page);
  const saved = await api(page, `/entries/${id}`);
  expect(saved.title).toBe("Offsite agenda");
  expect(saved.content).toContain("roadmap in the afternoon");
  expect(saved.content).toContain("Dinner somewhere with a long table.");
  expect(saved.tags).toContain("offsite");
  // And the card the list draws says so.
  await expect(await noteRow(page, id)).toContainText("Offsite agenda");
  expect(errors).toEqual([]);
});

test("a private note is encrypted, kept out of search, and readable again after lock and unlock", async ({ page }) => {
  await openApp(page);
  const word = `quokkaberry${Date.now() % 100000}`;
  const id = await captureNote(page, `My locker code is 4417, the ${word} one`);
  const row = await noteRow(page, id);
  await menuItem(page, row, "Make private");
  await confirm(page);
  await expect.poll(async () => (await api(page, `/entries/${id}`)).is_private).toBe(true);

  const found = await api(page, `/search?q=${word}`);
  const hits = found.hits.filter((h) => h.kind === "note").map((h) => h.id);
  expect(hits, "a private note was returned by search").not.toContain(id);

  // Lock the app and come back in with the password.
  await page.click("#lock-btn");
  await expect(page.locator("#lock-password")).toBeVisible();
  await page.fill("#lock-password", require("../playwright.config.js").E2E_PASSWORD);
  await page.click("#lock-submit");
  await openApp(page);
  const back = await api(page, `/entries/${id}`);
  expect(back.content).toContain("locker code is 4417");
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

  await page.reload({ waitUntil: "domcontentloaded" });
  await openApp(page);
  await expect(await noteRow(page, id)).toContainText("renew the passport");
});
