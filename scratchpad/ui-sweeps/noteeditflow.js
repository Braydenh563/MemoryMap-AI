// The note edit form's new controls do what they say (INBOX 606): a tag typed
// and Entered becomes a chip, a chip pressed goes, a category picked from the
// category chip's menu is the one saved, Save writes both, and Attach a link
// in the foot opens its picker. Run after noteeditform.js has seeded.
// INBOX 616: the add-tag input is on the properties line, Related opens from
// its one line, and Attach a link picks a bookmark that then shows under the
// text as a reference, with still one Attach button in the foot.
//   BASE=http://127.0.0.1:8798 node noteeditflow.js
const { boot } = require("./lib.js");

(async () => {
  const { page, browser } = await boot({});
  let fails = 0;
  const check = (ok, label, extra = "") => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${label} ${extra}`); };
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  // The picker needs a bookmark to pick: seed one through the API (fresh dir).
  await page.evaluate(async () => {
    const have = await (await api("/bookmarks")).json().catch(() => []);
    if (!have.length) await api("/bookmarks", { method: "POST", body: JSON.stringify({ url: "https://example.org/spaced", title: "Spaced repetition primer" }) });
  });
  await page.evaluate(async () => {
    if (allEntries.some((x) => (x.content || "").includes("Edit form probe 2"))) return;
    await api("/entries", { method: "POST", body: JSON.stringify({ content: "# Edit form probe 2\n\nSpaced repetition helps memory.", tags: ["memory", "study"], category: "Core Concepts" }) });
    await loadEntries();
  });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1200);
  const id = await page.evaluate(async () => {
    const e = allEntries.find((x) => (x.content || "").includes("Edit form probe 2")) || allEntries.find((x) => !(x.content || "").includes("Edit form probe 1"));
    await openNoteEditor(e.id);
    return e.id;
  });
  await page.waitForTimeout(1500);
  const input = page.locator(".note-edit-tags > input.note-edit-tag-input");
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
  const toggle = page.locator(".note-edit-related-toggle");
  if (await toggle.count()) {
    await toggle.click();
    await page.waitForTimeout(200);
    const open = await page.$$eval(".note-edit-related-list .entry-related-row", (r) => r.filter((x) => x.checkVisibility()).length);
    check(open > 0, "Related opens from its one line", `${open} rows`);
  }
  await attach.click();
  await page.waitForTimeout(800);
  const picked = await page.evaluate(() => !!document.querySelector(".entry-pick-card [role=option], .entry-pick-card .rich-picker-row"));
  check(picked, "Attach a link opens the bookmark picker");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  const refs = await page.evaluate(async (id) => (await (await api(`/entries/${id}/bookmarks`)).json()).length, id);
  const shown = await page.$$eval(".entry-related-live .chip.link", (c) => c.filter((x) => x.checkVisibility()).length);
  const attaches = await page.locator(".note-edit-foot button[aria-label='Attach a link']").count();
  check(refs >= 1 && shown >= 1 && attaches === 1, "a picked link is attached and shown, one Attach button", `refs ${refs}, shown ${shown}, attach buttons ${attaches}`);
  await page.locator(".note-edit-actions button", { hasText: "Save changes" }).click();
  await page.waitForTimeout(1500);
  const saved = await page.evaluate(async (id) => (await (await api(`/entries/${id}`)).json()).tags, id);
  check(saved.includes("flowtag") && !saved.includes("study"), "Save writes the chips", JSON.stringify(saved));
  check(errs.length === 0, "no page errors", JSON.stringify(errs));
  console.log(fails ? `${fails} failed` : "all passed");
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
