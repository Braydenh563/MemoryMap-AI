// The graph node popup opens with its body rendered (the note editor mounted
// on open, its bundle fetched on demand), and the Notes capture box gets the
// editor on its first focus from a fresh boot with the Library never visited.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  const out = {};
  // 1. Fresh boot, Notes tab, focus capture: editor mounts without Library.
  await page.evaluate(() => document.querySelector('[data-tab="notes"]')?.click());
  await page.waitForTimeout(600);
  out.libraryLoadedBefore = await page.evaluate(() => typeof mountNoteSurface === "function");
  await page.evaluate(() => {
    const tab = [...document.querySelectorAll("#notes-subtabs button")].find((b) => /capture/i.test(b.textContent));
    if (tab) tab.click();
  });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.getElementById("entry-content")?.focus());
  out.activeAfterFocus = await page.evaluate(() => document.activeElement?.id);
  await page.waitForTimeout(2500);
  out.libraryLoadedAfter = await page.evaluate(() => typeof mountNoteSurface === "function");
  out.captureMounted = await page.evaluate(() => Boolean(document.querySelector("#entry-content")?.closest(".note-surface")));
  // 2. Graph tab, open the first node's popup programmatically.
  await page.evaluate(() => document.querySelector('[data-tab="graph"]')?.click());
  await page.waitForTimeout(3000);
  out.opened = await page.evaluate(async () => {
    const node = (graphNodesRef || []).find((n) => /!\[/.test(n.preview || "") ) || (graphNodesRef || [])[0];
    if (!node) return "no nodes";
    await openGraphPopup({ clientX: 500, clientY: 300, stopPropagation() {}, preventDefault() {} }, node);
    return node.id;
  });
  await page.waitForTimeout(2500);
  out.popup = await page.evaluate(() => {
    const box = document.getElementById("graph-popup-content");
    const wrap = box?.closest(".note-surface");
    const content = wrap?.querySelector(".cm-content");
    return {
      mounted: Boolean(wrap),
      hidden: document.getElementById("graph-popup").classList.contains("hidden"),
      active: document.activeElement?.id,
      text: (content?.textContent || box?.value || "").slice(0, 80),
      images: content ? content.querySelectorAll("img").length : -1,
      rawMarks: content ? (content.textContent.match(/\*\*|^# |!\[/gm) || []).length : -1,
    };
  });
  out.errors = await page.evaluate(() => (window.__consoleErrors || []).slice(0, 3));
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
