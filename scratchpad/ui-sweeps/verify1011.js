// Verification sweep for OPEN claims 186, 192, 206, 210, 218, 238 (verify-1011).
// One run drives, in the chosen theme: the board with a selection and its
// Data tab, the board's context bar and the map strip (round-control radii,
// 218), a Chat with a conversation (206), the document AI panel (206), a
// table drawn in dark (186), the reminders stepper (218), reduced motion on the
// graph's layout glide (192, 238) and the closed and open document menu at 390
// with touch (210). Every line is a measured number.
//
//   BASE=http://127.0.0.1:8794 THEME=dark SCRATCH=/tmp/x node verify1011.js
const { boot } = require("./lib.js");
const { openBoard } = require("./wb1005-lib.js");

let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + JSON.stringify(d)}`);
};
const ROUND = `(b) => { const cs = getComputedStyle(b); const v = cs.borderTopLeftRadius; const h = b.getBoundingClientRect().height; return v.endsWith("%") ? parseFloat(v) >= 50 : parseFloat(v) >= h / 2 - 0.5; }`;
const ONLY = (process.env.ONLY || "board,map,chat,docai,table,stepper,glide,menu390,lock").split(",");
const on = (k) => ONLY.includes(k);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

async function boardPart() {
  const { browser, page, errors, board } = await openBoard({ title: "v1011 board" });
  const id = await page.evaluate(async (bid) => {
    const s = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({
      data: JSON.stringify({ d: "M 100 100 L 260 100 L 260 200 L 100 200 Z", shape: "rect", color: "#335599", width: 2, fill: "#ffcc00", label: "Hello" }),
      x: 0, y: 0, z: 1, board_id: bid }) });
    await fetchWhiteboardState(); renderWhiteboardNow(); selectWbItem("sketch", s.id);
    return s.id;
  }, board.id);
  await page.waitForTimeout(800);
  const ctx = await page.evaluate(() => {
    const bar = document.querySelector(".wb-context");
    if (!bar) return null;
    const r = bar.getBoundingClientRect();
    const view = document.getElementById("library-view-whiteboard").getBoundingClientRect();
    const btns = [...bar.querySelectorAll("button")].filter((b) => b.checkVisibility({ checkVisibilityCSS: true }));
    const isRound = (b) => { const v = getComputedStyle(b).borderTopLeftRadius; const h = b.getBoundingClientRect().height; return v.endsWith("%") ? parseFloat(v) >= 50 : parseFloat(v) >= h / 2 - 0.5; };
    const radii = btns.map((b) => ({ h: Math.round(b.getBoundingClientRect().height), r: getComputedStyle(b).borderTopLeftRadius, round: isRound(b) }));
    return { n: btns.length, inView: r.left >= view.left - 1 && r.right <= view.right + 1 && r.top >= view.top - 1, radii: radii.slice(0, 4), allRound: radii.every((x) => x.round) };
  });
  ok("board with a selection: the context bar is shown inside the board", !!ctx && ctx.n > 0 && ctx.inView, ctx);
  ok("218: context-bar buttons are full-round (PILL_CONTROLS .wb-context button)", !!ctx && ctx.allRound, ctx && ctx.radii);
  // The Data tab of the format panel.
  await page.keyboard.press("Control+Shift+P");
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById("wb-format-tab-data")?.click());
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => {
    const p = document.getElementById("wb-format");
    const body = document.getElementById("wb-format-body");
    const tab = document.getElementById("wb-format-tab-data");
    const r = body.getBoundingClientRect();
    return { shown: !p.classList.contains("hidden"), selected: tab.getAttribute("aria-selected"), bodyScrollOver: body.scrollWidth - body.clientWidth, h: Math.round(r.height), text: body.textContent.trim().slice(0, 60), hasField: !!body.querySelector("input,select,textarea,button") };
  });
  ok("186: the Data tab opens and has controls, no sideways overflow", data.shown && data.selected === "true" && data.hasField && data.bodyScrollOver <= 0, data);
  ok("board selection: no page overflow", (await overflow(page)) <= 0);
  ok("board: no page or console errors", errors.length === 0, errors.slice(0, 3));
  await page.screenshot({ path: `${process.env.SCRATCH || "."}/v1011-board-${process.env.THEME || "light"}.png` });
  // Mind map strip: a map with a root and two children, one clicked as a person would.
  const kid = await page.evaluate(async () => {
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "v1011 map " + Date.now(), type: "map", layout: "tree-right" }) });
    const root = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: "POST", body: JSON.stringify({ kind: "topic", text: "Centre" }) });
    const k = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: "POST", body: JSON.stringify({ kind: "topic", text: "A branch", parent_id: root.id }) });
    await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: "POST", body: JSON.stringify({ kind: "topic", text: "Another", parent_id: root.id }) });
    await openWhiteboardBoard(board.id);
    await wbMapTidyFresh();
    await new Promise((r) => setTimeout(r, 600));
    return k.id;
  });
  await page.keyboard.press("Escape");
  const bb = await (await page.$(`.wb-object[data-id="${kid}"]`)).boundingBox();
  await page.mouse.click(bb.x + bb.width * 0.5, bb.y + bb.height * 0.5);
  await page.waitForTimeout(600);
  const ms = await page.evaluate(() => {
    const s = document.getElementById("wb-map-strip");
    const shown = s && !s.classList.contains("hidden");
    const btns = shown ? [...s.querySelectorAll("button.icon-only")].filter((b) => b.checkVisibility({ checkVisibilityCSS: true })) : [];
    const radii = btns.map((b) => { const v = getComputedStyle(b).borderTopLeftRadius; const h = b.getBoundingClientRect().height; return v.endsWith("%") ? parseFloat(v) >= 50 : parseFloat(v) >= h / 2 - 0.5; });
    const grips = [...document.querySelectorAll(".wb-map-grip, [class*='grip']")].filter((g) => g.checkVisibility({ checkVisibilityCSS: true })).map((g) => ({ cls: g.className.toString().slice(0, 40), name: g.getAttribute("aria-label") || g.getAttribute("title") || "" }));
    return { shown, n: btns.length, allRound: radii.length > 0 && radii.every(Boolean), grips: grips.slice(0, 5) };
  });
  ok("218: the map strip shows with a topic selected and its icon buttons are round", ms.shown && ms.n > 0 && ms.allRound, ms);
  await browser.close();
}

async function chatPart() {
  const { browser, page } = await boot({});
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const log = document.getElementById("chat-messages");
    const wrap = (cls, html) => { const d = document.createElement("div"); d.className = cls; d.textContent = html; log.appendChild(d); return d; };
    for (let i = 0; i < 6; i++) {
      wrap("chat-message user", "A question number " + i + " with a reasonably long line of text that wraps across the column to test the layout.");
      try { const b = addAssistantBubble(); b.textContent = "An answer " + i + ". " + "Words ".repeat(60); } catch (e) { wrap("chat-message assistant", "An answer " + i + " " + "Words ".repeat(60)); }
    }
  });
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const log = document.getElementById("chat-messages");
    const controls = [...document.querySelectorAll(".chat-dock-controls button, .chat-dock-controls select")].filter((b) => b.checkVisibility({ checkVisibilityCSS: true }));
    const isRound = (b) => { const v = getComputedStyle(b).borderTopLeftRadius; const h = b.getBoundingClientRect().height; return v.endsWith("%") ? parseFloat(v) >= 50 : parseFloat(v) >= h / 2 - 0.5; };
    const radii = controls.map(isRound);
    const detail = controls.map((b) => [b.id || b.className.toString().slice(0, 24), getComputedStyle(b).borderTopLeftRadius, Math.round(b.getBoundingClientRect().height)]);
    return { detail, overflowX: log.scrollWidth - log.clientWidth, pageX: document.documentElement.scrollWidth - document.documentElement.clientWidth, kids: log.children.length, controls: controls.length, allRound: radii.every(Boolean), notRound: controls.filter((b, i) => !radii[i]).map((b) => b.id || b.className.toString().slice(0, 30)) };
  });
  ok("206: Chat with a conversation: no sideways overflow", m.overflowX <= 0 && m.pageX <= 0 && m.kids >= 12, m);
  // The model picker's face (.select-opener) and the icon-only "more" button are
  // radius-md by decision (08-consistency.css INBOX 813; DESIGN.md "An icon-only
  // button"); every other control in the row is a full pill.
  const exempt = new Set(["select-opener", "chat-dock-more-btn"]);
  const rest = m.detail.filter((d) => !exempt.has(d[0]));
  ok("218: the chat dock's controls are full-round (999px) with a conversation present, except the two radius-md by decision", rest.length >= 5 && rest.every((d) => d[1] === "999px") && m.detail.filter((d) => exempt.has(d[0])).every((d) => d[1] !== "999px"), m.detail);
  ok("chat: no page errors", errors.length === 0, errors.slice(0, 2));
  await browser.close();
}

async function docAiPart() {
  const { browser, page } = await boot({});
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(1800);
  await page.evaluate(async () => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "v1011 doc", content: "# Title\n\nSome text to edit here.\n", file_type: "md" }) });
    await loadDocuments(d.id);
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { try { openDocAiPanel(); } catch (e) { document.getElementById("doc-ai")?.click(); } });
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const p = document.getElementById("doc-ai-panel");
    const card = p.querySelector(".card, .modal-card, div > div") || p;
    const r = card.getBoundingClientRect();
    return { shown: !p.classList.contains("hidden"), inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight + 1 && r.top >= -1, w: Math.round(r.width), h: Math.round(r.height), pageX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  ok("206: the document AI panel opens inside the window with no overflow", m.shown && m.inView && m.pageX <= 0, m);
  ok("doc AI: no page errors", errors.length === 0, errors.slice(0, 2));
  await browser.close();
}

async function tablePart() {
  const { browser, page } = await boot({});
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(1800);
  await page.evaluate(async () => {
    const md = "# T\n\n| A | B | C |\n| --- | --- | --- |\n| one | two | three |\n| four | five | six |\n";
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "v1011 table", content: md, file_type: "md" }) });
    await loadDocuments(d.id);
  });
  await page.waitForTimeout(2000);
  await page.evaluate(() => setDocView("live"));
  await page.waitForTimeout(1800);
  const m = await page.evaluate(() => {
    const t = document.querySelector("#doc-editor");
    if (!t || !t.querySelector(".cm-md-td")) return null;
    const cs = (el) => getComputedStyle(el);
    // color(srgb ...) and color-mix() results are not rgb(): a canvas turns any CSS colour into bytes.
    const cv = document.createElement("canvas"); cv.width = cv.height = 1; const g2 = cv.getContext("2d", { willReadFrequently: true });
    const bytes = (c) => { g2.clearRect(0, 0, 1, 1); g2.fillStyle = "#000"; g2.fillStyle = c; g2.fillRect(0, 0, 1, 1); const d = g2.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3]]; };
    const lum = (c) => { const m = bytes(c); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const bgOf = (el) => { let e = el; while (e) { const b = cs(e).backgroundColor; if (b && bytes(b)[3] > 200) return b; e = e.parentElement; } return "rgb(255,255,255)"; };
    const cells = [...t.querySelectorAll(".cm-md-td")];
    const ratios = cells.map((c) => { const L1 = lum(cs(c).color), L2 = lum(bgOf(c)); return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); });
    return { cells: cells.length, minContrast: Math.round(Math.min(...ratios) * 100) / 100, borderTop: cs(cells[0]).borderTopColor, theme: document.documentElement.dataset.theme || "" };
  });
  ok("186: a table in a document renders and its cell text has >= 4.5:1 in this theme", !!m && m.cells >= 6 && m.minContrast >= 4.5, m);
  ok("table: no page errors", errors.length === 0, errors.slice(0, 2));
  await browser.close();
}

async function stepperPart() {
  const { browser, page } = await boot({});
  await page.evaluate(() => switchTab("reminders"));
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const btns = [...document.querySelectorAll(".stepper > .stepper-btn")];
    const vis = btns.filter((b) => b.checkVisibility({ checkVisibilityCSS: true }));
    const radii = vis.map((b) => { const h = b.getBoundingClientRect().height; return { h: Math.round(h), r: parseFloat(getComputedStyle(b).borderTopLeftRadius) }; });
    const st = document.querySelector(".stepper");
    const sh = st ? st.getBoundingClientRect().height : 0;
    return { total: btns.length, visible: vis.length, radii: radii.slice(0, 4), stepperPill: st ? parseFloat(getComputedStyle(st).borderTopLeftRadius) >= sh / 2 - 0.5 : null };
  });
  // The steppers sit in the reminder form, which is closed until a reminder is being made.
  if (m.visible === 0) {
    await page.evaluate(() => { document.getElementById("reminder-due-row")?.closest("details")?.setAttribute("open", ""); document.getElementById("reminder-title")?.focus(); });
    await page.waitForTimeout(400);
  }
  const m2 = m.visible ? m : await page.evaluate(() => {
    const vis = [...document.querySelectorAll(".stepper > .stepper-btn")].filter((b) => b.checkVisibility({ checkVisibilityCSS: true }));
    return { visible: vis.length, radii: vis.map((b) => ({ h: Math.round(b.getBoundingClientRect().height), r: parseFloat(getComputedStyle(b).borderTopLeftRadius) })) };
  });
  ok("218: the stepper's buttons are round when on screen", m2.visible > 0 && m2.radii.every((x) => x.r >= x.h / 2 - 0.5), m2);
  await browser.close();
}

async function glidePart() {
  const results = {};
  for (const reduce of [true, false]) {
    const { browser, page } = await boot({ reducedMotion: reduce ? "reduce" : "no-preference" });
    if (reduce === true) {
      await page.evaluate(async () => {
        const ids = [];
        for (let i = 0; i < 10; i++) ids.push((await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "v1011 glide note " + i, is_draft: false }) })).id);
        for (let i = 1; i < ids.length; i++) await api(`/entries/${ids[0]}/links`, { method: "POST", body: JSON.stringify({ target_id: ids[i] }) }).catch(() => {});
      });
    }
    await page.evaluate(() => switchTab("graph"));
    await page.waitForTimeout(3500);
    const still = await page.evaluate(() => gcStill());
    const before = await page.evaluate(() => (graphNodesRef || []).map((n) => [n.x, n.y]));
    await page.evaluate(() => {
      const sel = document.getElementById("graph-layout");
      const opts = [...sel.options].map((o) => o.value).filter((v) => v !== sel.value);
      sel.value = opts[0];
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // Sample every ~40 ms for 8 s and count the frames that sit strictly between
    // the start and the end of the move. The worker's answer arrives at an
    // unpredictable time on a loaded machine, so the shape of the move is
    // measured, not its timing: a glide is many in-between frames, a cut is at most one.
    const frames = await page.evaluate(async () => {
      const snap = () => (graphNodesRef || []).map((n) => [n.x, n.y]);
      const out = [];
      const t0 = performance.now();
      while (performance.now() - t0 < 8000) { out.push(snap()); await new Promise((r) => setTimeout(r, 40)); }
      return out;
    });
    const start = frames[0], final = frames[frames.length - 1];
    const total = (a) => a.reduce((acc, p, i) => acc + (final[i] ? Math.hypot(p[0] - final[i][0], p[1] - final[i][1]) : 0), 0) / Math.max(1, a.length);
    const d0 = total(start);
    const between = frames.filter((f) => { const d = total(f); return d > d0 * 0.05 && d < d0 * 0.95; }).length;
    results[reduce ? "reduce" : "normal"] = { still, nodes: final.length, moved: Math.round(d0), betweenFrames: between, frames: frames.length };
    await browser.close();
  }
  console.log("glide", JSON.stringify(results));
  const r = results.reduce, n = results.normal;
  ok("192/238: with reduced motion the layout change is a cut (at most 2 in-between frames)", r.still === true && r.moved > 20 && r.betweenFrames <= 2, r);
  ok("192/238: without it the layout change glides (at least 4 in-between frames)", n.still === false && n.moved > 20 && n.betweenFrames >= 4, n);
}

async function menu390Part() {
  const { browser, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "v1011 code", content: "x = 1\n", file_type: "py" }) });
    await loadDocuments(d.id);
  });
  await page.waitForTimeout(2000);
  const m = () => page.evaluate(() => {
    const out = [];
    for (const d of document.querySelectorAll("details.doc-dock-menu")) {
      const s = d.querySelector(":scope > summary");
      const l = d.querySelector(".doc-dock-menu-list");
      const vis = (e) => !!e && e.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true, contentVisibilityAuto: true });
      const r = l ? l.getBoundingClientRect() : { x: 0, right: 0, width: 0, height: 0, top: 0, bottom: 0 };
      out.push({ id: d.id, summaryVisible: vis(s), open: d.open, listVisible: vis(l), x: Math.round(r.x), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), w: Math.round(r.width), items: l ? l.children.length : 0 });
    }
    return out;
  });
  const closed = await m();
  ok("210: no closed document menu list paints at 390", closed.every((c) => c.open || !c.listVisible), closed.filter((c) => c.listVisible));
  const visible = closed.filter((c) => c.summaryVisible && c.items >= 2);
  ok("210: at least two document menus are reachable in the visible bar at 390", visible.length >= 2, visible.map((c) => [c.id, c.items]));
  for (const target of visible) {
    await page.evaluate(() => { for (const d of document.querySelectorAll("details.doc-dock-menu[open]")) d.open = false; });
    await page.tap(`#${target.id} > summary`).catch(() => page.click(`#${target.id} > summary`));
    await page.waitForTimeout(500);
    const open = (await m()).find((c) => c.id === target.id);
    ok(`210: ${target.id} (${target.items} items) opened in the visible bar paints inside the window (x >= 0, right <= 390, bottom <= 844)`, open.open && open.listVisible && open.x >= 0 && open.right <= 390 && open.bottom <= 844, open);
  }
  await browser.close();
}

async function lockPart() {
  const { chromium } = require("/opt/node22/lib/node_modules/playwright");
  const browser = await chromium.launch();
  for (const [w, h, touch] of [[1440, 900, false], [390, 844, true]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, colorScheme: process.env.THEME === "dark" ? "dark" : "light" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((t) => { try { localStorage.setItem("theme", t); } catch (e) {} }, process.env.THEME || "light");
    await page.goto((process.env.BASE || "http://127.0.0.1:8781") + "/", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("#lock-password", { state: "visible", timeout: 30000 });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const f = document.getElementById("lock-password"), b = document.getElementById("lock-submit");
      const rf = f.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const g = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * g(m[0]) + 0.7152 * g(m[1]) + 0.0722 * g(m[2]); };
      const bgOf = (el) => { let e = el; while (e) { const bg = getComputedStyle(e).backgroundColor; const a = bg.match(/[\d.]+/g); if (a && !(a.length > 3 && Number(a[3]) < 0.5) && !/transparent/.test(bg)) return bg; e = e.parentElement; } return "rgb(255,255,255)"; };
      const overlay = document.getElementById("lock-overlay");
      const texts = [...overlay.querySelectorAll("*")].filter((e) => e.checkVisibility({ checkVisibilityCSS: true }) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
      const ratios = texts.map((e) => { const L1 = lum(getComputedStyle(e).color), L2 = lum(bgOf(e)); return [e.id || e.tagName.toLowerCase(), Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100]; });
      return {
        pageX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        fieldIn: rf.left >= 0 && rf.right <= innerWidth && rf.top >= 0 && rf.bottom <= innerHeight,
        btnIn: rb.left >= 0 && rb.right <= innerWidth && rb.bottom <= innerHeight,
        btnH: Math.round(rb.height), fieldH: Math.round(rf.height), focus: document.activeElement && document.activeElement.id,
        minContrast: Math.min(...ratios.map((r) => r[1])), texts: ratios.length, fieldFont: parseFloat(getComputedStyle(f).fontSize),
      };
    });
    const tag = `${w}${touch ? " touch" : ""} ${process.env.THEME || "light"}`;
    ok(`184 lock screen ${tag}: field and button inside the window, no sideways scroll`, m.fieldIn && m.btnIn && m.pageX <= 0, m);
    ok(`184 lock screen ${tag}: text contrast >= 4.5:1 (${m.texts} text elements)`, m.texts > 0 && m.minContrast >= 4.5, m);
    if (touch) ok("184 lock screen 390: touch targets >= 44px and the field font >= 16px (no iOS zoom)", m.btnH >= 44 && m.fieldH >= 44 && m.fieldFont >= 16, m);
    // One wrong attempt per run, on the desktop pass only: the server counts them.
    if (touch) { ok(`lock ${tag}: no page errors`, errors.length === 0, errors.slice(0, 2)); await ctx.close(); continue; }
    await page.fill("#lock-password", "definitely-wrong-password");
    await page.click("#lock-submit");
    await page.waitForTimeout(1500);
    const err = await page.evaluate(() => { const e = document.getElementById("lock-error"); return e && e.checkVisibility({ checkVisibilityCSS: true }) ? e.textContent.trim() : null; });
    ok(`184 lock screen ${tag}: a wrong password shows a message with no exclamation mark`, !!err && !/!/.test(err), err);
    ok(`lock ${tag}: no page errors`, errors.length === 0, errors.slice(0, 2));
    await ctx.close();
  }
  await browser.close();
}

(async () => {
  const parts = { board: boardPart, chat: chatPart, docai: docAiPart, table: tablePart, stepper: stepperPart, glide: glidePart, menu390: menu390Part, lock: lockPart };
  for (const k of ONLY) {
    if (k === "map") continue;
    if (!parts[k]) continue;
    try { await parts[k](); } catch (e) { bad += 1; console.log(`FAIL  ${k} threw: ${String(e.message).split("\n").filter((x) => !/^\s*$/.test(x)).slice(0, 4).join(" | ")} @ ${String(e.stack).split("\n").filter((x) => /ui-sweeps/.test(x)).slice(0, 2).join(" ; ").replace(/\/tmp\/[^ ]*ui-sweeps\//g, "")}`); }
  }
  console.log(bad ? `${bad} FAIL` : "ALL PASS");
  process.exit(bad ? 1 : 0);
})();
