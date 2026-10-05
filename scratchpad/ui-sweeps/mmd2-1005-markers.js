// The audit's M4 (MINDMAP_PLAN §12.2 item 4, decision 34): a topic's
// markers (priority, progress, flag, Phosphor icons), set in one popover,
// drawn before the label, kept, undone, and a View filter that dims the rest.
//
//   BASE=http://127.0.0.1:8858 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmd2-1005-markers.js   (THEME=dark, W=390)
const { boot, OUT } = require("./lib.js");
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
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Marks\n\n- Trip\n  - Pack\n    - Passport\n  - Book\n  - Go" }) });
    await openWhiteboardBoard(b.id);
  });
  await page.waitForTimeout(1200);
  const menuRow = await page.evaluate(() => {
    const pack = wbMapIndex().nodes.find((n) => n.data.content === "Pack");
    selectWbItem("object", pack.id);
    const rows = mapPaletteCommands().map((r) => r.label);
    return { marker: rows.some((l) => /Markers on this topic/.test(l)), filter: rows.some((l) => /Filter by marker/.test(l)), id: pack.id };
  });
  check("the palette offers Markers on a topic and Filter by marker", menuRow.marker && menuRow.filter, JSON.stringify(menuRow));
  await page.evaluate((id) => wbMapOpenMarkers(id), menuRow.id);
  await page.waitForTimeout(400);
  const pop = await page.evaluate(() => {
    const p = document.getElementById("wb-map-markers");
    const r = p?.getBoundingClientRect();
    return { open: Boolean(p), inWindow: r && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, groups: p ? [...p.querySelectorAll("[role=group]")].map((g) => g.getAttribute("aria-label")) : [] };
  });
  check("one popover with Priority, Progress, Flag and Icons, inside the window", pop.open && pop.inWindow && pop.groups.join(",") === "Priority,Progress,Flag,Icons", JSON.stringify(pop));
  const press = async (group, label) => {
    await page.evaluate(([g, l]) => {
      const box = [...document.querySelectorAll("#wb-map-markers [role=group]")].find((x) => x.getAttribute("aria-label") === g);
      const b = [...box.querySelectorAll("button")].find((x) => (x.getAttribute("aria-label") || x.textContent) === l);
      b.click();
    }, [group, label]);
    await page.waitForTimeout(500);
  };
  await press("Priority", "2");
  await press("Progress", "50%");
  await press("Flag", "On");
  await press("Icons", "Star");
  await press("Icons", "Warning");
  const drawn = await page.evaluate((id) => {
    const el = document.querySelector(`.wb-object[data-id="${id}"]`);
    const row = el.querySelector(".wb-map-markers");
    const a = row.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const text = el.querySelector(".wb-map-text").getBoundingClientRect();
    return {
      shown: !row.hidden, marks: row.children.length, label: row.getAttribute("aria-label"),
      inside: a.left >= b.left - 1 && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1,
      beforeText: a.right <= text.left + 1,
      pressed: [...document.querySelectorAll("#wb-map-markers button[aria-pressed=true]")].map((x) => x.getAttribute("aria-label") || x.textContent).join(","),
    };
  }, menuRow.id);
  check("the topic draws its five marks before the label, inside its box, and says them",
    drawn.shown && drawn.marks === 5 && drawn.label === "Priority 2, 50% done, flagged, star, warning" && drawn.inside && drawn.beforeText,
    JSON.stringify(drawn));
  check("the popover shows what is set", drawn.pressed === "2,50%,On,Star,Warning", drawn.pressed);
  const saved = await page.evaluate(async (id) => {
    const state = await apiJson(`/whiteboard/?board_id=${window.currentBoardId}`);
    const o = state.objects.find((x) => x.id === id);
    return o.data;
  }, menuRow.id);
  check("they are saved", saved.priority === 2 && saved.progress === 50 && saved.flag === true && JSON.stringify(saved.markers) === '["star","warning"]', JSON.stringify(saved));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(900);
  const undone = await page.evaluate((id) => ({
    markers: wbMapIndex().byId.get(id).data.markers,
    open: Boolean(document.getElementById("wb-map-markers")),
  }), menuRow.id);
  check("Escape closes it, and Ctrl+Z takes back the last mark", !undone.open && JSON.stringify(undone.markers) === '["star"]', JSON.stringify(undone));
  // The filter.
  await page.evaluate(() => wbMapChooseMarkerFilter());
  await page.waitForTimeout(400);
  const items = await page.evaluate(() => [...document.querySelectorAll(".pointer-menu-host [role=menuitem], .action-menu:not(.hidden) [role=menuitem]")].map((b) => b.textContent.trim()));
  check("Filter by marker lists the markers in use, with counts", items.includes("Priority 2 (1)") && items.includes("Flagged (1)") && items.includes("Star (1)"), JSON.stringify(items));
  await page.evaluate(() => [...document.querySelectorAll(".pointer-menu-host [role=menuitem], .action-menu:not(.hidden) [role=menuitem]")].find((b) => /Flagged/.test(b.textContent)).click());
  await page.waitForTimeout(500);
  const filtered = await page.evaluate((id) => {
    const out = [...document.querySelectorAll(".wb-map-filtered-out")].length;
    const lit = document.querySelector(`.wb-object[data-id="${id}"]`);
    const dim = document.querySelector(".wb-map-filtered-out");
    const bar = document.getElementById("wb-map-filter");
    return {
      out, total: wbMapIndex().nodes.length, litOpacity: getComputedStyle(lit).opacity, dimOpacity: dim ? getComputedStyle(dim).opacity : null,
      bar: !bar.hidden, words: document.getElementById("wb-map-filter-label").textContent,
    };
  }, menuRow.id);
  check("it dims every topic but the flagged one, and says so", filtered.out === filtered.total - 1 && filtered.litOpacity === "1" && Number(filtered.dimOpacity) < 0.5 && filtered.bar && filtered.words === "Marked: Flagged", JSON.stringify(filtered));
  const shot = `${OUT}/mmd2-markers-${W}-${process.env.THEME || "light"}.png`;
  await page.screenshot({ path: shot });
  await page.evaluate(() => document.getElementById("wb-map-filter-clear").click());
  await page.waitForTimeout(400);
  const cleared = await page.evaluate(() => ({ out: document.querySelectorAll(".wb-map-filtered-out").length, bar: !document.getElementById("wb-map-filter").hidden }));
  check("Show all brings every topic back", cleared.out === 0 && !cleared.bar, JSON.stringify(cleared));
  console.log("shot", shot);
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
