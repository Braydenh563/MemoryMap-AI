// INBOX 553(d): the dashboard's Boards & maps widget draws its busiest map
// large, with a height that follows the map's shape. Three maps made here (a
// small one, a wide one, a tall one), each drawn by `dashMapFeature` in the
// widget's own width; then the real widget on the dashboard.
//
//   BASE=http://127.0.0.1:8844 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmdoc1005-dashmap.js   (VIEWPORT=390x844, THEME=dark)
const { boot } = require("./lib.js");
const VIEWPORT = (() => {
  const [w, h] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
  return { width: w, height: h };
})();

(async () => {
  const { page, browser } = await boot({ viewport: VIEWPORT, hasTouch: VIEWPORT.width < 600, isMobile: VIEWPORT.width < 600 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  const outline = (name, shape) => {
    const lines = [`# ${name}`, "", "- Centre"];
    if (shape === "small") lines.push("  - One", "  - Two");
    if (shape === "wide") {
      for (let d = 0; d < 6; d++) lines.push(`${"  ".repeat(d + 1)}- Depth ${d}`);
      // A second branch, or a straight line has no height to have a shape by.
      lines.push("  - Side", "  - Side two");
    }
    if (shape === "tall") for (let k = 0; k < 40; k++) lines.push(`  - Row ${k}`);
    return lines.join("\n");
  };
  const made = await page.evaluate(async (maps) => {
    const out = {};
    for (const [name, content] of maps) {
      const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content }) });
      out[name] = b.id;
    }
    return out;
  }, [["Small map", outline("Small map", "small")], ["Wide map", outline("Wide map", "wide")], ["Tall map", outline("Tall map", "tall")]]);
  // Tidy each so its stored shape is its real one.
  for (const id of Object.values(made)) {
    await page.evaluate(async (id) => {
      await openWhiteboardBoard(id);
      await wbMapTidyFresh();
    }, id);
    await page.waitForTimeout(600);
  }
  await page.evaluate(() => switchTab("dashboard"));
  await page.waitForTimeout(1500);
  const sizes = await page.evaluate(async (made) => {
    await loadMapBoardIndex(true);
    await ensureModule("dashBoards");
    const host = document.querySelector("#dash-grid .dash-widget .dash-widget-body") || document.body;
    const width = Math.min(host.clientWidth || 306, 600);
    const out = {};
    for (const [name, id] of Object.entries(made)) {
      const board = mapBoardRows().find((b) => b.id === id);
      const box = document.createElement("div");
      box.style.width = `${width}px`;
      document.body.appendChild(box);
      const feature = dashMapFeature(board);
      box.appendChild(feature);
      await new Promise((r) => setTimeout(r, 120));
      const svg = feature.querySelector("svg");
      const paper = svg.querySelector(".board-minimap-paper").getBoundingClientRect();
      out[name] = {
        width,
        aspect: Number(board.preview_aspect).toFixed(2),
        items: board.preview_items.length,
        height: Math.round(svg.getBoundingClientRect().height),
        paper: [Math.round(paper.width), Math.round(paper.height)],
      };
      box.remove();
    }
    return out;
  }, made);
  for (const [name, s] of Object.entries(sizes)) console.log(name, JSON.stringify(s));
  const small = sizes["Small map"], wide = sizes["Wide map"], tall = sizes["Tall map"];
  check("a small map is drawn at a readable size, not blown up", small.height <= 168 && small.paper[1] >= 60, `${small.height}px`);
  check("a wide map gets a short card", wide.height < tall.height && wide.height >= 96, `${wide.height}px`);
  check("a tall map gets a taller card, up to the limit", tall.height > small.height && tall.height <= 320, `${tall.height}px`);
  check("and is fitted whole inside it", tall.paper[1] <= tall.height + 1 && tall.paper[0] <= tall.width + 1, JSON.stringify(tall.paper));

  // The real widget: the busiest board drawn large, the rest as rows.
  const widget = await page.evaluate(async () => {
    switchTab("dashboard");
    await new Promise((r) => setTimeout(r, 300));
    const body = document.createElement("div");
    body.style.width = "306px";
    document.body.appendChild(body);
    await renderBoardsWidget(body);
    await new Promise((r) => setTimeout(r, 200));
    const feature = body.querySelector(".dash-board-feature");
    const out = {
      feature: Boolean(feature),
      label: feature?.getAttribute("aria-label"),
      height: feature ? Math.round(feature.querySelector("svg").getBoundingClientRect().height) : 0,
      rows: body.querySelectorAll(".dash-list li").length,
    };
    body.remove();
    return out;
  });
  check("the widget draws its busiest board large, then rows", widget.feature && widget.rows >= 1 && widget.height >= 96, JSON.stringify(widget));
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  await browser.close();
})();
