// Rows view: the date and the metadata lane must not overlap.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => { switchTab("notes"); window.showNotesSection && showNotesSection("browse"); notesViewMode = "rows"; renderEntries(); });
  await page.waitForTimeout(1500);
  console.log(JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("#entry-list.is-rows > li[data-id]")].slice(0, 3).map((li) => {
    const d = li.querySelector(".entry-date")?.getBoundingClientRect();
    const m = [...li.querySelectorAll(":scope > .entry-meta > *:not(.entry-meta-end)")].map((e) => e.getBoundingClientRect()).filter((r) => r.height);
    const top = Math.min(...m.map((r) => r.top));
    return { dateBottom: d && Math.round(d.bottom), metaTop: Math.round(top), gap: d ? Math.round(top - d.bottom) : null, rowH: Math.round(li.getBoundingClientRect().height) };
  }))));
  await browser.close();
})();
