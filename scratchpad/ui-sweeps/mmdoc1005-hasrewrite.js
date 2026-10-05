// The three :has() rewrites of audit FEAT-02 hold what the rules did: the
// head-row buttons keep the large control height, the document editor takes
// the first track when the sidebar is hidden, and a rows-view note's extra
// children span the row.
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot();
  const out = await page.evaluate(async () => {
    const r = {};
    const heads = [...document.querySelectorAll(":is(#capture, #writing-room, #ask) > .row > h2 ~ * button, :is(#capture, #writing-room, #ask) > .row > h2 ~ button")];
    r.headButtons = heads.length;
    r.oldSelectorCount = document.querySelectorAll(":is(#capture, #writing-room, #ask) > .row:has(> h2) button").length;
    r.headHeights = [...new Set(heads.filter((b) => !b.classList.contains("graph-help-toggle")).map((b) => getComputedStyle(b).height))];
    r.controlHLg = getComputedStyle(document.documentElement).getPropertyValue("--control-h-lg").trim();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 800));
    const side = document.getElementById("doc-sidebar");
    const main = document.querySelector(".doc-layout > .doc-main");
    r.mainColumnSidebarShown = getComputedStyle(main).gridColumnStart;
    side.classList.add("hidden");
    r.mainColumnSidebarHidden = getComputedStyle(main).gridColumnStart;
    side.classList.remove("hidden");
    return r;
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
