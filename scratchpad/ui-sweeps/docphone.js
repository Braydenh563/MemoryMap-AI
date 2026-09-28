// The Documents editor on a phone and a tablet (INBOX 430: "on phone, the
// Documents editor's lower half is blank or cut off; rework its controls for
// phone and tablet"). A long document opened at 390x844, 768x1024 and
// 1024x768 with touch: the writing surface's box against the window, the
// share of the window between the header and the bottom bar that is text,
// how much of it the toolbars take, whether the surface ends before the
// window does (a blank band) or runs under the bottom bar (cut off), and
// whether it scrolls to its last line. Shots to scratchpad/shots/phone430/.
//   TAG=before node scratchpad/ui-sweeps/docphone.js
const path = require("path");
const { boot } = require("./lib.js");
const TAG = process.env.TAG || "after";
const SIZES = (process.env.SIZES || "390x844,768x1024,1024x768").split(",").map((s) => s.split("x").map(Number));
const CONTENT = [
  "# Phone probe",
  "",
  "The first line of the document.",
  "",
  ...Array.from({ length: 30 }, (_, i) => `## Heading ${i + 1}\n\nA paragraph under heading ${i + 1} with enough words in it to wrap at any width worth measuring.`),
  "",
  "The last line of the document.",
].join("\n");

(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + detail : ""}`);
  };
  for (const [w, h] of SIZES) {
    const { page, browser } = await boot({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const id = await page.evaluate(async (content) => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
      const d = await (await fetch("/documents", { method: "POST", headers, body: JSON.stringify({ title: "Phone probe", content }) })).json();
      switchTab("documents");
      await new Promise((r) => setTimeout(r, 800));
      await openDocument(d.id);
      await new Promise((r) => setTimeout(r, 2500));
      return d.id;
    }, CONTENT);
    for (const view of ["rendered", "live"]) {
    await page.evaluate(async (v) => {
      if (typeof setDocView === "function") setDocView(v);
      await new Promise((r) => setTimeout(r, 1200));
    }, view);
    const m = await page.evaluate(() => {
      const r = (el) => {
        if (!el || !el.getClientRects().length) return null;
        const b = el.getBoundingClientRect();
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right), h: Math.round(b.height) };
      };
      const header = r(document.getElementById("top-bar"));
      const tabs = r(document.getElementById("phone-tab-dock"));
      //: The first bar at the foot: the phone's tab bar, or the app's own
      //: status bar where there is no tab bar.
      const status = r(document.getElementById("status-bar"));
      const floor = Math.min(tabs ? tabs.top : innerHeight, status && status.h > 4 ? status.top : innerHeight);
      //: Whichever surface is showing: the rendered page (Read, a phone's
      //: default) or the editor.
      const visible = (el) => el && el.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
      const surface = [document.getElementById("doc-preview"), document.querySelector("#tab-documents .cm-editor"), document.getElementById("doc-content")].find(visible);
      const scroller = surface?.querySelector(".cm-scroller") || surface;
      const s = r(surface);
      const bars = [...document.querySelectorAll("#tab-documents .doc-toolbar, #tab-documents .doc-dock, #tab-documents .doc-crumbs, #tab-documents .doc-title-row, #doc-title")]
        .map((el) => ({ name: el.id || el.className.toString().split(" ")[0], box: r(el) }))
        .filter((x) => x.box && x.box.bottom > 0 && x.box.top < innerHeight);
      const bar = document.getElementById("doc-phone-bar");
      const barBox = visible(bar) ? r(bar) : null;
      const lines = [...(surface?.querySelectorAll(".cm-line, p, h1, h2") || [])].filter((l) => {
        const b = l.getBoundingClientRect();
        return b.height && b.top >= (header?.bottom || 0) && b.bottom <= floor && l.textContent.trim();
      });
      return {
        window: [innerWidth, innerHeight],
        header: header && header.bottom,
        floor,
        surface: s,
        bars: bars.map((b) => `${b.name} ${b.box.top}-${b.box.bottom}`),
        textLinesOnScreen: lines.length,
        blankBelow: s ? Math.max(0, floor - s.bottom) : null,
        underBar: s ? Math.max(0, Math.min(s.bottom, innerHeight) - floor) : null,
        scroller: { client: scroller?.clientHeight, scroll: scroller?.scrollHeight, overflow: scroller ? getComputedStyle(scroller).overflowY : "" },
        pageScroll: [document.scrollingElement.scrollHeight, innerHeight],
        formatBar: barBox ? `${barBox.top}-${barBox.bottom}` : "hidden",
        formatBarOverTabs: Boolean(barBox && tabs && barBox.bottom > tabs.top + 1),
      };
    });
    console.log(`     ${w}x${h} ${view}`, JSON.stringify(m));
    await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `doc-${TAG}-${w}-${view}.png`) });
    if (!m.surface) {
      check(`${w} ${view}: a writing surface is on screen`, false);
      continue;
    }
    //: The share of the space between the header and the bottom bar that the
    //: document's own surface takes.
    const usable = m.floor - m.header;
    const share = Math.round((Math.min(m.surface.bottom, m.floor) - Math.max(m.surface.top, m.header)) / usable * 100);
    check(`${w} ${view}: the document is most of the screen`, share >= (w < 600 ? 55 : 50), `${share}% of ${usable}px, ${m.textLinesOnScreen} lines`);
    check(`${w} ${view}: the formatting bar is not over the tab bar`, !m.formatBarOverTabs, m.formatBar);
    if (view === "rendered") check(`${w} ${view}: no formatting bar while reading`, m.formatBar === "hidden" || w >= 600, m.formatBar);
    //: The last line can be reached: scrolled to the end, it is on screen.
    const last = await page.evaluate(async () => {
      const scroller = document.querySelector("#tab-documents .cm-scroller");
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
      for (const el of document.querySelectorAll("#tab-documents *")) {
        if (el.scrollHeight > el.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = el.scrollHeight;
      }
      await new Promise((r) => setTimeout(r, 400));
      const floor = document.getElementById("phone-tab-dock")?.getBoundingClientRect().top || innerHeight;
      const line = [...document.querySelectorAll("#tab-documents .cm-line, #doc-preview p")].filter((l) => l.getClientRects().length).find((l) => /The last line/.test(l.textContent));
      if (!line) return "not rendered";
      const b = line.getBoundingClientRect();
      return b.bottom <= floor + 1 && b.top >= 0 ? "on screen" : `at ${Math.round(b.top)}-${Math.round(b.bottom)}, floor ${Math.round(floor)}`;
    });
    check(`${w} ${view}: the last line can be scrolled into view`, last === "on screen", last);
    await page.screenshot({ path: path.join(__dirname, "..", "shots", "phone430", `doc-${TAG}-${w}-${view}-end.png`) });
    }
    check(`${w}: no page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    await page.evaluate(async (docId) => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "" };
      await fetch(`/documents/${docId}`, { method: "DELETE", headers });
    }, id);
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : "the editor fills the screen");
  process.exit(fails ? 1 : 0);
})();
