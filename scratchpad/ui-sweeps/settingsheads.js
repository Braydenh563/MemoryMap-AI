// Every Settings pane's head and every Library sub-tab's dock, as numbers
// (INBOX 599: "can you clean up and redesign this top docks?? ... keep doing
// it for the settings pages ... make sure all the design styles across all
// pages and popups are consistent").
//
// For each head: how many rows its controls sit on, the distinct control
// heights, how many filled buttons, the title's size and weight, the head's
// own height and its gap to what follows, and a strip screenshot. A head is
// the pane's `.dock` when it has one, else its first `.help-head` row.
//   BASE=http://127.0.0.1:8798 VIEWPORT=390x844 THEME=dark node settingsheads.js
// ONLY=settings or ONLY=library measures one half. SHOTS=1 writes a strip per head to $SCRATCH/shots/heads-*.png.
const { boot } = require("./lib.js");

const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const theme = process.env.THEME || "light";

const measure = (headSel) => {
  const head = typeof headSel === "string" ? document.querySelector(headSel) : headSel;
  if (!head || !head.checkVisibility()) return null;
  const WRAP = ".seg, .segmented-control, .select-shell, .search-field";
  const ctrls = [...head.querySelectorAll("button, select, input, summary, .seg, .segmented-control, .select-shell, .search-field")].filter((c) => {
    const b = c.getBoundingClientRect();
    if (b.width <= 2 || b.height <= 2) return false;
    if (c.closest(".dock-menu-list, .help-body, .doc-dock-menu-list")) return false;
    if (c.matches(".dock-native-hidden, .visually-hidden, .sr-only")) return false;
    const wrap = c.parentElement && c.parentElement.closest(WRAP);
    if (wrap && head.contains(wrap)) return false;
    return true;
  });
  const tops = [...new Set(ctrls.map((c) => {
    const b = c.getBoundingClientRect();
    return Math.round((b.top + b.bottom) / 2 / 12);
  }))];
  const filled = ctrls.filter((c) => (c.tagName === "BUTTON" || c.tagName === "SUMMARY")
    && !/\b(ghost|icon-only|link)\b/.test(c.className) && !c.closest(".seg, .segmented-control")
    && getComputedStyle(c).backgroundColor !== "rgba(0, 0, 0, 0)").length;
  const title = head.querySelector("h2, h3, .dialog-head-title");
  const ts = title ? getComputedStyle(title) : null;
  const hb = head.getBoundingClientRect();
  const next = head.nextElementSibling;
  return {
    kind: head.classList.contains("dock") ? "dock" : "help-head",
    h: Math.round(hb.height),
    rows: tops.length,
    controls: ctrls.length,
    heights: [...new Set(ctrls.map((c) => Math.round(c.getBoundingClientRect().height)))].sort((a, b) => a - b).join("/"),
    filled,
    title: ts ? `${ts.fontSize} ${ts.fontWeight}` : "none",
    gapBelow: next ? Math.round(next.getBoundingClientRect().top - hb.bottom) : null,
  };
};

(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: vw, height: vh } });
  const out = [];
  await page.evaluate(() => openSettingsModal("models"));
  await page.waitForTimeout(900);
  const only = process.env.ONLY || "";
  const sections = only === "library" ? [] : await page.evaluate(() => [...document.querySelectorAll("#settings-modal nav [data-section], #settings-modal .settings-nav [data-section]")].map((b) => b.dataset.section));
  for (const s of sections) {
    await page.evaluate((s) => openSettingsModal(s), s);
    await page.waitForTimeout(450);
    const r = await page.evaluate(`(${measure})(document.querySelector("#settings-${s} > .dock") || document.querySelector("#settings-${s} > .help-head") || document.querySelector("#settings-${s} .help-head"))`);
    out.push([`settings:${s}`, r]);
    if (process.env.SHOTS && r) {
      const box = await page.evaluate((s) => { const b = document.getElementById(`settings-${s}`).getBoundingClientRect(); return { x: b.left, y: b.top, width: b.width, height: 140 }; }, s);
      await page.screenshot({ path: `${OUT}/heads-settings-${s}-${vw}-${theme}.png`, clip: box }).catch(() => {});
    }
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(700);
  const subs = only === "settings" ? [] : await page.evaluate(() => [...document.querySelectorAll("#tab-library [data-target^='library-view-']")].map((b) => b.dataset.target));
  for (const t of subs) {
    await page.evaluate((t) => document.querySelector(`[data-target="${t}"]`).click(), t);
    await page.waitForTimeout(700);
    const r = await page.evaluate(`(${measure})([...document.querySelectorAll("#${t} .dock")].find((d) => d.checkVisibility()))`);
    out.push([`library:${t.replace("library-view-", "")}`, r]);
    if (process.env.SHOTS && r) {
      const box = await page.evaluate((t) => { const d = [...document.querySelectorAll(`#${t} .dock`)].find((d) => d.checkVisibility()); const b = d.getBoundingClientRect(); return { x: 0, y: Math.max(0, b.top - 8), width: innerWidth, height: b.height + 16 }; }, t);
      await page.screenshot({ path: `${OUT}/heads-library-${t}-${vw}-${theme}.png`, clip: box }).catch(() => {});
    }
  }
  for (const [k, r] of out) console.log(k.padEnd(28), r ? JSON.stringify(r) : "(no head)");
  await browser.close();
})();
