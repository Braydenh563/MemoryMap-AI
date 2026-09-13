// INBOX 183, two of the map's top-bar reports: "the arrange dropdown menu in
// the whiteboard and mindmap seems to be very short in height compared to the
// other menus", and "the mindmap top bar controls breach the topbar and
// overflow off the edge on the right".
//
// Both are geometry, so both are numbers: every `.wb-board-menu` is opened in
// turn on a map board and its box, its cap, its content height and its column
// count are read; then the top bar is measured against the window at three
// widths.
//
//   BASE=http://127.0.0.1:8791 SCRATCH=/tmp/mm-map \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapmenus.js
const { boot } = require("./lib.js");

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

async function newBoard(page, name, type) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  if (type === "map") await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

const MENUS = ["wb-insert-menu", "wb-edit-menu", "wb-arrange-menu", "wb-view-menu", "wb-board-menu"];

(async () => {
  const { browser, page } = await boot({});
  await newBoard(page, "Menus map", "map");

  const measureMenus = async () => {
  const boxes = {};
  for (const id of MENUS) {
    const toggle = `[aria-controls="${id}"]`;
    if (!(await page.$(toggle))) { boxes[id] = null; continue; }
    if (!(await page.isVisible(toggle))) { boxes[id] = { hiddenToggle: true }; continue; }
    await page.click(toggle);
    await page.waitForTimeout(350);
    boxes[id] = await page.evaluate((mid) => {
      const el = document.getElementById(mid);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        h: Math.round(r.height), w: Math.round(r.width),
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        maxHeight: cs.maxHeight, columns: cs.columnCount,
        scrollH: el.scrollHeight, clientH: el.clientHeight,
        rows: el.querySelectorAll(".wb-menu-item").length,
        sections: el.querySelectorAll(".wb-menu-section").length,
        overflowY: cs.overflowY,
      };
    }, id);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
  }
  return boxes;
  };
  const barShape = () => page.evaluate(() => {
    const el = document.getElementById("wb-topbar");
    const r = el.getBoundingClientRect();
    const toggles = {};
    for (const t of el.querySelectorAll("[data-wb-menu-toggle]")) {
      const tr = t.getBoundingClientRect();
      toggles[t.getAttribute("aria-controls")] = Math.round(tr.top - r.top);
    }
    return { barH: Math.round(r.height), rowOffsets: toggles };
  });
  console.log("  bar @1440:", JSON.stringify(await barShape()));
  const boxes = await measureMenus();
  for (const id of MENUS) console.log(`  ${id}: ${JSON.stringify(boxes[id])}`);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(700);
  console.log("  bar @1024:", JSON.stringify(await barShape()));
  const narrow = await measureMenus();
  for (const id of MENUS) console.log(`  1024 ${id}: ${JSON.stringify(narrow[id])}`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(600);

  // The report: Arrange is short against the others. "Short" is only a fault
  // if its own content is taller than the box, or if it is capped below what
  // the window could give it.
  const arr = boxes["wb-arrange-menu"];
  if (arr && !arr.hiddenToggle) {
    check("the Arrange menu shows all of its own content",
      arr.scrollH <= arr.clientH + 1, `scrollHeight ${arr.scrollH} in clientHeight ${arr.clientH}`);
    check("the Arrange menu is as wide as the other board menus",
      Math.abs(arr.w - (boxes["wb-view-menu"]?.w || arr.w)) < 2,
      `Arrange ${arr.w}px, View ${boxes["wb-view-menu"]?.w}px`);
    const others = MENUS.filter((m) => m !== "wb-arrange-menu").map((m) => boxes[m]).filter((b) => b && !b.hiddenToggle);
    const perRow = others.map((b) => (b.rows ? b.h / b.rows : 0)).filter(Boolean);
    const mine = arr.rows ? arr.h / arr.rows : 0;
    const avg = perRow.length ? perRow.reduce((a, b) => a + b, 0) / perRow.length : 0;
    check("an Arrange row is the same height as a row in the other menus",
      avg === 0 || Math.abs(mine - avg) < 8, `${mine.toFixed(1)}px a row against ${avg.toFixed(1)}px`);
  }

  // The top bar against the window, at three widths.
  for (const w of [1440, 1024, 820]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(700);
    const bar = await page.evaluate(() => {
      const el = document.getElementById("wb-topbar");
      const r = el.getBoundingClientRect();
      const past = [...el.querySelectorAll("*")]
        .filter((c) => c.getBoundingClientRect().width > 0 && c.getBoundingClientRect().right > window.innerWidth - 0.5)
        .map((c) => `${c.tagName.toLowerCase()}${c.id ? "#" + c.id : "." + (c.className || "").toString().split(" ")[0]}@${Math.round(c.getBoundingClientRect().right)}`);
      return {
        right: Math.round(r.right), width: Math.round(r.width), win: window.innerWidth,
        scrollW: el.scrollWidth, clientW: el.clientWidth,
        past: past.slice(0, 6), pastCount: past.length,
      };
    });
    console.log(`  topbar @${w}: ${JSON.stringify(bar)}`);
    check(`the map top bar stays inside the window at ${w}`,
      bar.right <= bar.win + 0.5 && bar.pastCount === 0,
      `right ${bar.right} in ${bar.win}, ${bar.pastCount} children past the edge${bar.past.length ? " (" + bar.past.join(", ") + ")" : ""}`);
    check(`the map top bar does not scroll sideways at ${w}`,
      bar.scrollW <= bar.clientW + 1, `scrollWidth ${bar.scrollW} vs clientWidth ${bar.clientW}`);
  }

  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
