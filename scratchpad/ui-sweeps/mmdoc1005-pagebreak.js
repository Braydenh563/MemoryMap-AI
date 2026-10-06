// DOCUMENTS_PLAN D4: `\newpage` is a page break. Read view draws a labelled
// dashed line; a print starts the next part on a new page and prints no
// label; the HTML export carries the break; the "/" menu offers it.
//
//   BASE=http://127.0.0.1:8844 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmdoc1005-pagebreak.js   (THEME=dark)
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot();
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  await page.evaluate(async () => {
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Page break probe", content: "Chapter one ends.\n\\newpage\nChapter two begins." }),
    });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 1500));
    setDocView("rendered");
    renderDocPreview();
  });
  const screen = await page.evaluate(() => {
    const pane = document.getElementById("doc-preview");
    const br = pane.querySelector(".md-page-break");
    const paras = [...pane.querySelectorAll("p")].map((p) => p.textContent);
    return { found: Boolean(br), label: br?.textContent, height: br ? Math.round(br.getBoundingClientRect().height) : 0, raw: pane.textContent.includes("\\newpage"), paras };
  });
  check("Read view draws a labelled break between the two parts", screen.found && screen.label === "Page break" && !screen.raw && screen.paras.length === 2, JSON.stringify(screen));
  await page.emulateMedia({ media: "print" });
  const print = await page.evaluate(() => {
    const br = document.querySelector("#doc-preview .md-page-break");
    const cs = getComputedStyle(br);
    return { breakBefore: cs.breakBefore, label: getComputedStyle(br.querySelector("span")).display, height: Math.round(br.getBoundingClientRect().height) };
  });
  await page.emulateMedia({ media: "screen" });
  check("in a print the next part starts on a new page, with no label", print.breakBefore === "page" && print.label === "none" && print.height === 0, JSON.stringify(print));
  const exported = await page.evaluate(() => {
    const clone = document.getElementById("doc-preview").cloneNode(true);
    docExportClean(clone);
    const html = docExportHtmlDocument("x", clone.innerHTML, "x");
    return { kept: clone.querySelectorAll(".md-page-break").length, css: html.includes(".md-page-break { break-before: page;") };
  });
  check("the HTML export carries the break", exported.kept === 1 && exported.css, JSON.stringify(exported));
  const slash = await page.evaluate(() => ({
    document: editorBlockRows("document").some((row) => row.id === "page-break"),
    note: editorBlockRows("note").some((row) => row.id === "page-break"),
  }));
  check("the / menu offers a page break in a document, not in a note", slash.document && !slash.note, JSON.stringify(slash));
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  await browser.close();
})();
