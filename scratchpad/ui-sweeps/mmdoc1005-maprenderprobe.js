// FEAT-02 probe: what a render and a forced layout cost at N topics, idle.
const { boot } = require("./lib.js");
const N = Number(process.env.N || 301);
function outline(n) {
  const lines = ["# Probe " + n, "", "- Centre"];
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
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async (content) => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content }) });
    await openWhiteboardBoard(b.id);
    if (typeof wbMapTidyFresh === "function") await wbMapTidyFresh();
  }, outline(N));
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => {
    const t = (fn) => { const a = performance.now(); fn(); return Math.round(performance.now() - a); };
    const r = {};
    r.render1 = t(() => renderWhiteboardNow());
    {
      const muts = [];
      const mo = new MutationObserver((list) => muts.push(...list));
      mo.observe(document.body, { subtree: true, attributes: true, attributeOldValue: true, childList: true, characterData: true });
      renderWhiteboardNow();
      muts.push(...mo.takeRecords());
      mo.disconnect();
      const summary = {};
      for (const m of muts) {
        const tgt = m.target.nodeType === 1 ? m.target : m.target.parentElement;
        const now = m.type === "attributes" ? tgt.getAttribute(m.attributeName) : null;
        if (m.type === "attributes" && now === m.oldValue) continue;
        const key = `${m.type}:${m.attributeName || ""}:${(tgt.className && typeof tgt.className === "string" ? tgt.className.split(" ")[0] : tgt.tagName)}`;
        summary[key] = (summary[key] || 0) + 1;
      }
      r.noopRenderMutations = Object.entries(summary).sort((a, b) => b[1] - a[1]).slice(0, 15);
      const sameValue = {};
      for (const m of muts) {
        if (m.type !== "attributes") continue;
        const tgt = m.target;
        if (tgt.getAttribute(m.attributeName) !== m.oldValue) continue;
        const key = `${m.attributeName}:${(typeof tgt.className === "string" ? tgt.className.split(" ")[0] : tgt.tagName)}`;
        sameValue[key] = (sameValue[key] || 0) + 1;
      }
      r.noopSameValueWrites = Object.entries(sameValue).sort((a, b) => b[1] - a[1]).slice(0, 15);
    }
    r.render2 = t(() => renderWhiteboardNow());
    const el = document.querySelector("#wb-html-layer .wb-object");
    r.layoutAfterOneClass = t(() => { el.classList.toggle("probe-x"); void el.offsetHeight; });
    r.layoutAfterTransform = t(() => { el.style.transform += " translate(1px,0)"; void el.offsetHeight; });
    const pick = (wbState.objects || []).find((o) => o.data?.content === "Branch 3");
    r.select = t(() => selectWbItem("object", pick.id));
    r.layoutAfterSelect = t(() => void el.offsetHeight);
    r.highlight = t(() => wbApplySelectionHighlight());
    r.contextBar = t(() => wbUpdateSelectionBar());
    r.idx = t(() => wbMapIndex());
    r.tidyPositions = t(() => wbMapTidyPositions(wbMapIndex(), wbMapLayout()));
    r.edges = t(() => wbRenderMapEdges());
    r.styleOnly = t(() => { el.classList.toggle("probe-y"); void getComputedStyle(el).color; });
    r.layoutAgain = t(() => void el.offsetHeight);
    r.layoutAfterOneClass2 = t(() => { el.classList.toggle("probe-x"); void el.offsetHeight; });
    const cs = getComputedStyle(el);
    r.css = { position: cs.position, contain: cs.contain, cv: cs.contentVisibility, display: cs.display };
    const layer = document.getElementById("wb-html-layer");
    const ls = getComputedStyle(layer);
    r.layer = { position: ls.position, display: ls.display, contain: ls.contain };
    for (const o of layer.querySelectorAll(":scope > .wb-object")) o.style.contain = "layout style";
    void el.offsetHeight;
    r.containedClass = t(() => { el.classList.toggle("probe-x"); void el.offsetHeight; });
    r.containedClass2 = t(() => { el.classList.toggle("probe-x"); void el.offsetHeight; });
    r.nodes = document.querySelectorAll("#wb-html-layer .wb-object").length;
    r.descendants = document.querySelectorAll("#wb-html-layer *").length;
    return r;
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
