// The editor with the engine refused: the path `docCmBroken` exists for.
//
// Carried as "not verified" through three of this plan's sessions (see
// `docs/roadmap/archive/agent-remaining/documents-phase4.md`, "the fallback textarea
// path ... nothing has been driven in a browser with the engine off"), and now
// load-bearing for a second surface: DOCUMENTS_PLAN Phase 8 mounts the same
// engine in every note box, and `mountNoteSurface` is written to hand back the
// textarea's own surface when the bundle cannot load. That branch had never
// run in a browser either.
//
// The bundle is refused at the network rather than deleted, which is what a
// broken install, a stale service worker or a CSP refusal all look like from
// the page's side.
//
//   BASE=http://127.0.0.1:8793 node scratchpad/ui-sweeps/docfallback.js
const { boot } = require("./lib.js");
const { openDoc } = require("./docopen.js");

let failures = 0;
const ok = (name, condition, detail) => {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail === undefined ? "" : `  — ${detail}`}`);
};

const CONTENT = [
  "# Fallback",
  "",
  "A paragraph with **bold** in it.",
  "",
  "| Name | Count |",
  "| --- | --- |",
  "| One | 1 |",
  "",
].join("\n");

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message.slice(0, 160)));
  // The refused bundle logs a failure of its own, and the app says so on
  // purpose ("MemoryMap: the editor bundle could not be loaded. The plain
  // editor is still available."). Those two are the point of the sweep.
  const EXPECTED = /codemirror|editor bundle|Failed to load resource/i;
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text().slice(0, 200);
    if (EXPECTED.test(text)) return;
    errors.push(text);
  });
  await page.route("**/vendor/codemirror/**", (route) => route.abort());

  await openDoc(page, { title: "Fallback sweep", content: CONTENT });
  await page.waitForTimeout(1200);

  const shape = await page.evaluate(() => {
    const box = document.getElementById("doc-content");
    const surface = docSurface();
    return {
      kind: surface.kind,
      broken: typeof docCmBroken === "boolean" ? docCmBroken : null,
      textareaVisible: !!box && !!box.offsetParent,
      hasCm: !!document.querySelector("#doc-editor .cm-content"),
      value: box ? box.value.slice(0, 12) : null,
      wrapClass: document.getElementById("doc-source-wrap")?.className || "",
    };
  });
  ok("the surface is the textarea when the engine cannot load",
    shape.kind === "textarea" && !shape.hasCm, JSON.stringify(shape));
  ok("the textarea is the one on screen", shape.textareaVisible, String(shape.textareaVisible));
  ok("the wrapper does not claim an engine", !/has-cm/.test(shape.wrapClass), shape.wrapClass);

  // The toolbar still edits the document.
  const bolded = await page.evaluate(() => {
    const surface = docSurface();
    const at = surface.text.indexOf("paragraph");
    surface.setSelectionRange(at, at + 9);
    surface.focus();
    applyMarkdown("bold", "doc-content");
    return docSurface().text;
  });
  ok("the toolbar still writes into the document", bolded.includes("**paragraph**"),
    JSON.stringify(bolded.slice(0, 60)));

  // And the document still saves, which is what the fallback is for.
  const saved = await page.evaluate(async () => {
    await saveDocument();
    const response = await fetch(`/documents/${currentDoc.id}`, {
      headers: { "X-Auth-Token": authToken() },
    });
    const body = await response.json();
    return body.content.includes("**paragraph**");
  });
  ok("and the document saves what was typed into it", saved, String(saved));

  // A table is markdown text here, not a grid: the decorations are the
  // engine's, and the plan's promise is that the *file* is unchanged either
  // way, which is what makes the fallback honest rather than lossy.
  const table = await page.evaluate(() => docSurface().text.includes("| Name | Count |"));
  ok("the table is still the markdown its author typed", table, String(table));

  // Phase 8's note boxes take the same path.
  await page.evaluate(() => {
    switchTab("notes");
    if (typeof showNotesSection === "function") showNotesSection("capture");
  });
  await page.waitForTimeout(600);
  await page.click("#entry-content");
  await page.waitForTimeout(900);
  await page.keyboard.type("a note in the fallback");
  await page.waitForTimeout(300);
  const note = await page.evaluate(() => {
    const box = document.getElementById("entry-content");
    return {
      mounted: !!box.closest(".note-surface"),
      kind: asSurface(box).kind,
      value: box.value,
      focused: document.activeElement === box,
    };
  });
  ok("a note box stays the textarea it was",
    !note.mounted && note.kind === "textarea", JSON.stringify(note));
  ok("and it still takes what is typed into it",
    note.value === "a note in the fallback", JSON.stringify(note.value));

  console.log(`unexpected console errors: ${errors.length}${errors.length ? " " + JSON.stringify(errors.slice(0, 3)) : ""}`);
  if (errors.length) failures += 1;
  await browser.close();
  console.log(failures ? `FAIL (${failures})` : "ALL PASS");
  process.exit(failures ? 1 : 0);
})();
