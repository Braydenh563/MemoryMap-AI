// Two rows from OPEN.md's prose-intelligence list, measured together because
// they are the same underline seen from two sides.
//
//   1. **The writing-suggestion underline was the only surface in this feature
//      with no hover affordance.** Four things draw a finding, the underline,
//      the word menu, the panel and the dictionary, and three of them answered
//      the pointer; this one offered `cursor: pointer` and nothing else, so the
//      only way to learn a squiggle is pressable was to press it. The tint is
//      measured as a painted colour in both themes, not looked at.
//
//   2. **`docFindingAtPoint` walks every mark on every pointer event** that
//      lands in the editor, calling `getClientRects()` per mark. The row says
//      it is bounded by the viewport's marks and so not slow, "but not
//      measured at all". This times it on the plan's own gate, a long document
//      with many findings on screen, so the next reader has a number instead
//      of a reassurance.
//
// Run with THEME=dark for the other half of item 1.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`);
};
const THEME = process.env.THEME || "light";

//: Prose the checker has something to say about, repeated so the viewport is
//: full of marks rather than holding two. `teh` is in the confident spelling
//: list; a word said twice in a sentence is the repeat check; a very long
//: sentence is the style check.
//: One paragraph per kind, and deliberately not one paragraph carrying all
//: three: a word holds one decoration, so a misspelling that is also a repeat
//: renders as whichever kind wins and the other kind is never on screen to
//: measure. The first run of this probe put "teh shop and teh shop" in one
//: line and found only `spelling`.
const PARA = [
  "I went to teh shop on Tuesday.",
  "",
  "The report said the report was late, and the report gave no reason.",
  "",
  "This sentence is deliberately long enough to trip the style check because it keeps going and going without ever reaching a full stop that a reader could rest on, which is exactly the shape the checker is looking for when it decides that a sentence has run away from its author and should have been two.",
  "",
].join("\n");

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2200);
  await page.evaluate(async (para) => {
    //: **Dense, because the row's gate is "200 findings on screen".** Only the
    //: viewport's marks are rendered, so forty copies of a three-paragraph
    //: sample put three marks on screen and timed nothing worth knowing. Six
    //: misspellings to a line, sixty lines, is what fills a 900px viewport
    //: with marks the way a real document under a checker looks at its worst.
    const dense = Array(60)
      .fill("teh one teh two teh three teh four teh five teh six.")
      .join("\n\n");
    const body = ["# Findings", "", dense, ""].concat(Array(40).fill(para)).join("\n");
    const d = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title: "Findings", content: body }),
    });
    await loadDocuments(d.id);
    setDocView("live");
  }, PARA);
  //: The prose pass is debounced, so the marks are not there on the beat the
  //: document loads.
  await page.waitForTimeout(5000);

  const marks = await page.evaluate(() => ({
    onScreen: document.querySelectorAll(".cm-finding").length,
    kinds: [
      ...new Set(
        [...document.querySelectorAll(".cm-finding")].map(
          (m) => (m.className.match(/cm-finding-([a-z]+)/) || [])[1] || "?"
        )
      ),
    ].sort(),
    words: docText().split(/\s+/).length,
  }));
  console.log("      marks:", JSON.stringify(marks));
  ok("the document has findings on screen to measure", marks.onScreen > 0, `${marks.onScreen} marks`);

  //: **The hover tint, as a painted colour.** `getComputedStyle` on a
  //: `:hover` rule only tells the truth while the pointer is actually over
  //: the element, so the mouse is moved there and the ground is read at rest
  //: and under the pointer. A tint that composes to the same colour it
  //: replaced is a tint nobody can see, which is the failure this guards.
  const tint = await page.evaluate(async () => {
    const out = [];
    const seen = new Set();
    for (const mark of document.querySelectorAll(".cm-finding")) {
      const kind = (mark.className.match(/cm-finding-([a-z]+)/) || [])[1];
      if (!kind || seen.has(kind)) continue;
      seen.add(kind);
      const box = mark.getBoundingClientRect();
      out.push({ kind, x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) });
    }
    return out;
  });
  console.log("      kinds found:", JSON.stringify(tint.map((t) => t.kind)));
  //: Which kinds are on screen depends on what the checker is confident
  //: about today, so the assertion is that the tint holds for every kind that
  //: *is* there, and the list is printed so a run with one kind in it says so
  //: rather than passing quietly.
  ok("at least one kind of finding is on screen", tint.length > 0, JSON.stringify(tint.map((t) => t.kind)));

  for (const spot of tint) {
    const colours = await page.evaluate((s) => {
      const mark = [...document.querySelectorAll(`.cm-finding-${s.kind}`)][0];
      return { rest: getComputedStyle(mark).backgroundColor };
    }, spot);
    await page.mouse.move(spot.x, spot.y);
    await page.waitForTimeout(220);
    const hovered = await page.evaluate((s) => {
      const mark = document.querySelector(`.cm-finding-${s.kind}:hover`);
      if (!mark) return { error: "the pointer is not over a mark of this kind" };
      return { hover: getComputedStyle(mark).backgroundColor, radius: getComputedStyle(mark).borderRadius };
    }, spot);
    //: Away again, so the next kind's "rest" reading is a rest reading.
    await page.mouse.move(4, 4);
    await page.waitForTimeout(120);
    console.log(`      ${spot.kind}:`, JSON.stringify({ ...colours, ...hovered }));
    ok(
      `the ${spot.kind} underline tints under the pointer`,
      !hovered.error && hovered.hover !== colours.rest,
      `${colours.rest} to ${hovered.hover || hovered.error}`
    );
    //: And it has to be a real colour rather than a transparent one that
    //: composes to nothing: `color-mix(..., transparent)` with a bad token
    //: resolves to `rgba(0, 0, 0, 0)`, which reads as a change and paints
    //: none.
    ok(
      `and the ${spot.kind} tint is actually painted`,
      !hovered.error && !/rgba\(0, 0, 0, 0\)/.test(hovered.hover || ""),
      hovered.hover
    );
  }

  //: **`docFindingAtPoint`, timed.** Called from `click`, `dblclick` and
  //: `contextmenu`, so the budget is a pointer event's: past a millisecond it
  //: is worth caching the rects per repaint, which is what the row says.
  const timing = await page.evaluate(() => {
    const mark = document.querySelector(".cm-finding");
    const box = mark.getBoundingClientRect();
    const x = Math.round(box.x + box.width / 2);
    const y = Math.round(box.y + box.height / 2);
    //: A hit and a miss, because the miss is the expensive case: a hit
    //: returns at the first mark that holds the point, a miss walks all of
    //: them and calls `getClientRects()` on every one.
    const time = (fn, runs) => {
      fn();
      const t0 = performance.now();
      for (let i = 0; i < runs; i += 1) fn();
      return +((performance.now() - t0) / runs).toFixed(3);
    };
    return {
      marks: document.querySelectorAll(".cm-finding").length,
      hitMs: time(() => docFindingAtPoint(x, y), 200),
      //: Far from every mark, inside the editor, so the walk is exhaustive.
      missMs: time(() => docFindingAtPoint(5, 5), 200),
    };
  });
  console.log("      docFindingAtPoint:", JSON.stringify(timing));
  //: The row's own threshold, stated as an assertion so a change that makes
  //: this expensive fails here rather than being felt.
  ok(
    "a miss walks every mark in under a millisecond",
    timing.missMs < 1,
    `${timing.missMs}ms over ${timing.marks} marks`
  );
  ok("and a hit is no worse", timing.hitMs < 1, `${timing.hitMs}ms`);

  console.log(`theme: ${THEME}`);
  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
