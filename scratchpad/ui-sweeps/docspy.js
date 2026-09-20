// Probe: the outline's scroll-spy and the caret.
//
// OPEN.md: "The scroll-spy follows the viewport, not the caret: typing in a
// section below the one at the top of the view marks the wrong heading until
// the view scrolls." Measured here on a document whose sections are short
// enough that two headings share the visible box, which is the case the report
// is about: with the caret in the lower of the two, the outline has to mark
// that one, and once the caret is scrolled out of sight the viewport takes
// over again.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };

const SECTIONS = 12;
let body = "";
for (let i = 1; i <= SECTIONS; i += 1) {
  body += `## Section ${i}\n\n`;
  for (let line = 0; line < 4; line += 1) body += `Body line ${line} of section ${i}.\n`;
  body += "\n";
}

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.evaluate(async (content) => {
    const r = await api("/documents", { method: "POST",
      body: JSON.stringify({ title: "Spy probe", content }) });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
  }, body);
  await page.waitForTimeout(2500);
  await page.evaluate(() => showDocSidebarSection("outline"));
  await page.waitForTimeout(600);

  const marked = () => page.evaluate(() => {
    const el = document.querySelector("#doc-outline .outline-link.is-current");
    return el ? el.textContent.replace(/\d+\/\d+$/, "").trim() : null;
  });
  const shape = await page.evaluate(() => {
    const view = docSurface().view;
    const r = view.scrollDOM.getBoundingClientRect();
    return { h: Math.round(r.height), scrollH: Math.round(view.scrollDOM.scrollHeight), rows: document.querySelectorAll("#doc-outline .outline-link").length };
  });
  console.log(`      editor box ${shape.h}px of ${shape.scrollH}px, ${shape.rows} outline rows`);
  ok("the document scrolls", shape.scrollH > shape.h + 40, JSON.stringify(shape));

  // Top of the document: section 1 is both the top of the view and the caret's.
  await page.evaluate(() => { docSurface().view.scrollDOM.scrollTop = 0; docSurface().setSelection(0, 0); });
  await page.waitForTimeout(400);
  ok("at the top the first heading is marked", (await marked()) === "Section 1", await marked());

  // The caret moves down into a section that is *on screen* but below the top
  // of the view, without scrolling: the line the writer is on is section 3 or
  // lower while the top of the box still shows section 1.
  const moved = await page.evaluate(() => {
    const box = docSurface();
    const view = box.view;
    const frame = view.scrollDOM.getBoundingClientRect();
    const text = box.text;
    // The last heading whose line is still inside the visible box.
    let pick = null;
    for (const match of text.matchAll(/^## Section (\d+)$/gm)) {
      const coords = view.coordsAtPos(match.index);
      if (!coords) continue;
      if (coords.top >= frame.top && coords.bottom <= frame.bottom) pick = { at: match.index, n: Number(match[1]) };
    }
    if (!pick) return null;
    const line = view.state.doc.lineAt(pick.at);
    const to = Math.min(line.to + 12, text.length);
    box.focus();
    box.setSelection(to, to);
    return { n: pick.n, scrollTop: Math.round(view.scrollDOM.scrollTop) };
  });
  await page.waitForTimeout(500);
  ok("a lower heading is on screen to move into", Boolean(moved), JSON.stringify(moved));
  ok("the caret's own section is marked", moved && (await marked()) === `Section ${moved.n}`,
    `${await marked()} while the caret is in Section ${moved && moved.n}`);
  ok("the view did not have to scroll for it", moved && moved.scrollTop === 0, moved && moved.scrollTop);

  // Scroll away from the caret: the viewport takes over, because the reader is
  // no longer looking at the line they were writing on.
  const away = await page.evaluate(() => {
    const view = docSurface().view;
    view.scrollDOM.scrollTop = view.scrollDOM.scrollHeight;
    return Math.round(view.scrollDOM.scrollTop);
  });
  await page.waitForTimeout(600);
  const last = await marked();
  ok("scrolled to the end, the last heading is marked", last === `Section ${SECTIONS}`, `${last} at scrollTop ${away}`);

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
