// MINDMAP_PLAN §14a/14b gate (mc1): a map draws as a hierarchy by default.
//   BASE=http://127.0.0.1:8798 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mc1-maplevels.js
const { boot } = require("./lib.js");
const results = [];
const check = (label, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
};
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    const content = ["- Centre", "  - Branch one", "    - Leaf a", "    - Leaf b", "  - Branch two", "    - Leaf c"];
    const board = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: content.join("\n"), name: "Levels" }) });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1500));
  });
  const read = () => page.evaluate(() => {
    const index = wbMapIndex();
    const pick = (re) => index.nodes.find((n) => re.test(n.data?.content || ""));
    const m = (n) => {
      const el = document.querySelector(`.wb-object[data-id="${n.id}"]`);
      const t = getComputedStyle(el.querySelector(".wb-map-text"));
      return { font: parseFloat(t.fontSize), weight: Number(t.fontWeight), shape: el.dataset.shape || "", solid: el.classList.contains("wb-map-solid"), level: el.dataset.level, ink: t.color, bg: getComputedStyle(el).backgroundColor };
    };
    return { centre: m(index.roots[0]), branch: m(pick(/Branch one/)), leaf: m(pick(/Leaf a/)) };
  });
  const settle = () => page.waitForTimeout(700);

  let r = await read();
  console.log("    " + JSON.stringify(r));
  check("classic: centre, branch and leaf are three sizes", r.centre.font > r.branch.font && r.branch.font > r.leaf.font, `${r.centre.font} > ${r.branch.font} > ${r.leaf.font}`);
  check("classic: centre and branch bold, leaf not", r.centre.weight >= 600 && r.branch.weight >= 600 && r.leaf.weight < 600);
  check("classic: the centre is solid and a pill", r.centre.solid && r.centre.shape === "pill");
  check("levels painted 0, 1, 2", r.centre.level === "0" && r.branch.level === "1" && r.leaf.level === "2");

  // The ink on the solid centre reads: contrast against its own fill.
  const contrast = await page.evaluate(({ ink, bg }) => {
    const ch = (c) => { const m = c.match(/[\d.]+/g).map(Number); return c.startsWith("color(") ? m.slice(0, 3).map((v) => v * 255) : m.slice(0, 3); };
    const lum = (c) => { const [r, g, b] = ch(c).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const [a, b] = [lum(ink), lum(bg)].sort((x, y) => y - x);
    return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
  }, r.centre);
  check("the centre's ink reads on its fill (4.5:1)", contrast >= 4.5, `${contrast}:1`);

  // Map-wide size reaches the leaves, not the centre.
  await page.evaluate(() => wbMapSetTheme({ font_size: 12 }));
  await settle();
  r = await read();
  check("a map-wide size reaches the leaves and keeps the centre", r.leaf.font === 12 && r.centre.font === 22, `${r.leaf.font}, ${r.centre.font}`);
  await page.evaluate(() => wbMapSetTheme({ font_size: null }));
  await settle();

  // Flat: every level as before.
  await page.evaluate(() => wbMapSetTheme({ hierarchy: "flat" }));
  await settle();
  r = await read();
  check("flat: all three equal", r.centre.font === r.leaf.font && r.branch.font === r.leaf.font && !r.centre.solid, `${r.centre.font}/${r.branch.font}/${r.leaf.font}`);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(1200);
  r = await read();
  check("Undo puts the hierarchy back", r.centre.font === 22, `${r.centre.font}`);

  // Outline: branches are plain.
  await page.evaluate(() => wbMapSetTheme({ hierarchy: "outline" }));
  await settle();
  r = await read();
  check("outline: a branch is text on its line", r.branch.shape === "none" && r.leaf.shape === "none");
  await page.evaluate(() => wbMapSetTheme({ hierarchy: null }));
  await settle();

  // A level's own look, and a topic's own beats it.
  await page.evaluate(() => wbMapSetTheme({ levels: { "1": { font_size: 25, italic: true } } }));
  await settle();
  r = await read();
  check("a level's own look reaches its topics", r.branch.font === 25, `${r.branch.font}`);
  await page.evaluate(async () => {
    const index = wbMapIndex();
    const two = index.nodes.find((n) => /Branch two/.test(n.data?.content || ""));
    await wbMapSetNodeStyle(two, { font_size: 12 });
    renderWhiteboardNow();
  });
  await settle();
  const own = await page.evaluate(() => {
    const two = wbMapIndex().nodes.find((n) => /Branch two/.test(n.data?.content || ""));
    return parseFloat(getComputedStyle(document.querySelector(`.wb-object[data-id="${two.id}"] .wb-map-text`)).fontSize);
  });
  check("a topic's own size beats its level's", own === 12, `${own}`);

  // Enter on the centre adds a main branch.
  const kids = await page.evaluate(async () => {
    const index = wbMapIndex();
    const centre = index.roots[0];
    const before = (index.childrenOf.get(centre.id) || []).length;
    await wbMapAddSibling(centre.id);
    await new Promise((r) => setTimeout(r, 600));
    const after = wbMapIndex();
    return { before, after: (after.childrenOf.get(centre.id) || []).length, roots: after.roots.length };
  });
  check("Enter on the centre adds a main branch, not a second centre", kids.after === kids.before + 1 && kids.roots === 1, JSON.stringify(kids));

  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
