// A brand-new notebook (the "first-run" project's own server and data dir):
// what a first note does with no model and nothing to learn from, what the
// empty screens say, and a full backup, sealed with a password, taken and
// restored through Settings. Restore replaces the notebook, which is why it
// runs here and not on the shared seeded one.
const fs = require("fs");
const { test, expect } = require("@playwright/test");
const { watchErrors, openApp, openTab, api, captureNote, waitFiled, noteExists } = require("../helpers");

test.describe.configure({ mode: "serial" });

test("the empty notebook says what to do, and a first note is saved and says why it is Uncategorised", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await openTab(page, "notes");
  await page.click('#notes-subtabs [data-section="browse"]');
  // An empty list is a sentence with a next step, not a blank.
  await expect(page.getByText("Your notebook is empty")).toBeVisible();
  await expect(page.getByText("Type a thought and Atlas files it for you.")).toBeVisible();

  const id = await captureNote(page, "First note: the spare key is under the blue pot");
  await waitFiled(page, id);
  // No model and nothing filed yet: it says so, and offers the choice.
  await expect(page.locator("#save-status")).toContainText("no AI model is running");
  await page.reload({ waitUntil: "domcontentloaded" });
  await openApp(page);
  const saved = await api(page, `/entries/${id}`);
  expect(saved.category).toBe("Uncategorised");
  expect(errors).toEqual([]);
});

test("a sealed full backup restores the notebook as it was", async ({ page }) => {
  await openApp(page);
  const kept = await captureNote(page, `Kept by the backup ${Date.now() % 100000}`);

  await openApp(page, "/#/settings/data");
  await page.fill("#export-backup-password", "backup-pass-1234");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#export-backup-zip")]);
  expect(download.suggestedFilename()).toMatch(/\.mmenc$/);
  const sealed = fs.readFileSync(await download.path());
  expect(sealed.subarray(0, 2).toString("latin1"), "a sealed backup is not a plain zip").not.toBe("PK");

  await page.keyboard.press("Escape");
  const lost = await captureNote(page, `Written after the backup ${Date.now() % 100000}`);

  await openApp(page, "/#/settings/data");
  await page.fill("#restore-bundle-password", "backup-pass-1234");
  await page.setInputFiles("#restore-bundle-file", {
    name: "memorymap-backup.mmenc",
    mimeType: "application/octet-stream",
    buffer: sealed,
  });
  await page.locator(".confirm-overlay button:not(:has-text('Cancel'))").last().click();
  await expect(page.locator("#restore-bundle-status")).toContainText("Restored");
  // It reloads to the lock screen; openApp signs in.
  await page.waitForTimeout(1500);
  await openApp(page);
  expect(await noteExists(page, kept), "the note in the backup came back").toBe(true);
  expect(await noteExists(page, lost), "the note written after the backup is gone").toBe(false);
});

test("a plain full backup is a zip", async ({ page }) => {
  await openApp(page, "/#/settings/data");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#export-backup-zip")]);
  expect(download.suggestedFilename()).toMatch(/\.zip$/);
  const bytes = fs.readFileSync(await download.path());
  expect(bytes.subarray(0, 2).toString("latin1")).toBe("PK");
});
