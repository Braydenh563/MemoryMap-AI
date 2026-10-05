// DOCUMENTS_PLAN's table-cell row: "`docRevealForSuggest` will not bring a
// table-cell word into view". Seeds a long document whose last table has a
// flagged word in a cell and one in a header, presses the findings panel's row
// for each (the editor sits at the top, so the jump has to scroll a long way),
// and reads, in numbers: the word's mark box against the editor's scroller box
// (inside it, with its whole height), and the floating menu against the word
// (no overlap on both axes).
//
//   BASE=http://127.0.0.1:8802 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/revealcell.js            (WIDTH=1440 by default)
const { boot } = require("./lib.js");

const WIDTH = Number(process.env.WIDTH || 1440);
// The cells are real table cells in Live (`.cm-md-td`), which is where the row
// was reported; VIEW=source reads the same text as plain lines.
const VIEW = process.env.VIEW || "live";
const FILL = "The quick brown fox jumped over the lazy dog and then went home again. ";
const CONTENT = [
  "Table probe",
  "",
  ...Array.from({ length: 70 }, (_, i) => `Filler paragraph ${i + 1}. ${FILL}`),
  "",
  "| name | status |",
  "| --- | --- |",
  "| alpha | seperate |",
  "| beta | fine |",
  "| gamma | definately |",
  "",
  "A last line after the table.",
].join("\n");

let failures = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok || !detail ? "" : "  " + detail}`);
};

(async () => {
  const phone = WIDTH < 600;
  const { page, browser } = await boot({
    viewport: { width: WIDTH, height: phone ? 844 : 900 },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  await page.evaluate(async () => { await ensureModule("library"); });
  const doc = await page.evaluate(async (content) => {
    const r = await api("/documents", { method: "POST", body: JSON.stringify({ title: "Reveal cell " + Date.now(), content, file_type: "md" }) });
    return await r.json();
  }, CONTENT);
  await page.evaluate(async ([id, view]) => {
    switchTab("documents");
    await new Promise((r) => setTimeout(r, 400));
    await openDocument(id);
    await new Promise((r) => setTimeout(r, 900));
    setDocView(view);
  }, [doc.id, VIEW]);
  await page.waitForTimeout(2500);
  console.log(`view ${VIEW} at ${WIDTH}`);
  const found = await page.evaluate(() => docProseFound.map((f) => f.text));
  check("both table words are findings", found.includes("seperate") && found.includes("definately"), JSON.stringify(found));
  for (const word of ["seperate", "definately"]) {
    await page.evaluate(() => {
      closeDocSuggest();
      docSurface().scrollTop = 0;
      const chip = document.getElementById("doc-prose");
      if (chip.getAttribute("aria-expanded") !== "true") chip.click();
    });
    await page.waitForTimeout(800);
    await page.evaluate((w) => {
      const row = [...document.querySelectorAll("#doc-prose-panel .doc-prose-jump")].find((r) => r.textContent.includes(w));
      row?.click();
    }, word);
    await page.waitForTimeout(1200);
    const m = await page.evaluate((w) => {
      const scroller = docSurface().scrollEl.getBoundingClientRect();
      const mark = docFindingMarks().find((el) => el._docFinding.text === w);
      const sel = document.querySelector(".cm-selectionBackground");
      const rect = (mark ? mark.getClientRects()[0] : sel?.getBoundingClientRect()) || null;
      const menu = document.getElementById("doc-suggest-menu");
      const open = menu && !menu.classList.contains("hidden");
      const mr = open ? menu.getBoundingClientRect() : null;
      const overlapX = rect && mr ? Math.min(rect.right, mr.right) - Math.max(rect.left, mr.left) : 0;
      const overlapY = rect && mr ? Math.min(rect.bottom, mr.bottom) - Math.max(rect.top, mr.top) : 0;
      return {
        marked: Boolean(mark),
        // In Live the word is inside a drawn table cell; in Source it is a line.
        inCell: Boolean(mark?.closest(".cm-md-td")),
        inScroller: rect ? rect.top >= scroller.top - 0.5 && rect.bottom <= scroller.bottom + 0.5 : false,
        rect: rect ? [Math.round(rect.top), Math.round(rect.bottom)] : null,
        scroller: [Math.round(scroller.top), Math.round(scroller.bottom)],
        floatingOpen: Boolean(open),
        covers: overlapX > 1 && overlapY > 1,
      };
    }, word);
    check(`${word}: its mark is drawn after the jump`, m.marked, JSON.stringify(m));
    if (VIEW === "live") check(`${word}: it is in a drawn table cell`, m.inCell, JSON.stringify(m));
    check(`${word}: its whole box is inside the editor's scroller`, m.inScroller, JSON.stringify(m));
    check(`${word}: nothing floats over it`, !m.covers, JSON.stringify(m));
  }
  await browser.close();
  console.log(failures ? `${failures} FAILED` : "all ok");
  process.exit(failures ? 1 : 0);
})();
