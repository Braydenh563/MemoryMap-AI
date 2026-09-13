// DOCUMENTS_PLAN Phase 6, measured before anything is built: what the editor
// actually does at the four widths the phase names (>=1100, 820-1100, 600-820,
// <600), rather than what a stylesheet with no breakpoint for it is assumed to
// do. Its acceptance is "errors.js at 390/820/1024 reports 0 findings on the
// editor; the first line of text is on screen with the keyboard open".
const { boot } = require("./lib.js");

const WIDTHS = [
  { w: 1440, h: 900, band: "desktop" },
  { w: 1024, h: 768, band: "820-1100" },
  { w: 800, h: 1000, band: "600-820" },
  { w: 390, h: 820, band: "phone" },
];

const CONTENT = [
  "# Narrow probe",
  "",
  "The first line of the document, which has to be on screen.",
  "",
  ...Array.from({ length: 12 }, (_, i) => `## Heading ${i + 1}\n\nA paragraph under heading ${i + 1} with enough words in it to wrap at any width worth measuring.`),
].join("\n");

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 140)));
  const fails = [];

  await page.evaluate(async (content) => {
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Narrow probe", content }),
    });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 2400));
  }, CONTENT);

  for (const { w, h, band } of WIDTHS) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const r = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { w: Math.round(b.width), h: Math.round(b.height), left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom) };
      };
      const shown = (sel) => {
        const el = document.querySelector(sel);
        return Boolean(el && el.getClientRects().length);
      };
      const toolbar = document.getElementById("doc-toolbar");
      const tbRows = toolbar
        ? new Set([...toolbar.children].filter((c) => c.getClientRects().length).map((c) => Math.round(c.getBoundingClientRect().top))).size
        : 0;
      const dock = document.querySelector("#tab-documents .dock");
      const dockRows = dock
        ? new Set([...dock.querySelectorAll(":scope > *")].filter((c) => c.getClientRects().length).map((c) => Math.round(c.getBoundingClientRect().top))).size
        : 0;
      const statusItems = [...document.querySelectorAll("#doc-status-bar > *, .doc-statusbar > *")].filter((c) => c.getClientRects().length).length;
      //: Anything whose own box leaves the window sideways, which is the
      //: finding that matters most at 390: the page must never scroll x.
      //: Only to the *right*, and that is not laziness: below 820 the three
      //: sidebars are sheets parked at `translateX(rail - 100%)`, so a closed
      //: one is deliberately most of the way off the left edge and a check that
      //: counted a negative `left` reported the feature as the bug (it did, on
      //: the first run of this probe: six findings, every one of them the sheet).
      const overflowing = [...document.querySelectorAll("#tab-documents *")]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.right > innerWidth + 1;
        })
        .slice(0, 6)
        .map((el) => (el.id ? "#" + el.id : el.className.toString().split(" ")[0] || el.tagName));
      //: The targets the *layout* hands a finger, against the 44px the phase
      //: names. A row inside an open menu is not one of them: its target is its
      //: whole width (225 to 271px at 390), and raising fifteen of them to 44
      //: makes the dock's menu 660px tall in an 820px window, which is the
      //: judgement 10-responsive.css's band 4 block records. DESIGN.md's global
      //: 28px floor is not what this measures either.
      const small = [...document.querySelectorAll("#tab-documents button:not(.hidden), #tab-documents [role='tab']")]
        .filter((el) => el.getClientRects().length && !el.closest(".doc-dock-menu-list, .dock-menu-list, .menu-list"))
        .map((el) => ({ id: el.id || el.className.toString().split(" ")[0], h: Math.round(el.getBoundingClientRect().height) }))
        .filter((x) => x.h < 44);
      const layout = document.querySelector(".doc-layout");
      const side = document.getElementById("doc-sidebar");
      return {
        pageScrollsX: document.documentElement.scrollWidth > innerWidth + 1,
        layoutCols: layout ? getComputedStyle(layout).gridTemplateColumns : null,
        oneColumn: layout ? getComputedStyle(layout).gridTemplateColumns.trim().split(/\s+/).filter((t) => t !== "0px").length === 1 : false,
        sheetParked: side ? getComputedStyle(side).position === "fixed" && side.getBoundingClientRect().left < 0 : false,
        railW: side ? Math.round(side.getBoundingClientRect().right) : null,
        sidebar: r("#doc-sidebar"),
        sidebarShown: shown("#doc-sidebar"),
        editor: r(".cm-editor") || r("#doc-content"),
        firstLine: (() => {
          const line = document.querySelector(".cm-line");
          if (!line) return null;
          const b = line.getBoundingClientRect();
          return { top: Math.round(b.top), onScreen: b.top >= 0 && b.bottom <= innerHeight };
        })(),
        measure: (() => {
          const el = document.querySelector(".cm-content");
          return el ? Math.round(el.getBoundingClientRect().width) : null;
        })(),
        toolbarRows: tbRows,
        toolbarShown: shown("#doc-toolbar"),
        dockRows,
        statusItems,
        overflowing,
        under44: small.length,
        under44worst: small.sort((a, b) => a.h - b.h).slice(0, 4),
      };
    });
    console.log(`== ${w}x${h} (${band})`);
    console.log("   " + JSON.stringify(m));
    if (m.pageScrollsX) fails.push(`${w}: the page scrolls sideways`);
    if (m.overflowing.length) fails.push(`${w}: ${m.overflowing.length} elements past the window edge (${m.overflowing.join(", ")})`);
    if (m.firstLine && !m.firstLine.onScreen) fails.push(`${w}: the first line of the document is off screen`);
    if (band === "phone") {
      if (m.under44 > 0) fails.push(`390: ${m.under44} targets under 44px (worst ${JSON.stringify(m.under44worst)})`);
      if (m.toolbarRows > 1) fails.push(`390: the formatting strip is ${m.toolbarRows} rows`);
    }
    //: One column from 820 down, which is the sheet doing its job rather than
    //: the sidebar being gone: what has to be true is that the layout's first
    //: track is the only one, and that the sheet is parked.
    if (band === "600-820" || band === "phone") {
      if (!m.oneColumn) fails.push(`${w}: the layout still has a sidebar track (${m.layoutCols})`);
      if (!m.sheetParked) fails.push(`${w}: the sidebar sheet is not parked off the left edge`);
    }
    if (m.measure !== null && m.measure < 240) fails.push(`${w}: the measure is ${m.measure}px`);
  }

  console.log("console errors: " + errs.length + (errs.length ? " " + JSON.stringify(errs.slice(0, 3)) : ""));
  if (errs.length) fails.push(`${errs.length} console errors`);
  await browser.close();
  if (fails.length) { console.log("FAIL\n- " + fails.join("\n- ")); process.exit(1); }
  console.log("PASS");
})();
