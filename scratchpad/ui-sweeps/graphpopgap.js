// Graph popup: the gap between the note's text box and the tags field.
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => switchTab("graph"));
  await page.waitForTimeout(2500);
  const out = await page.evaluate(async () => {
    const e = (typeof entriesCache !== "undefined" && entriesCache[0]) || (await apiJson("/entries?limit=1"))[0];
    await openGraphPopup({ stopPropagation() {}, preventDefault() {}, clientX: 300, clientY: 300 }, { id: e.id, x: 200, y: 200 });
    await new Promise((r) => setTimeout(r, 600));
    const tags = document.getElementById("graph-popup-tags");
    const prev = tags.previousElementSibling;
    const a = prev.getBoundingClientRect(), b = tags.getBoundingClientRect();
    return { prev: prev.tagName + "." + prev.className, gap: Math.round(b.top - a.bottom), tagsMarginTop: getComputedStyle(tags).marginTop, prevMarginBottom: getComputedStyle(prev).marginBottom, textarea: getComputedStyle(document.getElementById("graph-popup-content")).marginBottom };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
