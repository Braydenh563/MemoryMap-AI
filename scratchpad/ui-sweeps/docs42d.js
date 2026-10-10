// Brief 42: Word files in the browser. Download as Word on a document with a
// heading, emphasis, a list, a table and a code block, then the same bytes
// read back by Mammoth through the Library's import path.
// Usage: BASE=http://127.0.0.1:8846 node docs42d.js
const { boot } = require("./lib.js");
const J = JSON.stringify;
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}  - ${d}`); };
const MD = "# Plan\n\nSome **bold** and *slanted* words with [a link](https://example.com).\n\n- one\n- two\n  - nested\n\n1. first\n2. second\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```\ncode line\n```\n";
(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(1500);
  await page.evaluate(async (c) => { const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Word trip", content: c, file_type: "md" }) }); await loadDocuments(d.id); }, MD);
  await page.waitForTimeout(2000);
  const r = await page.evaluate(async () => {
    let saved = null;
    const real = window.saveFile;
    window.saveFile = async (name, blob) => { saved = { name, blob }; };
    const t0 = performance.now();
    await exportDocumentDocx();
    const exportMs = Math.round(performance.now() - t0);
    window.saveFile = real;
    if (!saved) return { saved: false };
    const file = new File([saved.blob], saved.name);
    const t1 = performance.now();
    const back = await docWordImport(file);
    const importMs = Math.round(performance.now() - t1);
    const html = (await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() })).value;
    return { saved: true, name: saved.name, bytes: saved.blob.size, exportMs, importMs, md: back.content, title: back.title, tags: ["h1", "strong", "em", "ul", "table", "a"].filter((t) => html.includes(`<${t}`)) };
  });
  ok("Download as Word writes a .docx in the browser", r.saved && /\.docx$/.test(r.name) && r.bytes > 2000, J({ name: r.name, bytes: r.bytes, ms: r.exportMs }));
  ok("the heading, emphasis, lists, table and link survive into Word", r.tags && r.tags.length === 6, J(r.tags));
  ok("Mammoth reads it back to markdown the editor keeps", /^# Plan/m.test(r.md || "") && /\*\*bold\*\*/.test(r.md) && /\| \*\*A\*\* \| \*\*B\*\* \|/.test(r.md || "") && /^1\. first/m.test(r.md) && !/Copy/.test(r.md), J({ ms: r.importMs, title: r.title, md: (r.md || "").slice(0, 300) }));
  console.log("errors", J(errors.slice(0, 4)), "bad", bad);
  await browser.close();
})();
