// Audit brief M5 (first half): a map written as a document. The board menu's
// row (maps only) and the palette row make a document whose title is the
// central topic, branches headings, deeper topics lists, with the map's card
// at its head, and open it.
//
//   BASE=http://127.0.0.1:8844 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmdoc1005-maptodoc.js   (THEME=dark)
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Doc map\n\n- Trip plan\n  - Pack\n    - Passport\n      - Check expiry\n  - Book" }) });
    await openWhiteboardBoard(b.id);
  });
  await page.waitForTimeout(800);
  const row = await page.evaluate(() => {
    const el = document.getElementById("wb-map-to-doc");
    return { exists: Boolean(el), onMap: !el?.closest("[data-wb-surface]")?.hidden && !el?.closest(".hidden[data-wb-surface]") };
  });
  check("the board menu offers Write as a document on a map", row.exists && row.onMap, JSON.stringify(row));
  await page.evaluate(() => document.getElementById("wb-map-to-doc").click());
  await page.waitForTimeout(2500);
  const doc = await page.evaluate(() => ({
    tab: document.getElementById("tab-documents")?.classList.contains("hidden") === false,
    title: currentDoc?.title,
    text: docText(),
  }));
  check("it opens a new document titled after the central topic", doc.tab && doc.title === "Trip plan", JSON.stringify({ tab: doc.tab, title: doc.title }));
  check("branches are headings, deeper topics lists, the map's card at the head",
    /^!\[\[map:\d+\|Doc map\]\]/.test(doc.text) && doc.text.includes("## Pack") && doc.text.includes("### Passport") && doc.text.includes("- Check expiry") && doc.text.includes("## Book"),
    JSON.stringify(doc.text));
  const embed = await page.evaluate(async () => {
    setDocView("rendered");
    renderDocPreview();
    await new Promise((r) => setTimeout(r, 600));
    return Boolean(document.querySelector("#doc-preview .board-embed-open, #doc-preview .note-embed"));
  });
  check("the card leads back to the map", embed);
  const boardMenu = await page.evaluate(async () => {
    switchTab("library");
    await new Promise((r) => setTimeout(r, 400));
    const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Plain board", type: "board" }) });
    await openWhiteboardBoard(b.id);
    await new Promise((r) => setTimeout(r, 500));
    const el = document.getElementById("wb-map-to-doc");
    return el.checkVisibility ? !el.closest("[data-wb-surface]").classList.contains("hidden") && !el.closest("[data-wb-surface]").hidden : null;
  });
  check("and not on a plain board", boardMenu === false, String(boardMenu));
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  await browser.close();
})();
