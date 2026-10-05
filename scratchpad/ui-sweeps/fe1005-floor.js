// fe1005: the desktop hit-target floor in the docks (audit 2026-10-05,
// FE-14): every visible button in a dock's segmented control, on each tab,
// at least `--target-min` (28px) tall, and each dock still one height.
//   BASE=http://127.0.0.1:8842 THEME=dark node fe1005-floor.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  const out = {};
  for (const tab of ["notes", "library", "timeline", "reminders", "chat", "graph"]) {
    await page.click(`[data-tab="${tab}"]`).catch(() => {});
    await page.waitForTimeout(1800);
    out[tab] = await page.evaluate(() => {
      const floor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--target-min")) * 16 || 28;
      const shown = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().height > 0;
      const under = [];
      for (const b of document.querySelectorAll(".dock .seg > button, .dock .segmented-control > button")) {
        if (!shown(b)) continue;
        const r = b.getBoundingClientRect();
        if (r.height < floor - 0.5) under.push(`${b.id || b.className}: ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      const docks = [...document.querySelectorAll(".dock")].filter(shown).map((d) => {
        const heights = new Set();
        for (const c of d.querySelectorAll(":scope button, :scope select, :scope input, :scope .seg")) {
          if (shown(c) && !c.closest(".seg > *, details:not([open]) *")) heights.add(Math.round(c.getBoundingClientRect().height));
        }
        return [...heights].join("/");
      });
      return { under, dockHeights: docks };
    });
  }
  //: The documents dock: Edit and Read, with a document open.
  out.documents = await page.evaluate(async () => {
    await ensureModule("library");
    const res = await api("/documents", { method: "POST", body: JSON.stringify({ title: "fe1005 floor", content: "Words." }) });
    const made = (await res.json()).id;
    if (typeof switchTab === "function") await switchTab("documents");
    await openDocument(made);
    await new Promise((r) => setTimeout(r, 1500));
    return [...document.querySelectorAll("#doc-view-seg > button")]
      .filter((b) => b.getBoundingClientRect().height > 0)
      .map((b) => `${b.textContent.trim()}: ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`);
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
