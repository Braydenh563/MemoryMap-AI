// **The rest of a map's own look** (MINDMAP_PLAN.md §13e's remainder,
// decisions 8 and 9): a branch palette and a font a person picks for the whole
// map, and a topic pulled back to the app's own default for a field the map
// themes.
//
// What it asserts, measured rather than looked at:
//
// 1. **One palette, two drawings agree** (decision 8). The canvas's branch
//    colour (`--wb-branch` on a first-level topic) and the Library
//    thumbnail's colour for the same topic are the same hex, before and after
//    a palette is picked in the dialog, and the canvas never holds a list of
//    its own: `wbMapPalette()` is what `/tree` sent.
// 2. **The font reaches the topic and the image export.** The computed
//    `font-family` of a topic's text, and the `font-family` the SVG export
//    writes for it.
// 3. **Decision 9's narrow case.** On a map that themes the shape and the
//    size, the strip's shape and size pickers offer the app's own default as
//    a row of its own; choosing it draws the app's default (no `data-shape`,
//    the unthemed size in px) while a sibling keeps drawing the map's, and the
//    row goes away again when the map stops theming the field.
//
//   BASE=http://127.0.0.1:8794 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mappalette.js            (THEME=dark, VIEWPORT=390x844)
const { boot } = require("./lib.js");

const VIEWPORT = (() => {
  const raw = process.env.VIEWPORT;
  if (!raw) return { width: 1440, height: 900 };
  const [w, h] = raw.split("x").map(Number);
  return { width: w || 1440, height: h || 900 };
})();

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}
const show = (o) => console.log("    " + JSON.stringify(o));

(async () => {
  const { browser, page } = await boot({ viewport: VIEWPORT });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
  });
  await page.waitForTimeout(500);
  const boardId = await page.evaluate(async () => {
    const content = ["# Palette", "- Trunk"];
    for (let b = 1; b <= 3; b++) {
      content.push(`  - Branch ${b}`);
      content.push(`    - Leaf ${b}1`);
    }
    const board = await apiJson("/whiteboard/boards/import", {
      method: "POST",
      body: JSON.stringify({ format: "markdown", content: content.join("\n"), name: `Palette ${Date.now()}` }),
    });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1800));
    return board.id;
  });

  //: The canvas's colour for Branch 1 and the thumbnail's, as hex.
  const colours = () => page.evaluate(async (id) => {
    const node = wbMapIndex().nodes.find((n) => (n.data?.content || "") === "Branch 1");
    const el = document.querySelector(`.wb-object[data-id="${node.id}"]`);
    const canvas = (el.style.getPropertyValue("--wb-branch") || "").trim().toLowerCase();
    const boards = await apiJson("/whiteboard/boards");
    const row = boards.find((b) => b.id === id);
    const item = (row?.preview_items || []).find((i) => i.label === "Branch 1");
    return { canvas, thumb: (item?.color || "").toLowerCase(), palette: wbMapPalette().slice(0, 3) };
  }, boardId);

  const before = await colours();
  show(before);
  check("an unthemed map: canvas and thumbnail draw Branch 1 in one colour",
    before.canvas && before.canvas === before.thumb && before.canvas === "#4e79a7",
    `canvas ${before.canvas}, thumbnail ${before.thumb}`);

  // --- the dialog, opened from its door ---
  await page.click('[aria-controls="wb-view-menu"]');
  await page.waitForTimeout(400);
  await page.click("#wb-map-theme-item");
  await page.waitForTimeout(600);
  const dialog = await page.evaluate(() => {
    const body = document.querySelector(".wb-map-theme");
    const card = body?.closest(".card");
    const heads = [...(body?.querySelectorAll("h4.setting-subhead") || [])].map((h) => h.textContent.trim());
    const labels = [...(body?.querySelectorAll("select") || [])].map((s) => s.getAttribute("aria-label"));
    return {
      heads, labels: labels.slice(0, 2),
      overflows: body && card ? body.scrollHeight > card.clientHeight + 2 : null,
      title: card?.querySelector("h2, h3, .modal-title")?.textContent.trim() || null,
    };
  });
  show(dialog);
  check("the dialog leads with the map's own two",
    dialog.heads[0] === "The whole map" && /^Branch colours/.test(dialog.labels[0] || "") && /^Font/.test(dialog.labels[1] || ""),
    dialog.heads.join(" | "));

  //: Through the opener `enhanceSelect` draws, as maptheme.js does: a select
  //: written to directly does not go through the shell at all.
  const pick = async (labelStart, word) => {
    const at = await page.evaluate((start) => {
      const sel = [...document.querySelectorAll(".wb-map-theme select")]
        .find((el) => (el.getAttribute("aria-label") || "").startsWith(start));
      const opener = sel?.closest(".select-shell")?.querySelector(".select-opener");
      if (!opener) return null;
      opener.scrollIntoView({ block: "center" });
      const box = opener.getBoundingClientRect();
      return { x: Math.round(box.left + box.width / 2), y: Math.round(box.top + box.height / 2) };
    }, labelStart);
    if (!at) return false;
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(400);
    const done = await page.evaluate((w) => {
      const menu = [...document.querySelectorAll(".select-menu")].find((m) => m.getBoundingClientRect().width > 0);
      const row = menu && [...menu.querySelectorAll("[role='option'], button, li")].find((o) => o.textContent.trim() === w);
      if (!row) return false;
      row.click();
      return true;
    }, word);
    await page.waitForTimeout(1200);
    return done;
  };

  const pickedPalette = await pick("Branch colours", "Deep");
  const after = await colours();
  show(after);
  check("picking Deep repaints the canvas from the server's list",
    pickedPalette && after.canvas === "#1b9e77" && after.palette[0] === "#1b9e77",
    `canvas ${after.canvas}`);
  check("and the thumbnail draws the same colour, its cache told",
    after.thumb === after.canvas, `thumbnail ${after.thumb}`);

  const fontBefore = await page.evaluate(() => {
    const el = document.querySelector(".wb-map-node .wb-map-text");
    return getComputedStyle(el).fontFamily;
  });
  const pickedFont = await pick("Font", "Serif");
  const font = await page.evaluate(() => {
    const el = document.querySelector(".wb-map-node .wb-map-text");
    const label = document.querySelector(".wb-map-node");
    const { svg } = wbBuildExportSvg("all");
    const face = (svg.match(/<text[^>]*font-family="([^"]*)"/) || [])[1] || "";
    return { text: getComputedStyle(el).fontFamily, node: getComputedStyle(label).fontFamily, svg: face };
  });
  show({ fontBefore, ...font });
  check("picking Serif sets every topic in it",
    pickedFont && /^Georgia/.test(font.text) && !/^Georgia/.test(fontBefore), font.text.slice(0, 40));
  check("and the image export writes the same face",
    /Georgia/.test(font.svg), font.svg.slice(0, 60));

  // --- decision 9: the app's own default against a theme ---
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    await wbMapSetTheme({ shape: "pill", font_size: 25 });
  });
  await page.waitForTimeout(500);
  const pinRows = await page.evaluate(async () => {
    const idx = wbMapIndex();
    const leaf = idx.nodes.find((n) => (n.data?.content || "") === "Leaf 11");
    selectWbItem("object", leaf.id);
    await new Promise((r) => setTimeout(r, 400));
    const shape = document.getElementById("wb-map-shape");
    const size = document.getElementById("wb-map-text-size");
    return {
      shape: [...shape.options].map((o) => `${o.value}:${o.textContent}`),
      size: [...size.options].map((o) => `${o.value}:${o.textContent}`),
    };
  });
  show(pinRows);
  check("on a themed map, the shape picker offers the app's own as a row",
    pinRows.shape.includes("rounded:Rounded") && pinRows.shape.some((o) => /^:As the map draws \(pill\)/.test(o)),
    pinRows.shape.slice(0, 3).join(", "));
  check("and so does the size picker",
    pinRows.size.includes("0:M") && pinRows.size.some((o) => /^:As the map draws \(xl\)/.test(o)),
    pinRows.size.join(", "));

  const pinned = await page.evaluate(async () => {
    for (const [id, value] of [["wb-map-shape", "rounded"], ["wb-map-text-size", "0"]]) {
      const sel = document.getElementById(id);
      sel.value = value;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 700));
    }
    const idx = wbMapIndex();
    const leaf = idx.nodes.find((n) => (n.data?.content || "") === "Leaf 11");
    const sib = idx.nodes.find((n) => (n.data?.content || "") === "Leaf 21");
    const el = (n) => document.querySelector(`.wb-object[data-id="${n.id}"]`);
    return {
      stored: { shape: leaf.data.shape, size: leaf.data.font_size },
      drawn: { shape: el(leaf).dataset.shape || "", size: getComputedStyle(el(leaf)).fontSize },
      sibling: { shape: el(sib).dataset.shape || "", size: getComputedStyle(el(sib)).fontSize },
      shows: { shape: document.getElementById("wb-map-shape").value, size: document.getElementById("wb-map-text-size").value },
    };
  });
  show(pinned);
  check("choosing it stores the pin and draws the app's own, against the theme",
    pinned.stored.shape === "rounded" && pinned.stored.size === 0
      && pinned.drawn.shape === "" && pinned.drawn.size !== "25px",
    `drawn "${pinned.drawn.shape}" at ${pinned.drawn.size}`);
  check("while its sibling still draws the map's",
    pinned.sibling.shape === "pill" && pinned.sibling.size === "25px",
    `sibling "${pinned.sibling.shape}" at ${pinned.sibling.size}`);
  check("and the pickers say what was chosen", pinned.shows.shape === "rounded" && pinned.shows.size === "0",
    JSON.stringify(pinned.shows));

  const unthemed = await page.evaluate(async () => {
    await wbMapSetTheme({ shape: null, font_size: null, palette: null, font: null });
    await new Promise((r) => setTimeout(r, 600));
    const shape = document.getElementById("wb-map-shape");
    return {
      rows: [...shape.options].map((o) => o.value),
      shows: shape.value,
      blank: shape.querySelector('option[value=""]').textContent,
    };
  });
  show(unthemed);
  check("when the map stops theming it, the row goes and the blank row is the default again",
    !unthemed.rows.includes("rounded") && unthemed.shows === "" && unthemed.blank === "Rounded",
    JSON.stringify(unthemed));

  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
