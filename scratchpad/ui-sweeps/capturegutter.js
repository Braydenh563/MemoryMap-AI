// Capture's Preview: the line-number gutter must hide with the text box.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => { localStorage.setItem("doc-gutter", "1"); applyDocGutter(); switchTab("notes"); window.showNotesSection && showNotesSection("capture"); });
  await page.waitForTimeout(800);
  const out = await page.evaluate(async () => {
    const box = document.getElementById("entry-content");
    box.value = "test\ntest"; box.dispatchEvent(new Event("input", { bubbles: true }));
    const g = box.closest(".gutter-wrap")?.querySelector(".doc-gutter") || document.querySelector("#capture .doc-gutter");
    const before = g && getComputedStyle(g).display;
    setEntryPreview(true);
    await new Promise((r) => setTimeout(r, 300));
    const r = g?.getBoundingClientRect();
    return { wrapParent: box.parentElement.className, gutterParent: g?.parentElement.className, before, after: g && getComputedStyle(g).display, w: r && Math.round(r.width), h: r && Math.round(r.height) };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
