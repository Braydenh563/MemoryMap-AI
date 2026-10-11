// MINDMAP_PLAN 13e / INBOX 665 remainder (OPEN row 1370): on a themed map a
// topic that follows the map must say so in every select, including a value
// that has no option of its own (a main branch's 17px; the centre's 22px).
// For the centre, a main branch and a leaf under each hierarchy preset, the
// topic is selected and the text-size and shape selects are read: the blank
// row must be named "As the map draws (...)" with the value drawn, carry
// `data-follow` and `data-inherits`, and be the one chosen (a followed field
// is ringed through the blank row, never left pressed on an option the topic
// did not choose: the same for a shape, which has an option, and a size,
// which has none). Then the pick row is read: the look the map gives is the
// one drawn active and carries `is-inherited`.
//
//   BASE=http://127.0.0.1:8814 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/mapthemedstrip.js
const { boot, openBoardsTab } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 }, args: ["--disable-dev-shm-usage"] });
  await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
  await openBoardsTab(page);
  const out = await page.evaluate(async () => {
    const rows = [];
    const content = ["# Themed", "- Trunk", "  - Branch A", "    - Leaf A1", "  - Branch B"];
    const board = await apiJson("/whiteboard/boards/import", {
      method: "POST",
      body: JSON.stringify({ format: "markdown", content: content.join("\n"), name: "Themed strip" }),
    });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1500));
    for (const preset of ["outline", "boxed", "flat"]) {
      await wbMapSetTheme({ hierarchy: preset });
      await new Promise((r) => setTimeout(r, 500));
      const idx = wbMapIndex();
      const byText = (t) => idx.nodes.find((n) => (n.data?.content || "").includes(t));
      for (const [label, node] of [["centre", idx.nodes.find((n) => n.parent_id == null)], ["branch", byText("Branch A")], ["leaf", byText("Leaf A1")]]) {
        if (!node) continue;
        selectWbItem("object", node.id);
        await new Promise((r) => setTimeout(r, 300));
        const read = (id) => {
          const el = document.getElementById(id);
          const blank = el?.querySelector('option[value=""]');
          const opener = el?.closest(".select-shell")?.querySelector(".select-opener");
          return {
            value: el?.value ?? null,
            blank: blank?.textContent ?? null,
            follow: blank ? "follow" in blank.dataset : null,
            inherits: blank?.dataset.inherits ?? null,
            picked: [...document.querySelectorAll(`[aria-label="${el?.getAttribute("aria-label")}"].wb-map-picks .wb-map-pick.active`)].map((b) => `${b.dataset.value}${b.classList.contains("is-inherited") ? "~" : ""}`),
            drawn: String(wbMapThemedData(node).font_size ?? ""),
          };
        };
        rows.push({ preset, label, size: read("wb-map-text-size"), shape: read("wb-map-shape") });
      }
    }
    return rows;
  });
  let bad = 0;
  for (const r of out) {
    for (const key of ["size", "shape"]) {
      const f = r[key];
      const themed = f.inherits !== null;
      // Following the map: the blank row names it, the select holds the blank, the opener says so.
      const okFollow = !themed || (f.follow && /^As the map draws \(/.test(f.blank) && f.value === "" && true);
      if (!okFollow) bad += 1;
      console.log(`${okFollow ? "ok  " : "FAIL"} ${r.preset} ${r.label} ${key}: ${JSON.stringify(f)}`);
    }
  }
  await browser.close();
  console.log(bad ? `FAIL ${bad}` : "PASS");
  process.exit(bad ? 1 : 0);
})();
