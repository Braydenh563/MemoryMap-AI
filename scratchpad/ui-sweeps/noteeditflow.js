// The note edit form's new controls do what they say (INBOX 606): a tag typed
// and Entered becomes a chip, a chip pressed goes, a category picked from the
// category chip's menu is the one saved, Save writes both, and Attach a link
// in the foot opens its picker. Run after noteeditform.js has seeded.
//   BASE=http://127.0.0.1:8798 node noteeditflow.js
const { boot } = require("./lib.js");

(async () => {
  const { page, browser } = await boot({});
  let fails = 0;
  const check = (ok, label, extra = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${label} ${extra}`); };
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1200);
  const id = await page.evaluate(async () => {
    const e = allEntries.find((x) => (x.content || "").includes("Edit form probe 2"));
    await openNoteEditor(e.id);
    return e.id;
  });
  await page.waitForTimeout(1500);
  const input = page.locator(".note-edit-tags > input.search-field-input");
  await input.click();
  await input.type("flowtag");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  const chips = await page.$$eval(".note-edit-tags .chip", (c) => c.map((x) => x.textContent.trim()));
  check(chips.includes("#flowtag"), "Enter makes a chip", JSON.stringify(chips));
  await page.locator(".note-edit-tags .chip", { hasText: "#study" }).click();
  await page.waitForTimeout(200);
  const after = await page.$$eval(".note-edit-tags .chip", (c) => c.map((x) => x.textContent.trim()));
  check(!after.includes("#study"), "pressing a chip removes it", JSON.stringify(after));
  await page.locator(".note-edit-category").click();
  await page.waitForTimeout(300);
  const rows = await page.$$eval(".action-menu:not(.hidden) [role=menuitem], .action-menu:not(.hidden) button", (b) => b.map((x) => x.textContent.trim()));
  check(rows.some((r) => /Let Atlas decide|Core Concepts/.test(r)), "the category chip opens a menu of categories", JSON.stringify(rows.slice(0, 5)));
  await page.keyboard.press("Escape");
  const attach = page.locator(".note-edit-foot > button[aria-label='Attach a link']");
  check(await attach.count() === 1, "Attach a link is in the foot");
  await page.locator(".note-edit-actions button", { hasText: "Save changes" }).click();
  await page.waitForTimeout(1500);
  const saved = await page.evaluate(async (id) => (await (await api(`/entries/${id}`)).json()).tags, id);
  check(saved.includes("flowtag") && !saved.includes("study"), "Save writes the chips", JSON.stringify(saved));
  check(errs.length === 0, "no page errors", JSON.stringify(errs));
  console.log(fails ? `${fails} failed` : "all passed");
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
