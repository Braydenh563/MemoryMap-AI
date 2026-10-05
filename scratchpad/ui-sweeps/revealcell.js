// DOCUMENTS_PLAN placed row (OPEN.md editor-intelligence): `docRevealForSuggest`
// "will not bring a table-cell word into view". Seeds a table with a flagged
// word, scrolls the editor to the bottom and the top, asks for the menu on the
// finding the way a panel row does (`docOpenSuggestFor`), and logs the mark's
// rect against `.cm-scroller` before and after, and whether the menu opened
// attached to a word that is inside the visible box.
//
//   BASE=http://127.0.0.1:8796 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/revealcell.js
const { boot } = require("./lib.js");
const FILL = "The quick brown fox jumped over the lazy dog and then went home again. ";
const WIDE_HEAD = "| " + Array.from({ length: 14 }, (_, i) => `column ${i + 1} heading`).join(" | ") + " |";
const WIDE_RULE = "| " + Array.from({ length: 14 }, () => "---").join(" | ") + " |";
const WIDE_ROW = "| " + Array.from({ length: 14 }, (_, i) => (i === 12 ? "seperate" : `value ${i + 1}`)).join(" | ") + " |";
const CONTENT = [
  "Draft notes", "",
  ...Array.from({ length: 30 }, (_, i) => `Filler paragraph ${i + 1}. ${FILL}`), "",
  WIDE_HEAD, WIDE_RULE, WIDE_ROW, "",
  ...Array.from({ length: 30 }, (_, i) => `More filler ${i + 1}. ${FILL}`), "",
  "The very last line ends with definately",
].join("\n");

(async () => {
  const phone = process.env.PHONE === "1";
  const { page, browser } = await boot(phone ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {});
  await page.click('[data-tab="library"]').catch(() => {});
  await page.waitForTimeout(900);
  await page.evaluate(async (content) => {
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Reveal probe", content }),
    });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 2500));
  }, CONTENT);
  let bad = 0;
  for (const where of ["top", "bottom"]) {
    const out = await page.evaluate(async (where) => {
      closeDocSuggest();
      const s = document.querySelector(".cm-scroller");
      s.scrollTop = where === "top" ? 0 : s.scrollHeight;
      await new Promise((r) => setTimeout(r, 500));
      const finding = docProseFound.find((f) => /seperate/.test(f.text || ""));
      if (!finding) return { skip: "no finding", have: docProseFound.map((f) => f.text) };
      const rectOf = () => {
        const el = [...document.querySelectorAll("[data-doc-finding]")].find((n) => /seperate/i.test(n.textContent || ""));
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const sr = document.querySelector(".cm-scroller").getBoundingClientRect();
        return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), scrollerLeft: Math.round(sr.left), scrollerRight: Math.round(sr.right), scrollerTop: Math.round(sr.top), scrollerBottom: Math.round(sr.bottom), visible: r.top >= sr.top && r.bottom <= sr.bottom && r.left >= sr.left && r.right <= sr.right };
      };
      const before = rectOf();
      docOpenSuggestFor(finding, false);
      await new Promise((r) => setTimeout(r, 900));
      const after = rectOf();
      const menu = document.getElementById("doc-suggest-menu");
      const open = menu && !menu.classList.contains("hidden");
      const m = open ? menu.getBoundingClientRect() : null;
      return { before, after, scrollTop: Math.round(document.querySelector(".cm-scroller").scrollTop), open, menu: m && { top: Math.round(m.top), bottom: Math.round(m.bottom) } };
    }, where);
    const ok = !out.skip && out.open && out.after && out.after.visible;
    if (!ok) bad++;
    console.log(`from ${where}: ${JSON.stringify(out)}${ok ? "" : "  <<< word not on screen or menu closed"}`);
  }
  console.log(bad ? `FAIL: ${bad}` : "PASS");
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.log("ERR " + e.message); process.exit(1); });
