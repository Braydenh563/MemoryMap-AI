// Every on/off row in Settings on one recipe, with no filled bar at rest
// (OPEN.md, Settings and help, "Toggle rows onto one recipe (no
// lavender-filled bars)"; DESIGN.md's recipe index: "An on/off setting is
// `label.setting-check` with the switch first"). Walks every Settings
// section, groups each visible checkbox by the row that holds it, and reports
// rows that are not `.setting-check` and rows whose background is painted
// while the pointer is elsewhere.
//   BASE=http://127.0.0.1:8798 VIEWPORT=390x844 THEME=dark node togglerows.js
const { boot } = require("./lib.js");

const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);

(async () => {
  const { page, browser } = await boot({ viewport: { width: vw, height: vh } });
  await page.mouse.move(1, 1);
  const rows = new Map();
  const painted = [];
  const offRecipe = new Map();
  await page.evaluate(() => openSettingsModal("models"));
  await page.waitForTimeout(800);
  const SECTIONS = await page.evaluate(() => [...document.querySelectorAll("#settings-modal [data-section]")].map((b) => b.dataset.section));
  for (const s of SECTIONS) {
    await page.evaluate((s) => openSettingsModal(s), s);
    await page.waitForTimeout(500);
    const found = await page.evaluate(() => {
      const out = [];
      const root = document.getElementById("settings-modal") || document;
      for (const el of root.querySelectorAll('input[type="checkbox"]')) {
        if (!el.checkVisibility || !el.checkVisibility()) continue;
        if (el.classList.contains("sr-only")) continue;
        const row = el.closest("label") || el.parentElement;
        const bg = getComputedStyle(row).backgroundColor;
        const clear = bg === "rgba(0, 0, 0, 0)" || bg === "transparent";
        const rr = row.getBoundingClientRect();
        const ir = el.getBoundingClientRect();
        const cs = getComputedStyle(row);
        const first = [...row.children].find((c) => c.checkVisibility && c.checkVisibility()) === el;
        out.push({
          shape: `switch ${Math.round(ir.width)}x${Math.round(ir.height)} at +${Math.round(ir.left - rr.left)}, ${first ? "first" : "not first"}, pad ${cs.paddingLeft}/${cs.paddingTop}, gap ${cs.columnGap}, font ${cs.fontSize}, align ${cs.alignItems}`,
          id: el.id || "(no id)",
          row: row.tagName.toLowerCase() + "." + [...row.classList].join("."),
          recipe: row.classList.contains("setting-check"),
          bg: clear ? "" : bg,
        });
      }
      return out;
    });
    for (const f of found) {
      rows.set(`${s}:${f.id}`, f);
      if (!f.recipe) offRecipe.set(f.row, (offRecipe.get(f.row) || []).concat(`${s}:${f.id}`));
      if (f.bg) painted.push(`${s}:${f.id} ${f.row} ${f.bg}`);
    }
  }
  console.log(`switch rows measured: ${rows.size}`);
  console.log(`on .setting-check: ${[...rows.values()].filter((r) => r.recipe).length}`);
  for (const [row, ids] of offRecipe) console.log(`OFF RECIPE ${row}: ${ids.length} (${ids.slice(0, 4).join(", ")})`);
  for (const p of painted) console.log(`PAINTED AT REST ${p}`);
  const shapes = new Map();
  for (const [k, r] of rows) {
    const key = `${r.recipe ? "setting-check" : r.row}: ${r.shape}`;
    shapes.set(key, (shapes.get(key) || []).concat(k));
  }
  for (const [k, ids] of shapes) console.log(`SHAPE ${k} x${ids.length} (${ids.slice(0, 3).join(", ")})`);
  await browser.close();
})();
