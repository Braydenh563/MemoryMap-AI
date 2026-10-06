// WORLD_CLASS_PLAN 507 (dock audit 479 follow-ups): numbers, not screenshots.
//   BASE=http://127.0.0.1:8893 SCRATCH=/tmp/s507 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   [VIEWPORT=390x844] node scratchpad/ui-sweeps/dock507.js
const { boot } = require("./lib.js");
const [W, H] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const touch = W < 600;
(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: H }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  const out = [];
  const log = (k, v) => out.push(`${k}: ${JSON.stringify(v)}`);
  const goLib = async (sub) => {
    await page.evaluate(() => document.getElementById("tab-btn-library")?.click());
    await page.waitForTimeout(500);
    await page.evaluate((s) => document.querySelector(`#library-subtabs [data-target="${s}"]`)?.click(), sub);
    await page.waitForTimeout(700);
  };
  const box = (sel) =>
    page.evaluate((s) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, fg: cs.color };
    }, sel);
  // 1. help '?' on All, Documents, Bookmarks
  for (const [sub, btn, panel] of [
    ["library-view-documents", "library-help-toggle", "library-help"],
    ["library-view-docs", "library-docs-help-toggle", "library-docs-help"],
    ["library-view-links", "bookmark-help-toggle", "bookmark-help"],
  ]) {
    await goLib(sub);
    const before = await box("#" + btn);
    await page.focus("#" + btn);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const open = await page.evaluate((p) => {
      const e = document.getElementById(p);
      const r = e.getBoundingClientRect();
      return { hidden: e.classList.contains("hidden"), w: Math.round(r.width), h: Math.round(r.height), inView: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
    }, panel);
    const exp = await page.getAttribute("#" + btn, "aria-expanded");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const closed = await page.evaluate((p) => document.getElementById(p).classList.contains("hidden"), panel);
    const dock = await page.evaluate((b) => {
      const d = document.getElementById(b).closest(".dock");
      const ys = [...d.querySelectorAll(":scope > .dock-actions > *")].filter((e) => e.offsetParent && !e.classList.contains("help-body")).map((e) => Math.round(e.getBoundingClientRect().y));
      return { h: Math.round(d.getBoundingClientRect().height), actionRows: new Set(ys).size, order: [...d.querySelectorAll(":scope > .dock-actions > *")].filter((e) => e.offsetParent).map((e) => e.id || e.className.split(" ")[0]) };
    }, btn);
    log(btn, { before, openOnEnter: !open.hidden && exp === "true", panel: open, closedOnEscape: closed, dock });
  }
  // 2. reminders
  await page.evaluate(() => document.getElementById("tab-btn-reminders")?.click());
  await page.waitForTimeout(600);
  if (touch) {
    await page.evaluate(() => document.getElementById("reminders-new")?.click());
    await page.waitForTimeout(500);
  }
  log(
    "reminders",
    await page.evaluate(() => {
      const card = document.getElementById("reminder-compose");
      const bs = [...card.querySelectorAll("button")].filter((b) => b.offsetParent && /\badd\b/i.test(b.textContent + " " + (b.getAttribute("aria-label") || "") + " " + b.title));
      const m = document.getElementById("reminder-magic-add");
      const r = m.getBoundingClientRect();
      const f = document.getElementById("reminder-add").getBoundingClientRect();
      const t = document.getElementById("reminder-magic").getBoundingClientRect();
      return {
        visibleAddish: bs.map((b) => (b.textContent.trim() || "(icon)") + "|" + (b.getAttribute("aria-label") || "")),
        wordedAdd: bs.filter((b) => b.textContent.trim() === "Add").length,
        magic: { w: Math.round(r.width), h: Math.round(r.height), fieldH: Math.round(t.height), name: m.getAttribute("aria-label"), title: m.title },
        formAddH: Math.round(f.height),
      };
    })
  );
  // 3. boards and maps
  await goLib("library-view-whiteboard");
  const nm = "#wb-boards-new-menu";
  log("new summary", await box(nm + " > summary"));
  log(
    "dock",
    await page.evaluate(() => {
      const d = document.querySelector('[data-dock-name="library-boards"]');
      const ctr = [...d.querySelectorAll("button,summary,input,select")].filter((e) => e.offsetParent && !e.closest(".dock-menu-list") && !e.closest(".seg") && !e.closest(".select-shell")).length;
      return { h: Math.round(d.getBoundingClientRect().height), controls: ctr, scrollW: d.scrollWidth, clientW: d.clientWidth };
    })
  );
  await page.focus(nm + " > summary");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  log(
    "menu open",
    await page.evaluate(() => {
      const l = document.querySelector("#wb-boards-new-menu .dock-menu-list") || document.querySelector(".action-menu-escaped.doc-dock-menu-list");
      const r = l.getBoundingClientRect();
      return { open: document.getElementById("wb-boards-new-menu").open, rows: [...l.querySelectorAll("button")].map((b) => b.textContent.trim()), inView: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, left: Math.round(r.left), right: Math.round(r.right) };
    })
  );
  await page.keyboard.press("ArrowDown");
  log("focus after ArrowDown", await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  log("after Escape", await page.evaluate(() => ({ open: document.getElementById("wb-boards-new-menu").open, focus: document.activeElement?.tagName })));
  for (const id of ["wb-boards-new", "wb-boards-new-map"]) {
    await goLib("library-view-whiteboard");
    await page.evaluate(() => {
      const c = document.getElementById("wb-canvas-view");
      if (c && !c.classList.contains("hidden")) wbShowBoardsLanding();
    });
    await page.waitForTimeout(300);
    await page.click(nm + " > summary");
    await page.waitForTimeout(200);
    await page.click("#" + id);
    await page.waitForTimeout(900);
    log(
      "row " + id,
      await page.evaluate(() => ({
        dialog: !!document.querySelector(".prompt-card"),
        dialogText: (document.querySelector(".prompt-card")?.innerText || "").slice(0, 80),
        menuOpen: document.getElementById("wb-boards-new-menu").open,
        onCanvas: !document.getElementById("wb-canvas-view").classList.contains("hidden"),
      }))
    );
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  console.log(out.join("\n"));
  await page.screenshot({ path: `${process.env.SCRATCH || "."}/dock507-${W}.png` });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
