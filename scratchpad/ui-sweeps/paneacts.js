// Every Settings pane's own main action, and where it sits (design-rows-1005).
//
// A pane's dock holds its title, its index and its '?'; the pane's one
// "make a new one" action (New persona, Add your own, New skill) used to sit
// in a fold further down. This lists, per pane, the dock's controls and the
// pane's non-ghost buttons outside the dock, with whether each is visible
// and whether it sits inside a fold. `IN_DOCK` counts the actions the dock
// now carries; a pane named in EXPECT must have its action there.
//   BASE=http://127.0.0.1:8877 VIEWPORT=390x844 THEME=dark node paneacts.js
const { boot } = require("./lib.js");
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
// pane -> the id of the action its dock must carry.
const EXPECT = JSON.parse(process.env.EXPECT || "{}");

(async () => {
  const { page, browser } = await boot({ viewport: { width: vw, height: vh },
    ...(vw < 600 ? { hasTouch: true, isMobile: true } : {}) });
  await page.evaluate(() => openSettingsModal("models"));
  await page.waitForTimeout(900);
  const sections = await page.evaluate(() => [...new Set([...document.querySelectorAll("#settings-modal [data-section]")].map((b) => b.dataset.section))]);
  let fails = 0;
  for (const s of sections) {
    await page.evaluate((s) => openSettingsModal(s), s);
    await page.waitForTimeout(450);
    const r = await page.evaluate(() => {
      const pane = [...document.querySelectorAll("#settings-modal .settings-section, #settings-modal .settings-pane, #settings-modal [data-pane]")].find((p) => p.checkVisibility());
      if (!pane) return null;
      const dock = pane.querySelector(":scope > .dock, :scope > .settings-pane-title");
      const label = (b) => `${b.id || "-"}"${b.textContent.trim().replace(/\s+/g, " ").slice(0, 24)}"`;
      const dockActs = dock ? [...dock.querySelectorAll(".dock-actions button")].filter((b) => !b.matches(".help-toggle, [data-help-for]") && b.checkVisibility()) : [];
      const db = dock && dock.getBoundingClientRect();
      const rows = dock ? new Set([...dock.querySelectorAll("button")].filter((b) => b.checkVisibility()).map((b) => Math.round((b.getBoundingClientRect().top + b.getBoundingClientRect().bottom) / 24))).size : 0;
      const btns = [...pane.querySelectorAll("button")].filter((b) => !/\b(ghost|icon-only|link|settings-index-link)\b/.test(b.className)
        && !b.closest(".seg, .segmented-control, .dock") && b.checkVisibility());
      return { id: pane.id, dockActs: dockActs.map((b) => `${label(b)} ${Math.round(b.getBoundingClientRect().height)}px`), dockH: db ? Math.round(db.height) : 0, rows,
        sw: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        filledOutside: btns.slice(0, 6).map((b) => label(b) + (b.closest("details") ? "(fold)" : "")) };
    });
    if (!r) { console.log(s, "no pane"); continue; }
    // A dock's "New ..." (data-opens): pressed, the cursor is in the form's
    // first field and that field is on screen, not under the sticky dock.
    const pressed = await page.evaluate(() => {
      const pane = [...document.querySelectorAll("#settings-modal .settings-section")].find((p) => p.checkVisibility());
      const opener = pane && pane.querySelector(".settings-pane-title [data-opens]");
      if (!opener) return null;
      const h = Math.round(opener.getBoundingClientRect().height);
      opener.click();
      const field = document.getElementById(opener.dataset.opens);
      const dock = pane.querySelector(".settings-pane-title").getBoundingClientRect();
      const fr = field.getBoundingClientRect();
      return { field: opener.dataset.opens, h, focused: document.activeElement === field, clear: fr.top >= dock.bottom - 1 && fr.bottom <= innerHeight };
    });
    if (pressed) {
      const good = pressed.focused && pressed.clear;
      if (!good) fails++;
      console.log(`${good ? "" : "FAIL "}${s.padEnd(12)} New -> ${pressed.field}: focused ${pressed.focused}, in view ${pressed.clear}, ${pressed.h}px`);
    } else if (["personas", "skills", "templates"].includes(s)) { fails++; console.log(`FAIL ${s} has no New in its dock`); }
    const want = EXPECT[s];
    // A phone's dock: the title row and at most one row of jump links.
    const ok = (!want || r.dockActs.some((a) => a.startsWith(want + '"'))) && !(vw < 600 && r.dockH > 120);
    if (!ok) fails++;
    console.log(`${ok ? "" : "FAIL "}${s.padEnd(12)} dock ${r.dockH}px/${r.rows}row [${r.dockActs.join(", ")}] outside: ${r.filledOutside.join(" | ")}${r.sw > 0 ? " SIDEWAYS " + r.sw : ""}`);
  }
  console.log(`paneacts ${vw}x${vh} ${process.env.THEME || "light"}: ${fails} failing`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
