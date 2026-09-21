// INBOX 316: the fold arrows in the documents gutter, measured.
//
// The owner, 2026-09-21, with a screenshot of the gutter: "make these
// dropdown arrows actually aligned and proper icons". CodeMirror's
// `foldGutter` draws a text triangle by default, which came out as a typed
// "v" in this app's font and could not line up with the numbers beside it,
// because a glyph's box belongs to the font rather than to the line.
//
// Two measurements, because the report is two claims: the marker is one of
// the app's own `ph` icons and not a character, and its centre sits on the
// centre of the line number in the same row.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};

const DOC = [
  "# Introduction",
  "The first section, with a paragraph under it so it can fold.",
  "",
  "## A subsection",
  "Which folds too.",
  "",
  "```python",
  "def hello():",
  '    return "hello"',
  "```",
  "",
  "- a list",
  "- that folds",
  "",
].join("\n");

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2200);
  //: The gutter is behind a preference and the report is from a window that
  //: has it on, so turn it on rather than measuring a lane that is not drawn.
  await page.evaluate(() => {
    try { localStorage.setItem("doc-gutter", "1"); } catch (e) {}
  });
  await page.evaluate(async (text) => {
    const d = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title: "Folds", content: text }),
    });
    await loadDocuments(d.id);
  }, DOC);
  await page.waitForTimeout(2000);
  await page.evaluate(() => { setDocView("live"); if (typeof applyDocGutter === "function") applyDocGutter(); });
  await page.waitForTimeout(1800);

  const read = await page.evaluate(() => {
    const lane = document.querySelector(".cm-foldGutter");
    const markers = [...document.querySelectorAll(".cm-foldGutter .cm-gutterElement")].filter(
      (el) => el.textContent.trim() || el.querySelector("i")
    );
    const rows = markers.map((el) => {
      const icon = el.querySelector("i.ph");
      const box = el.getBoundingClientRect();
      //: The number in the same visual row, found by vertical overlap rather
      //: than by index: the fold lane has an element per line whether or not
      //: it holds a marker, and so does the number lane, but only some rows
      //: have both.
      const number = [...document.querySelectorAll(".cm-lineNumbers .cm-gutterElement")]
        .map((n) => ({ n, b: n.getBoundingClientRect() }))
        .find(({ b }) => b.top < box.bottom - 1 && b.bottom > box.top + 1);
      return {
        text: el.textContent.trim(),
        icon: icon ? (icon.className.split(/\s+/).find((c) => c.startsWith("ph-")) || "?") : null,
        centre: Math.round((box.top + box.height / 2) * 10) / 10,
        numberCentre: number
          ? Math.round((number.b.top + number.b.height / 2) * 10) / 10
          : null,
        numberText: number ? number.n.textContent.trim() : null,
      };
    });
    return { lane: !!lane, rows };
  });
  console.log("  gutter:", JSON.stringify(read));

  ok("the fold lane is drawn", read.lane, String(read.lane));
  ok("and it holds markers", read.rows.length > 0, `${read.rows.length} markers`);
  ok(
    "every marker is one of the app's own icons",
    read.rows.length > 0 && read.rows.every((r) => r.icon && r.icon.startsWith("ph-caret")),
    JSON.stringify(read.rows.map((r) => r.icon))
  );
  //: The fault the owner could see. A typed triangle leaves text behind; an
  //: icon leaves none.
  ok(
    "and none of them is a typed character",
    read.rows.every((r) => !r.text),
    JSON.stringify(read.rows.map((r) => r.text))
  );
  const offsets = read.rows
    .filter((r) => r.numberCentre !== null)
    .map((r) => Math.round(Math.abs(r.centre - r.numberCentre) * 10) / 10);
  ok(
    "each arrow sits on the centre of its own line number",
    offsets.length > 0 && offsets.every((d) => d <= 1.5),
    `offsets ${JSON.stringify(offsets)} against numbers ${JSON.stringify(
      read.rows.map((r) => r.numberText)
    )}`
  );

  console.log(bad ? `FAILURES: ${bad}` : "ALL PASS");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
