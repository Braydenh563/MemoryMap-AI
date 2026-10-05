// op5-1005's sweep, one file for the run's steps (the scratchpad cap is near).
// Numbers, not screenshots. MODE picks the step; W and THEME as everywhere.
//
//   MODE=mapio     the map's eight palettes and the plain-text export/import
//                  (MINDMAP_PLAN §12.2 items 7 and 10)
//   MODE=sidedock  the side-docked tool column (INBOX 596's remainder)
//
//   BASE=http://127.0.0.1:8833 SCRATCH=/tmp/mm-op5 MODE=mapio W=390 THEME=dark \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/op5-1005.js
const { boot } = require("./lib.js");

const W = Number(process.env.W || 1440);
const H = W <= 600 ? 844 : 900;
const MODE = process.env.MODE || "mapio";
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + JSON.stringify(detail) : ""}`);
}

async function openBoards(page) {
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
}

async function importMap(page, lines, name) {
  return page.evaluate(async ({ lines, name }) => {
    const board = await apiJson("/whiteboard/boards/import", {
      method: "POST",
      body: JSON.stringify({ format: "markdown", content: lines.join("\n"), name: `${name} ${Date.now()}` }),
    });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1800));
    return board.id;
  }, { lines, name });
}

async function mapio(page) {
  const boardId = await importMap(page, ["# IO", "- Centre", "  - One", "    - One a", "  - Two"], "IO");
  // The look dialog's palette select offers the eight.
  const palette = await page.evaluate(async () => {
    wbMapThemeDialog();
    await new Promise((r) => setTimeout(r, 500));
    const select = [...document.querySelectorAll(".modal-card select")].find((s) =>
      [...s.options].some((o) => o.value === "deep"));
    const out = select ? [...select.options].map((o) => o.value || "classic") : [];
    document.querySelector(".modal-overlay")?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await new Promise((r) => setTimeout(r, 300));
    for (const o of document.querySelectorAll(".modal-overlay")) o.remove();
    return out;
  });
  check("the look dialog offers eight palettes", palette.length === 8, palette);
  // The export dialog has a Plain text format on a map, and fits the window.
  const dialog = await page.evaluate(async () => {
    wbExportBoard();
    await new Promise((r) => setTimeout(r, 400));
    const card = document.querySelector(".wb-export-card");
    const labels = [...card.querySelectorAll("button")].map((b) => b.textContent.trim());
    const r = card.getBoundingClientRect();
    const out = { labels, top: r.top, bottom: r.bottom, left: r.left, right: r.right, scroll: card.scrollHeight - card.clientHeight, vw: innerWidth, vh: innerHeight };
    card.closest(".modal-overlay")?.remove();
    return out;
  });
  check("the map's export dialog offers Plain text", dialog.labels.includes("Plain text"), dialog.labels);
  check("and fits the window", dialog.top >= 0 && dialog.bottom <= dialog.vh && dialog.left >= 0 && dialog.right <= dialog.vw, dialog);
  const rows = await page.evaluate(() => mapPaletteCommands().map((r) => r.label || r.title || "").filter((t) => /Export as/.test(t)));
  check("the palette has the plain-text export row", rows.some((t) => /plain text/.test(t)), rows);
  // Round trip through the server, the way the client sends it.
  const back = await page.evaluate(async (id) => {
    const text = await (await api(`/whiteboard/boards/${id}/export?format=text`)).text();
    const board = await apiJson("/whiteboard/boards/import", {
      method: "POST", body: JSON.stringify({ format: "text", content: text, name: "Round trip" }),
    });
    return { text, count: board.object_count, title: board.title };
  }, boardId);
  check("plain text out is tabbed lines", back.text === "Centre\n\tOne\n\t\tOne a\n\tTwo\n", back.text);
  check("and comes back whole", back.count === 4 && back.title === "Round trip", back);
  // A .txt dropped on the boards landing imports and opens.
  const dropped = await page.evaluate(async () => {
    wbShowBoardsLanding();
    await new Promise((r) => setTimeout(r, 400));
    const before = window.currentBoardId;
    const dt = new DataTransfer();
    dt.items.add(new File(["Dropped\n\tA\n\tB\n"], "Dropped outline.txt", { type: "text/plain" }));
    const landing = document.getElementById("wb-boards-landing");
    const over = new DragEvent("dragover", { dataTransfer: dt, bubbles: true, cancelable: true });
    landing.dispatchEvent(over);
    landing.dispatchEvent(new DragEvent("drop", { dataTransfer: dt, bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 2500));
    const board = window.wbLastCreatedBoard;
    return { taken: over.defaultPrevented, opened: window.currentBoardId !== before, title: board?.title, count: board?.object_count };
  });
  check("a .txt dropped on the boards landing imports and opens", dropped.taken && dropped.opened && dropped.title === "Dropped outline" && dropped.count === 3, dropped);
}

//: INBOX 596's remainder: the side-docked tool column. One width on a board
//: and a map; its rows centred; at phone width the open sidebar sheet does
//: not cover any of the dock's controls.
async function sidedock(page) {
  const made = await page.evaluate(async () => {
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `side ${Date.now()}` }) });
    const map = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `sidemap ${Date.now()}`, type: "map", layout: "tree-right" }) });
    const root = await apiJson(`/whiteboard/boards/${map.id}/nodes`, { method: "POST", body: JSON.stringify({ kind: "topic", text: "Centre" }) });
    await apiJson(`/whiteboard/boards/${map.id}/nodes`, { method: "POST", body: JSON.stringify({ kind: "topic", text: "A branch", parent_id: root.id }) });
    return { board: board.id, map: map.id };
  });
  await page.evaluate(() => {
    const panel = document.getElementById("wb-tools-panel");
    if (panel.dataset.dock !== "side") document.getElementById("wb-dock-toggle").click();
  });
  const widths = {};
  for (const kind of ["board", "map"]) {
    await page.evaluate(async (id) => { await openWhiteboardBoard(id); wbCloseSidebar?.(); }, made[kind]);
    await page.waitForTimeout(900);
    const m = await page.evaluate(() => {
      const panel = document.getElementById("wb-tools-panel");
      const pr = panel.getBoundingClientRect();
      const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
      const rows = [];
      for (const section of panel.querySelectorAll(".wb-tool-section")) {
        if (!shown(section)) continue;
        const sr = section.getBoundingClientRect();
        const kids = [...section.querySelectorAll(".wb-tool-section-row > *")].filter(shown);
        const byTop = new Map();
        for (const k of kids) {
          const r = k.getBoundingClientRect();
          const key = Math.round(r.top / 4);
          if (!byTop.has(key)) byTop.set(key, []);
          byTop.get(key).push(r);
        }
        for (const rs of byTop.values()) {
          const l = Math.min(...rs.map((r) => r.left)), r = Math.max(...rs.map((r) => r.right));
          rows.push({ n: rs.length, lefts: rs.map((x) => Math.round(x.left)), slackL: Math.round(l - sr.left), slackR: Math.round(sr.right - r) });
        }
      }
      return { w: Math.round(pr.width), h: Math.round(pr.height), rows };
    });
    widths[kind] = m.w;
    //: One grid: every control starts on one of four column lines, and a
    //: full row sits centred in the column.
    const lefts = [...new Set(m.rows.flatMap((r) => r.lefts))].sort((a, b) => a - b);
    const offCentre = m.rows.filter((r) => r.n === 4 && Math.abs(r.slackL - r.slackR) > 2);
    check(`${kind}: the column's controls are on four column lines, full rows centred`, lefts.length <= 4 && offCentre.length === 0, { w: m.w, rows: m.rows.length, lefts, offCentre: offCentre.slice(0, 3) });
  }
  check("one width on a board and a map", widths.board === widths.map, widths);
  if (W < 600) {
    const cover = await page.evaluate(async () => {
      wbOpenSidebar("library", { focus: false });
      await new Promise((r) => setTimeout(r, 700));
      const side = document.getElementById("wb-sidebar").getBoundingClientRect();
      const panel = document.getElementById("wb-tools-panel");
      let worst = 0;
      for (const el of panel.querySelectorAll("button, select")) {
        const r = el.getBoundingClientRect();
        if (!r.width) continue;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (hit && !panel.contains(hit)) {
          worst += Math.max(0, Math.min(r.right, side.right) - Math.max(r.left, side.left)) * Math.max(0, Math.min(r.bottom, side.bottom) - Math.max(r.top, side.top));
        }
      }
      return Math.round(worst);
    });
    check("at phone width the open sheet covers none of the dock", cover === 0, `${cover}px²`);
  }
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: H } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openBoards(page);
  if (MODE === "mapio") await mapio(page);
  if (MODE === "sidedock") await sidedock(page);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  console.log(`\n${results.filter(Boolean).length}/${results.length} passed (${MODE}, ${W}, ${process.env.THEME || "light"})`);
  await browser.close();
})();
