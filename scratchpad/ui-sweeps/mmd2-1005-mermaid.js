// The audit's D3 (DOCUMENTS_PLAN decisions 20.3 and 20.6): a ```mermaid
// flowchart fence draws as a figure in Read and Live, an unread one stays
// code, and the HTML export carries the figure.
//
//   BASE=http://127.0.0.1:8858 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmd2-1005-mermaid.js   (THEME=dark, W=390)
const { boot, OUT } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  const content = [
    "# Diagrams", "", "Before.", "",
    "```mermaid", "flowchart TD", "  A[Write] --> B{Ready?}", "  B -->|yes| C([Ship])", "  B -- no --> A", "```", "",
    "Between.", "",
    "```mermaid", "sequenceDiagram", "  A->>B: hi", "```", "", "After.",
  ].join("\n");
  await page.evaluate(async (text) => {
    const doc = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Diagrams", content: text }) });
    switchTab("documents");
    await openDocument(doc.id);
    setDocView("rendered");
    renderDocPreview();
  }, content);
  await page.waitForTimeout(1500);
  const read = await page.evaluate(() => {
    const preview = document.getElementById("doc-preview");
    const fig = preview.querySelector("figure.md-mermaid svg");
    const r = fig?.getBoundingClientRect();
    const p = preview.getBoundingClientRect();
    return {
      figures: preview.querySelectorAll("figure.md-mermaid").length,
      nodes: fig ? fig.querySelectorAll(".md-mermaid-node").length : 0,
      edges: fig ? fig.querySelectorAll(".md-mermaid-edge").length : 0,
      label: fig?.getAttribute("aria-label"),
      fits: r ? r.width > 80 && r.left >= p.left - 1 && r.right <= p.right + 1 : false,
      codeLeft: [...preview.querySelectorAll('.code-block code[data-lang="mermaid"]')].map((c) => c.textContent.split("\n")[0]),
      order: [...preview.children].map((c) => c.tagName).join(","),
    };
  });
  check("Read draws the flowchart in place, inside the page, named for a screen reader",
    read.figures === 1 && read.nodes === 3 && read.edges === 3 && read.fits && /^Flowchart of 3 steps: Write to Ready\?/.test(read.label || ""),
    JSON.stringify(read));
  check("a fence the subset does not read stays code", read.codeLeft.length === 1 && read.codeLeft[0] === "sequenceDiagram", JSON.stringify(read.codeLeft));
  const shot = `${OUT}/mmd2-mermaid-${W}-${process.env.THEME || "light"}.png`;
  await page.evaluate(() => document.querySelector("#doc-preview figure.md-mermaid")?.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: shot });
  const ink = await page.evaluate(() => {
    const t = document.querySelector("#doc-preview .md-mermaid-text");
    const n = document.querySelector("#doc-preview .md-mermaid-node");
    return { text: getComputedStyle(t).fill, stroke: getComputedStyle(n).stroke, fill: getComputedStyle(n).fill, ink: getComputedStyle(document.getElementById("doc-preview")).color };
  });
  check("its ink is the page's ink", ink.text === ink.ink && ink.stroke === ink.ink, JSON.stringify(ink));
  // Live: drawn while the caret is elsewhere, its text when the caret is in it.
  await page.evaluate(() => setDocView("live"));
  await page.waitForTimeout(1200);
  const live = await page.evaluate(() => {
    docCmView.dispatch({ selection: { anchor: 0 } });
    return new Promise((r) => requestAnimationFrame(() => r({
      drawn: document.querySelectorAll("#doc-editor .cm-md-mermaid svg").length,
      rawShown: [...document.querySelectorAll("#doc-editor .cm-line")].some((l) => /A\[Write\] --> B/.test(l.textContent)),
    })));
  });
  check("Live draws it while the caret is outside", live.drawn === 1 && !live.rawShown, JSON.stringify(live));
  await page.evaluate(() => {
    const fig = document.querySelector("#doc-editor .cm-md-mermaid");
    const r = fig.getBoundingClientRect();
    fig.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: r.left + 10, clientY: r.top + 10 }));
  });
  await page.waitForTimeout(500);
  const editing = await page.evaluate(() => ({
    drawn: document.querySelectorAll("#doc-editor .cm-md-mermaid").length,
    rawShown: [...document.querySelectorAll("#doc-editor .cm-line")].some((l) => /A\[Write\] --> B/.test(l.textContent)),
  }));
  check("pressing it opens its text for editing", editing.drawn === 0 && editing.rawShown, JSON.stringify(editing));
  // The HTML export is drawn from Read, so it carries the figure.
  const html = await page.evaluate(async () => {
    let captured = null;
    const keep = window.saveFile;
    window.saveFile = async (name, blob) => { captured = await blob.text(); };
    try {
      await exportDocumentHtml();
    } finally {
      window.saveFile = keep;
    }
    return captured ? { svg: /<svg[^>]*md-mermaid-svg/.test(captured), code: /sequenceDiagram/.test(captured) } : null;
  });
  check("the HTML export carries the figure (and the unread fence as code)", html && html.svg && html.code, JSON.stringify(html));
  console.log("shot", shot);
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
