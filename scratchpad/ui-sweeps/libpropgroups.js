// INBOX 273 (2) follow-through: the Library's document-property filter used
// to fake grouping in flat option text ("status: draft (2)") because the
// shared select opener could not draw a real <optgroup> label. Now that it
// can, renderLibraryDocsPropertyFilter groups for real. Calls the live
// function with synthetic documents and reads what actually rendered.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(500);
  const result = await page.evaluate(() => {
    const docs = [
      { id: 1, properties: { status: ["draft"] } },
      { id: 2, properties: { status: ["draft"] } },
      { id: 3, properties: { status: ["final"] } },
      { id: 4, properties: { area: ["work"] } },
    ];
    renderLibraryDocsPropertyFilter(docs);
    const select = document.getElementById("library-docs-property");
    const groups = [...select.querySelectorAll("optgroup")].map((g) => ({
      label: g.label,
      options: [...g.children].map((o) => o.textContent),
    }));
    const opener = select.closest(".select-shell")?.querySelector(".select-opener");
    opener?.click();
    const menu = select.closest(".select-shell")?.querySelector(".select-menu");
    const menuRows = menu ? [...menu.children].map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: el.className,
      text: el.textContent.trim(),
    })) : null;
    return { topLevelOptionCount: select.querySelectorAll(":scope > option").length, groups, menuRows };
  });
  console.log(JSON.stringify(result, null, 1));
  await browser.close();
})();
