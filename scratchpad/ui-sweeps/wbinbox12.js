// INBOX 12's remainder, measured against what the board renders today: the
// export selection popover's placement, the missing align-centre and
// distribute-gaps, and the arrange buttons with their icons drawn through
// their text.
//
//   BASE=http://127.0.0.1:8941 SCRATCH=/tmp/mm-wbfab VIEWPORT=1440x900 \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers NODE_PATH=/opt/node22/lib/node_modules \
//     timeout 115 node scratchpad/ui-sweeps/wbinbox12.js
//
// The report predates Phases 2 and 3, which replaced the properties panel with
// the context bar and the export popover with a dialog, so this asks whether
// the three complaints survive rather than whether the old widgets were fixed:
// every arrange control on the bar, the overlap between each button's icon and
// any text beside it, and where the export surface opens.
const { boot } = require("./lib.js");

const [VW, VH] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);

let pass = 0;
let fail = 0;
function ok(name, good, detail) {
  if (good) { pass += 1; console.log(`OK   ${name}${detail ? `  ${detail}` : ""}`); }
  else { fail += 1; console.log(`FAIL ${name}${detail ? `  ${detail}` : ""}`); }
}

async function newBoard(page, name) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: VW, height: VH } });
  await newBoard(page, "INBOX 12");

  // Two items, so the arrange controls are the ones a selection of two gets.
  const made = await page.evaluate(async () => {
    const board = window.currentBoardId;
    const post = async (path, body) => (await api(path, { method: "POST", body: JSON.stringify(body) })).json();
    const a = await post("/whiteboard/objects", { kind: "text", board_id: board, x: 60, y: 80, width: 180, height: 90, data: { content: "one" } });
    const b = await post("/whiteboard/objects", { kind: "text", board_id: board, x: 320, y: 200, width: 220, height: 110, data: { content: "two" } });
    await fetchWhiteboardState();
    renderWhiteboard();
    return [a.id, b.id];
  });
  await page.waitForTimeout(600);
  await page.evaluate((ids) => {
    wbSelectedItem = null;
    wbMultiSelection.clear();
    for (const id of ids) wbMultiSelection.add(wbMultiKey("object", id));
    wbApplySelectionHighlight();
    wbUpdateSelectionBar();
  }, made);
  await page.waitForTimeout(500);

  // --- the eleven arrange actions ------------------------------------------
  const arrange = await page.evaluate(() => {
    const group = document.querySelector('.wb-context-group[data-wb-ctx="arrange"]');
    const order = document.querySelector('.wb-context-group[data-wb-ctx="order"]');
    const shown = (el) => el && !el.classList.contains("hidden") && el.getBoundingClientRect().height > 0;
    const ids = (el) => (shown(el) ? [...el.querySelectorAll("button")].map((b) => b.id) : []);
    return { arrange: ids(group), order: ids(order), arrangeShown: shown(group), orderShown: shown(order) };
  });
  const want = [
    "wb-multi-group", "wb-multi-ungroup",
    "wb-align-left", "wb-align-hcenter", "wb-align-right",
    "wb-align-top", "wb-align-vcenter", "wb-align-bottom",
    "wb-distribute-h", "wb-distribute-v",
    "wb-same-width", "wb-same-height",
  ];
  const missing = want.filter((id) => !arrange.arrange.includes(id));
  ok("every align, distribute and size control is on the bar for a pair", missing.length === 0,
    `${arrange.arrange.length} controls, missing ${missing.join(",") || "none"}`);
  ok("align centres and even gaps are among them",
    ["wb-align-hcenter", "wb-align-vcenter", "wb-distribute-h", "wb-distribute-v"].every((id) => arrange.arrange.includes(id)),
    "the four INBOX 12 named");
  ok("z order is there too", arrange.order.length === 2, arrange.order.join(",") || "none");

  // --- the overlap the report is about -------------------------------------
  // An icon drawn through its own label: measured as the intersection of the
  // icon's box with any text box in the same button, on the bar and in the top
  // bar's Arrange menu, which is the other surface these actions live on.
  await page.click("#wb-arrange-menu-toggle").catch(() => {});
  const menuOpen = await page.evaluate(() => {
    const t = [...document.querySelectorAll("#wb-topbar [data-wb-menu-toggle]")]
      .find((b) => (b.getAttribute("aria-controls") || "") === "wb-arrange-menu");
    if (t && t.getAttribute("aria-expanded") !== "true") t.click();
    return Boolean(t);
  });
  await page.waitForTimeout(400);
  const overlaps = await page.evaluate(() => {
    const out = [];
    const boxes = (button) => {
      const icon = button.querySelector("i");
      if (!icon) return null;
      const ir = icon.getBoundingClientRect();
      let worst = 0, label = "";
      for (const span of button.querySelectorAll("span")) {
        const sr = span.getBoundingClientRect();
        if (!sr.width || !sr.height) continue;
        const w = Math.max(0, Math.min(ir.right, sr.right) - Math.max(ir.left, sr.left));
        const h = Math.max(0, Math.min(ir.bottom, sr.bottom) - Math.max(ir.top, sr.top));
        if (w * h > worst) { worst = w * h; label = span.textContent.trim().slice(0, 24); }
      }
      return { worst: Math.round(worst), label, icon: `${Math.round(ir.width)}x${Math.round(ir.height)}` };
    };
    for (const sel of ['.wb-context-group[data-wb-ctx="arrange"] button', '.wb-context-group[data-wb-ctx="order"] button', "#wb-arrange-menu button"]) {
      for (const b of document.querySelectorAll(sel)) {
        if (b.getBoundingClientRect().height === 0) continue;
        const m = boxes(b);
        if (m) out.push({ where: sel.includes("arrange-menu") ? "menu" : "bar", id: b.id || m.label, ...m });
      }
    }
    return out;
  });
  const drawnThrough = overlaps.filter((o) => o.worst > 0);
  ok("no arrange control draws its icon through its own text", drawnThrough.length === 0,
    `${overlaps.length} buttons measured (${menuOpen ? "bar and menu" : "bar only"}), worst overlap ${drawnThrough.length ? drawnThrough.map((o) => `${o.id} ${o.worst}px2`).join(", ") : "0px2"}`);

  // --- the export surface ---------------------------------------------------
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  const exported = await page.evaluate(() => {
    document.querySelector(".wb-export-overlay")?.remove();
    wbExportBoard();
    const overlay = document.querySelector(".wb-export-overlay");
    const card = overlay?.querySelector(".card, .modal, .wb-export-card") || overlay?.firstElementChild;
    const r = card ? card.getBoundingClientRect() : null;
    return {
      legacyPopover: Boolean(document.querySelector(".wb-export-menu")),
      dialog: Boolean(overlay),
      rect: r ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null,
      inside: r ? r.left >= -1 && r.top >= -1 && r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1 : false,
      win: { w: window.innerWidth, h: window.innerHeight },
    };
  });
  ok("the export is a dialog and the old popover is not built", exported.dialog && !exported.legacyPopover,
    `dialog ${exported.dialog}, .wb-export-menu ${exported.legacyPopover}`);
  ok("it opens inside the window", exported.inside,
    exported.rect ? `${exported.rect.w}x${exported.rect.h} at ${exported.rect.x},${exported.rect.y} in ${exported.win.w}x${exported.win.h}` : "no card");

  console.log(`\n${pass}/${pass + fail} checks pass at ${VW}x${VH} (${process.env.THEME || "light"})`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
