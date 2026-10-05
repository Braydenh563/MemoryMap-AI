// perf2-1005 (audit FE-11, the 900 group): what the six 900px queries change,
// at the widths around them. The header (does it overflow, is the space
// switcher's name and the AI mark shown), the documents layout, the writing
// room's two columns. Run before and after moving the group.
//   BASE=http://127.0.0.1:8859 node perf2-1005-bp900.js
const { boot } = require("./lib.js");
(async () => {
  const out = {};
  for (const width of (process.env.WIDTHS || "820,860,899,900,901,1024").split(",").map(Number)) {
    const { browser, page } = await boot({ viewport: { width, height: 800 } });
    out[width] = await page.evaluate(async () => {
      const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== "none";
      const header = document.querySelector("header, .app-header, #app-header");
      const tabs = document.getElementById("tab-bar");
      const overflowing = header ? header.scrollWidth > header.clientWidth + 1 : null;
      const items = header ? [...header.querySelectorAll("button, a, .space-switcher-btn, #tab-bar")].filter(shown).map((e) => e.getBoundingClientRect()) : [];
      let overlaps = 0;
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i], b = items[j];
        const inside = (a.left >= b.left && a.right <= b.right && a.top >= b.top && a.bottom <= b.bottom) || (b.left >= a.left && b.right <= a.right && b.top >= a.top && b.bottom <= a.bottom);
        if (!inside && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++;
      }
      const name = document.querySelector(".space-switcher-name");
      const mark = document.querySelector(".emblem-mark");
      await ensureModule("library");
      await switchTab("documents");
      await new Promise((r) => setTimeout(r, 1200));
      const docLayout = document.querySelector(".doc-layout");
      const docCols = docLayout ? getComputedStyle(docLayout).gridTemplateColumns.split(" ").length : null;
      const draft = document.querySelector(".draft-columns");
      const draftCols = draft ? getComputedStyle(draft).gridTemplateColumns.split(" ").length : null;
      return {
        headerOverflow: overflowing,
        headerOverlaps: overlaps,
        tabsRight: tabs ? Math.round(tabs.getBoundingClientRect().right) : null,
        spaceName: shown(name),
        mark: shown(mark),
        docCols,
        draftCols,
        hScroll: document.documentElement.scrollWidth > innerWidth,
      };
    });
    await browser.close();
  }
  console.log(JSON.stringify(out));
})();
