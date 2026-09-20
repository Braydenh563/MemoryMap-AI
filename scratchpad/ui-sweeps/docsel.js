// Probe: a selection sent to the chat from a *document* is re-checked against
// the document's live text, not against the hidden `#doc-content` textarea the
// CodeMirror engine left behind (OPEN.md, "revalidateSelection reads the stale
// fallback"). Three outcomes are asserted: exact, moved, gone.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };
(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.evaluate(async () => {
    const r = await api("/documents", { method: "POST",
      body: JSON.stringify({ title: "Selection probe", content: "alpha line\n\nThe quick brown fox jumps.\n" }) });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
  });
  await page.waitForTimeout(2500);

  const mounted = await page.evaluate(() => docSurface().kind);
  ok("the engine is the surface", mounted === "codemirror", mounted);
  const stale = await page.evaluate(() => ({
    textarea: (document.getElementById("doc-content") || {}).value,
    live: docSurface().text,
  }));
  console.log("      textarea value:", JSON.stringify(stale.textarea), "live:", JSON.stringify(stale.live.slice(0, 20)));

  // "quick brown" sits at 17..28 of the live document
  const where = await page.evaluate(() => {
    const s = docSurface();
    const at = s.text.indexOf("quick brown");
    s.setSelection(at, at + "quick brown".length);
    askAboutSelection(s);
    return { at, attached: attachedSelection && attachedSelection.text, surfaceId: attachedSelection && attachedSelection.surfaceId };
  });
  ok("the passage is attached", where.attached === "quick brown", JSON.stringify(where));

  let v = await page.evaluate(() => revalidateSelection(attachedSelection));
  ok("an untouched passage revalidates exact", v.position === "exact", `${v.position} line ${v.line}`);

  // Type a new paragraph above it: same words, new offsets and a new line.
  v = await page.evaluate(() => {
    const s = docSurface();
    s.replaceRange(0, 0, "a new first paragraph\n\n");
    return revalidateSelection(attachedSelection);
  });
  ok("a passage that moved reports moved", v.position === "moved", v.position);
  ok("and its line is recomputed", v.line === 5, `line ${v.line}`);

  // Delete it: gone.
  v = await page.evaluate(() => {
    const s = docSurface();
    const at = s.text.indexOf("quick brown");
    s.replaceRange(at, at + "quick brown".length, "slow grey");
    return revalidateSelection(attachedSelection);
  });
  ok("a passage that was rewritten reports gone", v.position === "gone", v.position);

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
