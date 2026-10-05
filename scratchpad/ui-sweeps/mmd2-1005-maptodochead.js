// The audit's M5, second half (MINDMAP_PLAN decision 35): a document's
// menu, Map the headings, makes a mind map of its headings with a topic that
// leads back to the document.
//
//   BASE=http://127.0.0.1:8858 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmd2-1005-maptodochead.js   (THEME=dark, W=390)
const { boot } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  const docId = await page.evaluate(async () => {
    const doc = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Field guide", content: "# Field guide\n\nWhy.\n\n## Birds\n\n### Owls\n\n### Finches\n\n## Trees\n\n```\n# not this\n```\n" }) });
    switchTab("documents");
    await openDocument(doc.id);
    return doc.id;
  });
  await page.waitForTimeout(1500);
  const row = await page.evaluate(() => {
    const el = document.getElementById("doc-map-headings");
    const cmd = DOC_COMMANDS.find((c) => c.id === "map-headings");
    return { row: Boolean(el), words: el?.textContent.trim(), palette: Boolean(cmd) };
  });
  check("the document's menu and the palette offer Map the headings", row.row && row.palette && row.words === "Map the headings", JSON.stringify(row));
  await page.evaluate(() => document.getElementById("doc-map-headings").click());
  await page.waitForTimeout(3000);
  const map = await page.evaluate(async () => {
    const tree = await apiJson(`/whiteboard/boards/${window.currentBoardId}/tree`);
    const shape = (n) => `${n.kind === "topic" ? n.text : n.kind}${n.children.length ? `(${n.children.map(shape).join(",")})` : ""}`;
    const view = document.getElementById("library-view-whiteboard");
    return {
      isMap: wbIsMap(), shown: Boolean(view && !view.classList.contains("hidden")),
      shape: tree.roots.map(shape).join(" | "), layout: wbMapLayout(),
    };
  });
  check("a new map opens, laid out, with the headings as its tree and a way back",
    map.isMap && map.shown && map.shape === "Field guide(Birds(Owls,Finches),Trees,document)" && map.layout === "tree-right",
    JSON.stringify(map));
  const back = await page.evaluate(async (id) => {
    const ref = wbMapIndex().nodes.find((n) => n.kind === "document");
    const el = document.querySelector(`.wb-object[data-id="${ref.id}"]`);
    const label = el?.querySelector(".wb-map-text")?.textContent;
    return { ref: ref.data.ref_id === id, label };
  }, docId);
  check("the way back is a document topic named after the document", back.ref && back.label === "Field guide", JSON.stringify(back));
  const empty = await page.evaluate(async () => {
    const doc = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Plain", content: "Just words." }) });
    switchTab("documents");
    await openDocument(doc.id);
    await new Promise((r) => setTimeout(r, 800));
    const before = window.currentBoardId;
    document.getElementById("doc-map-headings").click();
    await new Promise((r) => setTimeout(r, 900));
    const t = [...document.querySelectorAll(".toast")].map((x) => x.textContent).join(" ");
    return { said: /no headings/.test(t), stayed: window.currentBoardId === before };
  });
  check("a document with no headings says so and makes nothing", empty.said && empty.stayed, JSON.stringify(empty));
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
