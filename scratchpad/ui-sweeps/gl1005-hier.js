// gl1005: layoutHierarchy against the shapes a real notebook has and a seeded
// one does not: a reply listed before the note it answers, a reply to itself,
// a two-note cycle, non-note nodes (entities, topics, maps) with no category.
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot();
  await page.evaluate(() => document.getElementById("tab-btn-graph")?.click());
  await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const n = (id, extra = {}) => ({ id, category: "A", preview: String(id), ...extra });
    const cases = {
      replyFirst: [n(2, { parent_id: 1 }), n(1)],
      selfReply: [n(1, { parent_id: 1 }), n(2)],
      cycle: [n(1, { parent_id: 2 }), n(2, { parent_id: 1 }), n(3)],
      noCategory: [n(1), { id: "entity:7", type: "entity", preview: "x" }, { id: "topic:3", type: "topic", preview: "t", category: undefined }],
    };
    const res = {};
    for (const [name, nodes] of Object.entries(cases)) {
      for (const kind of ["tree", "radial", "arc"]) {
        try {
          const r = layoutHierarchy(nodes.map((x) => ({ ...x })), kind, 1200, 800);
          res[`${name}/${kind}`] = `ok ${r.nodes.length}`;
        } catch (e) {
          res[`${name}/${kind}`] = `THROWS ${e.name}: ${e.message}`;
        }
      }
    }
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
