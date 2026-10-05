// fe1005: what a save, a bin and its undo cost on a big notebook (audit
// 2026-10-05, FE-05). Each should be one /entries request, not a page-through
// of the whole notebook, and the list, the count and the sidebar follow.
//   BASE=http://127.0.0.1:8842 node fe1005-save.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => localStorage.setItem("activeTab", "notes"));
  await page.click('[data-tab="notes"]').catch(() => {});
  await page.waitForFunction(() => typeof entriesComplete !== "undefined" && entriesComplete, null, { timeout: 120000 });
  const seen = [];
  page.on("request", (r) => {
    if (/\/entries(\?|$)/.test(r.url())) seen.push(r.url().split("/entries")[1]);
  });
  await page.evaluate(() => {
    window.__longTasks = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__longTasks.push(Math.round(e.duration));
    }).observe({ type: "longtask", buffered: false });
  });
  const measure = async (label, fn) => {
    seen.length = 0;
    await page.evaluate(() => (window.__longTasks = []));
    const before = await page.evaluate(() => allEntries.length);
    const t0 = Date.now();
    const detail = await page.evaluate(fn);
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => allEntries.length);
    const longTasks = await page.evaluate(() => window.__longTasks);
    console.log(
      JSON.stringify({ label, ms: Date.now() - t0 - 1500, listRequests: seen, before, after, longTasks, detail })
    );
  };
  await measure("save", async () => {
    $("entry-content").value = "fe1005 probe note " + Date.now();
    $("entry-content").dispatchEvent(new Event("input", { bubbles: true }));
    await saveEntry();
    return { top: allEntries[0] && allEntries[0].content.slice(0, 30) };
  });
  await measure("bin", async () => {
    const entry = allEntries.find((e) => e.content.startsWith("fe1005 probe note"));
    await binNoteWithUndo(entry);
    return { stillThere: allEntries.some((e) => e.id === entry.id), shown: !!document.querySelector(`#entry-list li[data-id="${entry.id}"]`) };
  });
  await measure("undo", async () => {
    await performUndo();
    const back = allEntries.find((e) => e.content.startsWith("fe1005 probe note"));
    return { back: !!back, first: allEntries[0] && allEntries[0].id === (back && back.id) };
  });
  await measure("full loadEntries", async () => {
    await loadEntries();
    return null;
  });
  await browser.close();
})();
