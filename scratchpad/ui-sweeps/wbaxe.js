// INBOX 445 (2): axe-core and the keyboard on an *open* board and an open
// map, which axe.js never reaches (it scans the boards landing only).
//
// Three readings per surface: axe's WCAG 2.2 AA violations; every visible
// control in the board's chrome without an accessible name; and a Tab walk
// through the chrome counting the stops whose focus draws nothing (no
// outline, no box-shadow ring), which is the "focus visibility" half axe
// cannot see.
//
//   BASE=http://127.0.0.1:8798 AXE_JS=/tmp/axe-core/package/axe.min.js \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbaxe.js
const fs = require("fs");
const { boot } = require("./lib.js");
const AXE = fs.readFileSync(process.env.AXE_JS || "/tmp/axe-core/package/axe.min.js", "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function newBoard(page, name, type) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById("wb-boards-new").click());
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  if (type === "map") await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

async function scan(page, label) {
  await page.evaluate(AXE);
  const res = await page.evaluate(async (tags) => {
    const r = await axe.run(document.getElementById("library-view-whiteboard"), { runOnly: { type: "tag", values: tags } });
    return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 4).map((n) => n.target.join(" ")).join(" | ")}`);
  }, TAGS);
  console.log(`AXE ${label}: ${res.length} rules violated`);
  for (const line of res) console.log("  " + line);
  const unnamed = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("#library-view-whiteboard button, #library-view-whiteboard [role=button], #library-view-whiteboard input, #library-view-whiteboard select")) {
      if (!el.getClientRects().length || el.closest("[aria-hidden=true], .hidden")) continue;
      const name = (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.textContent || el.title || "").trim();
      const labelled = el.labels && el.labels.length;
      if (!name && !labelled) out.push(el.id || el.className);
    }
    return out;
  });
  console.log(`NAMES ${label}: ${unnamed.length} visible controls without a name${unnamed.length ? ": " + unnamed.slice(0, 8).join(", ") : ""}`);
  // Tab walk from the board's top bar.
  await page.evaluate(() => document.querySelector("#library-view-whiteboard button:not([disabled])")?.focus());
  const seen = new Set();
  let stops = 0;
  const silent = [];
  for (let i = 0; i < 90; i++) {
    await page.keyboard.press("Tab");
    const r = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.closest("#library-view-whiteboard")) return null;
      const cs = getComputedStyle(el);
      const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
      return { key: el.id || (el.getAttribute("aria-label") || el.textContent || el.className).trim().slice(0, 40), ring };
    });
    if (!r) continue;
    // The canvas keeps focus while Tab walks its items (wbWalkItems), so a
    // repeat of it is the walk, not the end of the chrome.
    if (r.key === "whiteboard-container" && seen.has(r.key)) continue;
    if (seen.has(r.key)) break;
    seen.add(r.key);
    stops += 1;
    if (!r.ring) silent.push(r.key);
  }
  console.log(`FOCUS ${label}: ${stops} tab stops, ${silent.length} without a visible ring${silent.length ? ": " + silent.slice(0, 10).join(", ") : ""}`);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await newBoard(page, "Axe board", "board");
  await page.evaluate(async () => {
    const board = window.currentBoardId;
    const post = async (path, body) => (await api(path, { method: "POST", body: JSON.stringify(body) })).json();
    await post("/whiteboard/sketches", { board_id: board, x: 0, y: 0, data: JSON.stringify({ d: "M 100 300 h 160 v 100 h -160 Z", color: "#335577", width: 3, shape: "rect" }) });
    const a = await post("/whiteboard/objects", { kind: "text", board_id: board, x: 400, y: 260, width: 200, height: 110, data: { content: "A sticky", bg: "#fff3a8" } });
    await post("/whiteboard/objects", { kind: "text", board_id: board, x: 700, y: 260, width: 200, height: 110, data: { content: "A text box" } });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    selectWbItem("object", a.id);
  });
  await page.waitForTimeout(800);
  await scan(page, "board, a sticky selected");
  await newBoard(page, "Axe map", "map");
  await page.keyboard.press("Tab");
  await page.keyboard.type("A topic");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(800);
  await scan(page, "map, a topic selected");
  await browser.close();
})();
