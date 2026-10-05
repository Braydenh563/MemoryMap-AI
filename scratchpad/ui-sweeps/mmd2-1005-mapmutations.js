// FEAT-02: which DOM writes one Tab makes on an N-topic map, grouped by the
// element and attribute, so a write that restyles the whole map (a class or a
// custom property on an ancestor) can be found by name.
//   N=301 BASE=... node scratchpad/ui-sweeps/mmd2-1005-mapmutations.js
const { boot } = require("./lib.js");
const N = Number(process.env.N || 301);
function outline(n) {
  const lines = ["# Mut " + n, "", "- Centre"];
  let made = 1, b = 0;
  while (made < n) {
    lines.push(`  - Branch ${b}`); made++;
    for (let k = 0; k < 9 && made < n; k++, made++) lines.push(`    - Leaf ${b}.${k}`);
    b++;
  }
  return lines.join("\n");
}
(async () => {
  const { page, browser } = await boot();
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(async (content) => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content }) });
    await openWhiteboardBoard(b.id);
    await wbMapTidyFresh();
  }, outline(N));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const pick = (wbState.objects || []).find((o) => o.data?.content === "Branch 3");
    selectWbItem("object", pick.id);
    document.activeElement?.blur?.();
    const log = (window.__mut = []);
    const name = (el) => `${el.tagName?.toLowerCase()}${el.id ? "#" + el.id : ""}${typeof el.className === "string" && el.className ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
    window.__obs = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "attributes") log.push(`attr ${m.attributeName} on ${name(m.target)} (${m.target.closest?.(".wb-object") ? "in a topic" : "outside topics"})`);
        else if (m.type === "childList") log.push(`children of ${name(m.target)} +${m.addedNodes.length}/-${m.removedNodes.length}`);
      }
    });
    window.__obs.observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeOldValue: false });
  });
  await page.waitForTimeout(200);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(700);
  const out = await page.evaluate(() => {
    window.__obs.disconnect();
    const counts = {};
    for (const line of window.__mut) counts[line] = (counts[line] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  });
  for (const [line, n] of out.filter(([l]) => /outside topics|children of/.test(l)).slice(0, 60)) console.log(String(n).padStart(5), line);
  console.log("--- inside topics, top 15");
  for (const [line, n] of out.filter(([l]) => /in a topic/.test(l)).slice(0, 15)) console.log(String(n).padStart(5), line);
  await browser.close();
})();
