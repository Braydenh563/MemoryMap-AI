// Documents: make one from the Library's Create, write in it, and find it
// whole after a reload with the seeded documents untouched; download it as
// Markdown; bring a Markdown file in as a document.
const { test, expect } = require("@playwright/test");
const { watchErrors, openApp, openTab, api } = require("../helpers");

async function documentList(page) {
  const body = await api(page, "/documents?limit=100");
  return Array.isArray(body) ? body : body.items;
}

test("Library, Create, New document makes a new document, not the last one opened", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  const before = await documentList(page);
  const seeded = await api(page, `/documents/${before[0].id}`);

  await openTab(page, "library");
  await page.click("#library-new-doc");
  await page.locator(".rich-picker-row", { hasText: "New document" }).click();
  await expect(page.locator("#tab-documents")).toBeVisible();
  const title = `Packing plan ${Date.now() % 100000}`;
  // The title box is focused and selected for a new document.
  await expect(page.locator("#doc-title")).toBeFocused();
  await expect(page.locator("#doc-title")).toHaveValue("Untitled");
  await page.keyboard.insertText(title);
  await page.locator('#tab-documents .cm-content[aria-label="Document text"]').click();
  await page.keyboard.insertText("Passports, chargers, the rail pass.");
  await expect(page.locator("#doc-saved")).toHaveText("Saved", { timeout: 15_000 });

  const after = await documentList(page);
  expect(after.length, "New document made no document").toBe(before.length + 1);
  const made = after.find((d) => d.title === title);
  expect(made, "the new title went to another document").toBeTruthy();
  const untouched = await api(page, `/documents/${seeded.id}`);
  expect(untouched.title).toBe(seeded.title);
  expect(untouched.content).toBe(seeded.content);

  await page.reload({ waitUntil: "domcontentloaded" });
  await openApp(page, `/#/docs/${made.id}`);
  await expect(page.locator("#doc-title")).toHaveValue(title);
  await expect(page.locator("#tab-documents .cm-content")).toContainText("the rail pass");
  expect(errors).toEqual([]);
});

test("a link to an older document opens that document, not the newest", async ({ page }) => {
  await openApp(page);
  const docs = await documentList(page);
  const older = docs[docs.length - 1];
  expect(older.id).not.toBe(docs[0].id);
  await openApp(page, `/#/docs/${older.id}`);
  await expect(page.locator("#doc-title")).toHaveValue(older.title);
  // And it stays: the tab's own first load does not replace it.
  await page.waitForTimeout(1500);
  await expect(page.locator("#doc-title")).toHaveValue(older.title);
});

test("a document downloads as Markdown with its text", async ({ page }) => {
  await openApp(page);
  const doc = (await documentList(page))[0];
  await openApp(page, `/#/docs/${doc.id}`);
  await expect(page.locator("#doc-title")).toHaveValue(doc.title);
  await page.click("#doc-dock-menu > summary");
  // Download sits in its own submenu (Export ›).
  await page.locator(".menu-group:has(#doc-export-md) > button").first().click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.click("#doc-export-md"),
  ]);
  const path = await download.path();
  const text = require("fs").readFileSync(path, "utf8");
  const full = await api(page, `/documents/${doc.id}`);
  expect(text).toContain(full.content.split("\n").find((l) => l.trim().length > 20).trim());
});

test("a Markdown file imported from the Library becomes a document", async ({ page }) => {
  await openApp(page);
  const before = (await documentList(page)).length;
  await openTab(page, "library");
  await page.click('#library-subtabs button[data-target="library-view-docs"]');
  const marker = `Imported ${Date.now() % 100000}`;
  await page.setInputFiles("#library-docs-import-input", {
    name: "garden-plan.md",
    mimeType: "text/markdown",
    buffer: Buffer.from(`# Garden plan\n\n${marker}: raised beds along the south fence.\n`),
  });
  await expect.poll(async () => (await documentList(page)).length).toBe(before + 1);
  const docs = await documentList(page);
  const made = docs.find((d) => /Garden plan|garden-plan/.test(d.title));
  expect(made).toBeTruthy();
  const full = await api(page, `/documents/${made.id}`);
  expect(full.content).toContain(marker);
});
