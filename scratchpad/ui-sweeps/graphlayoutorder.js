// **Tree, radial and arc lay out a notebook whose reply comes before its
// parent** (INBOX 579, the owner's log: `undefined.push` in layoutHierarchy).
// Also a reply loop (A answers B answers A) must not hang the layout.
//   BASE=http://127.0.0.1:8811 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/graphlayoutorder.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  let failed = 0;
  const out = await page.evaluate(async () => {
    if (typeof layoutHierarchy !== "function" && typeof ensureModule === "function") await ensureModule("graph");
    if (typeof layoutHierarchy !== "function") return { missing: true };
    const mk = () => [
      { id: 2, parent_id: 1, category: "Work", preview: "reply" },
      { id: 1, parent_id: null, category: "Work", preview: "parent" },
      { id: 3, parent_id: 4, category: "Home", preview: "loop a" },
      { id: 4, parent_id: 3, category: "Home", preview: "loop b" },
    ];
    const res = {};
    for (const kind of ["tree", "radial", "arc"]) {
      try {
        const nodes = mk();
        layoutHierarchy(nodes, kind, 800, 600);
        res[kind] = nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y)) ? "ok" : "unplaced";
      } catch (e) {
        res[kind] = String(e);
      }
    }
    return res;
  });
  if (out.missing) { console.log("FAIL layoutHierarchy not loaded"); failed++; }
  else for (const [k, v] of Object.entries(out)) { const ok = v === "ok"; console.log(`${ok ? "PASS" : "FAIL"} ${k}: ${v}`); if (!ok) failed++; }
  await browser.close();
  console.log(failed ? `${failed} failed` : "all passed");
  process.exit(failed ? 1 : 0);
})();
