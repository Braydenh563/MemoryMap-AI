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
  await page.waitForFunction(() => typeof window.initWhiteboard === "function" && typeof window.wbMapStudyQuestions === "function", null, { timeout: 30000 });
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

//: The installed models' menus offer only what each model's kind can do.
//: Needs a server started with OLLAMA_URL at scratchpad/fake_ollama_server.py
//: (llama3.2 and nomic-embed-text installed).
async function models(page) {
  await page.evaluate(() => openSettingsModal("models"));
  await page.waitForTimeout(2500);
  const cards = await page.evaluate(() => [...document.querySelectorAll("#installed-list .model-card")].map((c) => ({
    name: c.querySelector(".model-card-name")?.textContent.trim(),
    kebab: Boolean(c.querySelector(".kebab-menu, [aria-haspopup]")),
  })));
  check("the installed list shows the two models", cards.length === 2, cards);
  for (const card of cards) {
    const items = await page.evaluate(async (name) => {
      const el = [...document.querySelectorAll("#installed-list .model-card")].find((c) => c.querySelector(".model-card-name")?.textContent.trim() === name);
      el.querySelector("[aria-haspopup]").click();
      await new Promise((r) => setTimeout(r, 300));
      const menu = [...document.querySelectorAll("[role=menu]")].find((m) => m.getBoundingClientRect().width);
      const out = menu ? [...menu.querySelectorAll("[role=menuitem]")].map((b) => b.textContent.trim()) : [];
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      await new Promise((r) => setTimeout(r, 200));
      return out;
    }, card.name);
    const uses = items.filter((t) => /^Use for/.test(t));
    if (/embed/.test(card.name)) check(`${card.name}: offered search only`, uses.length === 0 || (uses.length === 1 && uses[0] === "Use for search"), items);
    else check(`${card.name}: never offered search, images or reading text`, !uses.some((t) => /search|images|reading/.test(t)), items);
  }
}

//: The whiteboard file's off-band widths moved onto Phase 9's bands: at
//: each width across the moved ranges, the board's top bar is one or two
//: rows and runs past nothing, the tool dock and the zoom cluster do not
//: overlap, and no Settings section scrolls sideways.
async function bands(page) {
  const out = [];
  for (const w of [600, 640, 680, 719, 760, 819, 820, 900]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(500);
    const m = await page.evaluate(() => {
      const bar = document.querySelector(".wb-topbar");
      const br = bar.getBoundingClientRect();
      const dock = document.getElementById("wb-tools-panel").getBoundingClientRect();
      const zoom = document.querySelector(".whiteboard-floating-panel.bottom-right")?.getBoundingClientRect();
      const ov = zoom ? Math.max(0, Math.min(dock.right, zoom.right) - Math.max(dock.left, zoom.left)) * Math.max(0, Math.min(dock.bottom, zoom.bottom) - Math.max(dock.top, zoom.top)) : 0;
      const ctrls = [...bar.querySelectorAll("button, summary")].filter((b) => b.getBoundingClientRect().width);
      const outside = ctrls.filter((b) => { const r = b.getBoundingClientRect(); return r.right > br.right + 1 || r.left < br.left - 1; }).length;
      return { bar: Math.round(br.height), sideways: bar.scrollWidth - bar.clientWidth, outside, overlap: Math.round(ov) };
    });
    out.push({ w, ...m });
    check(`board at ${w}: top bar whole, dock clear of zoom`, m.outside === 0 && m.overlap === 0 && m.bar <= 110, m);
  }
  await page.evaluate(() => openSettingsModal("general"));
  await page.waitForTimeout(1200);
  for (const w of [600, 640, 700, 819]) {
    await page.setViewportSize({ width: w, height: 800 });
    for (const section of ["general", "models", "appearance", "tasks"]) {
      await page.evaluate((s) => openSettingsModal(s), section);
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => {
        const pane = [...document.querySelectorAll("#settings-modal .settings-section")].find((s) => s.getBoundingClientRect().width);
        const body = pane?.closest(".modal-body, .settings-body, .modal-content") || pane;
        return { sideways: body ? body.scrollWidth - body.clientWidth : -1 };
      });
      check(`settings ${section} at ${w}: nothing sideways`, m.sideways <= 0, m);
    }
  }
}

//: The nine empty lines moved onto `.empty-line` compute one look: the
//: recipe's size, ink, margin and alignment, read from a probe line.
async function emptylines(page) {
  const ids = ["doc-history-empty", "doc-ai-history-empty", "doc-empty", "doc-outline-empty", "conv-empty",
    "ask-history-empty", "graph-pane-empty", "wb-navigator-empty", "wb-format-empty"];
  const got = await page.evaluate((ids) => {
    const look = (el) => { const s = getComputedStyle(el); return [s.fontSize, s.color, s.marginTop, s.marginBottom, s.textAlign, s.paddingTop].join(" "); };
    const probe = document.createElement("p");
    probe.className = "empty-line";
    document.body.appendChild(probe);
    const want = look(probe);
    probe.remove();
    return { want, rows: ids.map((id) => ({ id, look: document.getElementById(id) ? look(document.getElementById(id)) : "missing" })) };
  }, ids);
  for (const row of got.rows) check(`${row.id} is the recipe`, row.look === got.want, row.look === got.want ? "" : `${row.look} vs ${got.want}`);
}

//: Study the map (§12.3 item 5) on a 40-topic map: the questions alone,
//: Enter draws the answer, the marks are kept, the map is whole after.
async function study(page) {
  const lines = ["# Study", "- Centre"];
  for (let b = 1; b <= 6; b++) {
    lines.push(`  - Branch ${b}`);
    for (let l = 1; l <= (b <= 3 ? 6 : 5); l++) lines.push(`    - Leaf ${b}.${l}`);
  }
  await importMap(page, lines, "Study");
  const drawn = () => page.evaluate(() => {
    const ids = new Set([...document.querySelectorAll("#whiteboard-container .wb-object[data-id]")]
      .filter((el) => el.getBoundingClientRect().width && getComputedStyle(el).display !== "none").map((el) => Number(el.dataset.id)));
    const names = wbMapIndex().nodes.filter((n) => ids.has(n.id)).map((n) => n.data?.content || "");
    return { total: wbMapIndex().nodes.length, names };
  });
  const before = await drawn();
  await page.evaluate(() => { localStorage.removeItem(`wbStudy:${window.currentBoardId}`); document.getElementById("wb-map-study").click(); });
  await page.waitForTimeout(900);
  const q = await drawn();
  const bar = () => page.evaluate(() => ({
    count: document.getElementById("wb-present-count")?.textContent,
    show: !document.getElementById("wb-study-show").classList.contains("hidden"),
    knew: !document.getElementById("wb-study-knew").classList.contains("hidden"),
  }));
  const b1 = await bar();
  check("40 topics; studying draws only the centre and the questions", before.total === 40 && q.names.every((n) => !/^Leaf/.test(n)) && q.names.some((n) => n === "Branch 1"), { total: before.total, drawn: q.names.length });
  check("the step asks, and Show is offered", /What is under “Branch 1”/.test(b1.count) && b1.show && !b1.knew, b1);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  const a = await drawn();
  const b2 = await bar();
  const leaves = a.names.filter((n) => /^Leaf 1\./.test(n)).length;
  check("Enter draws Branch 1's six leaves, no other branch's", leaves === 6 && !a.names.some((n) => /^Leaf [2-6]\./.test(n)), { leaves, drawn: a.names.length });
  check("then the two marks are offered", !b2.show && b2.knew, b2);
  await page.click("#wb-study-knew");
  await page.waitForTimeout(600);
  const b3 = await bar();
  check("Knew it moves to the next question", /Branch 2/.test(b3.count) && b3.show, b3);
  for (let i = 2; i <= 6; i++) {
    await page.click("#wb-study-show");
    await page.waitForTimeout(400);
    await page.click(i % 2 ? "#wb-study-knew" : "#wb-study-missed");
    await page.waitForTimeout(400);
  }
  const end = await page.evaluate(() => ({
    presenting: document.getElementById("library-view-whiteboard").classList.contains("wb-presenting"),
    marks: JSON.parse(localStorage.getItem(`wbStudy:${window.currentBoardId}`) || "{}"),
  }));
  const after = await drawn();
  const lasts = Object.values(end.marks).map((m) => m.last);
  check("the run ends, the marks are kept (3 knew, 3 not yet)", !end.presenting && lasts.length === 6 && lasts.filter((x) => x === "knew").length === 3, lasts);
  check("and the map draws whole again", after.names.length >= q.names.length + 30 || after.names.filter((n) => /^Leaf/.test(n)).length >= 30, { drawn: after.names.length });
}

//: A due date on a topic (§12.2 item 4, decision 37): set in the Markers
//: popover's date field, drawn in the marker row, a day gone in the error
//: ink at 4.5:1 or better, and Remind me makes a reminder.
async function due(page) {
  await importMap(page, ["# Due", "- Plan", "  - Book", "  - Pack"], "Due");
  const ink = (rgb) => {
    const unit = /^color\(srgb/.test(rgb) ? 1 : 255;
    const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map((v) => { const c = Number(v) / unit; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const year = new Date().getFullYear();
  for (const [label, day, past] of [["Book", `${year + 1}-03-14`, false], ["Pack", `${year - 1}-03-14`, true]]) {
    await page.evaluate(async ({ label, day }) => {
      const node = wbMapIndex().nodes.find((n) => n.data?.content === label);
      wbMapOpenMarkers(node.id);
      await new Promise((r) => setTimeout(r, 300));
      const field = document.querySelector("#wb-map-markers input[type=date]");
      field.value = day;
      field.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 900));
    }, { label, day });
    const m = await page.evaluate((label) => {
      const node = wbMapIndex().nodes.find((n) => n.data?.content === label);
      const chip = document.querySelector(`.wb-object[data-id="${node.id}"] .wb-map-mark-due`);
      let bgEl = chip;
      let bg = "rgba(0, 0, 0, 0)";
      while (bgEl && /rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { bg = getComputedStyle(bgEl).backgroundColor; bgEl = bgEl.parentElement; }
      if (/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) bg = getComputedStyle(document.getElementById("whiteboard-container")).backgroundColor;
      return { stored: node.data?.due, text: chip?.textContent, past: chip?.classList.contains("is-past"), color: chip ? getComputedStyle(chip).color : "", bg, row: chip?.parentElement?.getAttribute("aria-label") };
    }, label);
    const l1 = ink(m.color), l2 = ink(m.bg);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    check(`${label}: stored, drawn, ${past ? "gone" : "to come"}, ${ratio.toFixed(2)}:1`, m.stored && m.text && m.past === past && ratio >= 4.5 && /due/i.test(m.row || ""), m);
  }
  const reminded = await page.evaluate(async () => {
    const before = (await apiJson("/reminders")).length ?? 0;
    const pop = document.getElementById("wb-map-markers");
    const remind = [...document.querySelectorAll("#wb-map-markers button")].find((b) => b.textContent === "Remind me");
    if (!remind) return { had: false, made: false, pop: Boolean(pop), rows: pop ? pop.textContent.slice(0, 200) : "" };
    remind?.click();
    await new Promise((r) => setTimeout(r, 900));
    const all = await apiJson("/reminders");
    const list = Array.isArray(all) ? all : all.items || all.reminders || [];
    return { had: Boolean(remind), made: list.some((x) => x.text === "Pack") };
  });
  check("Remind me on a day gone makes no reminder (it says why)", reminded.had && !reminded.made, reminded);
  const ahead = await page.evaluate(async () => {
    const node = wbMapIndex().nodes.find((n) => n.data?.content === "Book");
    wbMapOpenMarkers(node.id);
    await new Promise((r) => setTimeout(r, 400));
    [...document.querySelectorAll("#wb-map-markers button")].find((b) => b.textContent === "Remind me")?.click();
    await new Promise((r) => setTimeout(r, 1200));
    const all = await apiJson("/reminders");
    const list = Array.isArray(all) ? all : all.items || all.reminders || [];
    const made = list.find((x) => x.text === "Book");
    return { made: Boolean(made), due: made?.due_at };
  });
  check("Remind me on a day to come makes the reminder, 9:00 that day", ahead.made, ahead);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: H } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (MODE !== "models" && MODE !== "emptylines") await openBoards(page);
  if (MODE === "emptylines") await emptylines(page);
  if (MODE === "mapio") await mapio(page);
  if (MODE === "sidedock") await sidedock(page);
  if (MODE === "models") await models(page);
  if (MODE === "study") await study(page);
  if (MODE === "due") await due(page);
  if (MODE === "bands") { await importMap(page, ["# B", "- C", "  - D"], "Bands"); await bands(page); }
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  console.log(`\n${results.filter(Boolean).length}/${results.length} passed (${MODE}, ${W}, ${process.env.THEME || "light"})`);
  await browser.close();
})();
