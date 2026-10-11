// mapfixmenu: a topic's Shape door never covers the topic it edits.
const { boot, openBoardsTab } = require(process.env.WT + "/scratchpad/ui-sweeps/lib.js");
(async () => {
  let fails = 0;
  for (const [W, H] of [[1440, 900], [1440, 560], [1440, 420], [390, 844], [390, 600]]) {
    const { browser, page } = await boot({ viewport: { width: W, height: H } });
    await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
    await openBoardsTab(page);
    await page.evaluate(async () => {
      const content = ["# Fix", "- Trunk", "  - Branch A", "    - Leaf A1", "  - Branch B", "  - Branch C"].join("\n");
      const board = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content, name: "Fix " + Date.now() }) });
      await openWhiteboardBoard(board.id);
      await new Promise((r) => setTimeout(r, 1500));
      await wbMapTidy({ quiet: true });
      await new Promise((r) => setTimeout(r, 600));
    });
    for (const label of ["Trunk", "Branch A", "Leaf A1", "Branch C"]) {
      for (const door of ["wb-map-shape-menu", "wb-map-text-menu", "wb-map-line-menu"]) {
        const r = await page.evaluate(async ({ label, door }) => {
          const n = wbMapIndex().nodes.find((x) => (x.data?.content || "").includes(label));
          if (door === "wb-map-line-menu" && n.parent_id == null) return null;
          if (typeof wbCenterOnObject === "function") wbCenterOnObject(n.id);
          selectWbItem("object", n.id);
          await new Promise((r) => setTimeout(r, 350));
          document.querySelector(`[aria-controls="${door}"]`).click();
          await new Promise((r) => setTimeout(r, 350));
          const el = document.querySelector(`.wb-object[data-id="${n.id}"]`);
          const t = el.getBoundingClientRect();
          const m = document.getElementById(door).getBoundingClientRect();
          const hit = !(m.left >= t.right || m.right <= t.left || m.top >= t.bottom || m.bottom <= t.top);
          const inView = m.left >= 0 && m.top >= 0 && m.right <= innerWidth && m.bottom <= innerHeight + 1;
          document.querySelector(`[aria-controls="${door}"]`).click();
          return { hit, inView, h: Math.round(m.height) };
        }, { label, door });
        if (!r) continue;
        if (r.hit || !r.inView) { fails++; console.log(`FAIL ${W}x${H} ${label} ${door}`, JSON.stringify(r)); }
      }
    }
    console.log(`done ${W}x${H}`);
    await browser.close();
  }
  {
    //: INBOX 814 part 1: a change paints on the selected topic at once, and
    //: part 4: one selected look, one reset look.
    const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
    await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
    await openBoardsTab(page);
    const out = await page.evaluate(async () => {
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const content = ["# Fix", "- Trunk", "  - Branch A"].join("\n");
      const board = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content, name: "Fix " + Date.now() }) });
      await openWhiteboardBoard(board.id); await wait(1500); await wbMapTidy({ quiet: true }); await wait(600);
      const n = wbMapIndex().nodes.find((x) => (x.data?.content || "").includes("Branch A"));
      selectWbItem("object", n.id); await wait(350);
      document.querySelector('[aria-controls="wb-map-shape-menu"]').click(); await wait(350);
      const el = document.querySelector(`.wb-object[data-id="${n.id}"]`);
      const read = () => { const c = getComputedStyle(el); return { br: c.borderRadius, bg: c.backgroundColor, sh: c.boxShadow, selected: el.classList.contains("wb-selected") }; };
      const press = async (name) => { document.querySelector(`#wb-map-shape-menu button[aria-label="${name}"]`).click(); await wait(300); return read(); };
      const res = { steps: [] };
      let prev = read();
      for (const [name, key] of [["Ellipse", "br"], ["No fill", "bg"], ["Glow", "sh"]]) {
        const now = await press(name);
        res.steps.push({ name, key, before: prev[key], after: now[key], changed: prev[key] !== now[key], stillSelected: now.selected });
        prev = now;
      }
      const menu = document.getElementById("wb-map-shape-menu");
      const bgs = [...menu.querySelectorAll(".wb-map-pick.active")].map((b) => getComputedStyle(b).backgroundColor);
      res.selectedBgs = [...new Set(bgs)];
      res.selectedCount = bgs.length;
      const resets = [...menu.querySelectorAll(".wb-map-pick-follow"), document.getElementById("wb-map-reset")].filter(Boolean);
      res.resetColors = [...new Set(resets.map((b) => getComputedStyle(b).color))];
      res.resetCount = resets.length;
      res.mutedInk = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim();
      return res;
    });
    for (const st of out.steps) {
      const bad = !st.changed || !st.stillSelected;
      if (bad) fails++;
      console.log(`${bad ? "FAIL" : "ok"} paint ${st.name}: ${st.key} ${st.before} -> ${st.after}`);
    }
    if (out.selectedBgs.length !== 1) { fails++; console.log("FAIL selected looks", JSON.stringify(out.selectedBgs)); }
    if (out.resetColors.length !== 1) { fails++; console.log("FAIL reset looks", JSON.stringify(out.resetColors)); }
    console.log(`selected looks ${out.selectedBgs.length} over ${out.selectedCount} buttons; reset colours ${out.resetColors.length} over ${out.resetCount} (--muted ${out.mutedInk})`);
    await browser.close();
  }
  console.log(fails ? `FAIL: ${fails}` : "PASS: no door covers its topic");
  process.exit(fails ? 1 : 0);
})();
