// -----------------------------------------------------------------------------
// Word files in the browser: Mammoth reads a .docx, docx writes one
// -----------------------------------------------------------------------------
//
// The owner, 2026-10-10 (INBOX 765, DOCUMENTS_PLAN Phase 7, superseded row):
// Word files are read and written in the browser with Mammoth and docx, both
// vendored under frontend/vendor with their notices in THIRD_PARTY.md. This
// replaces the python-docx export (an optional extra most installs lacked, so
// Download as Word answered 501) and, for a .docx brought into the Library,
// the server's text extraction, which kept the words and lost the headings,
// lists, emphasis and tables.
//
// Loaded on demand, never at boot and never with the Library: the two
// libraries are 100 KB and 140 KB gzipped, paid only by a Word import or
// export. Everything here waits on `docWordLibs` first.

const DOC_WORD_LIBS = {
  mammoth: "/vendor/mammoth/mammoth.browser.min.js",
  docx: "/vendor/docx/docx.min.js",
};

async function docWordLib(name) {
  if (window[name]) return window[name];
  const loaded = await lazyScript(DOC_WORD_LIBS[name]);
  if (!loaded || !window[name]) throw new Error(`The Word ${name === "docx" ? "writer" : "reader"} could not be loaded.`);
  return window[name];
}

//: A .docx to a title and markdown: Mammoth's HTML (headings, lists,
//: emphasis, tables, links; pictures inline as data) through the editor's
//: own paste converter, so an import reads as a paste of the same page does.
async function docWordImport(file) {
  const mammoth = await docWordLib("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const content = docHtmlToMarkdown(result.value || "");
  const title = String(file.name || "Imported document").replace(/\.docx$/i, "").trim() || "Imported document";
  return { title, content, warnings: (result.messages || []).length };
}

//: The open document to a .docx: the markdown rendered by the app's own
//: renderer, then walked into docx's paragraphs, so a heading, a list or a
//: table means in Word what it means on screen.
async function docWordExport() {
  if (!currentDoc) return false;
  try {
    const D = await docWordLib("docx");
    const holder = document.createElement("div");
    renderMarkdown(holder, docCmView ? docCmView.state.doc.toString() : currentDoc.content || "");
    //: The renderer's own chrome is not the document: a code block's and a
    //: table's bar (its label, Copy, Save) would be written as text.
    for (const chrome of holder.querySelectorAll(".code-bar, button")) chrome.remove();
    const children = docWordBlocks(D, holder);
    const doc = new D.Document({
      creator: "MemoryMap",
      title: currentDoc.title || "Document",
      sections: [{ children: children.length ? children : [new D.Paragraph("")] }],
    });
    const blob = await D.Packer.toBlob(doc);
    const name = `${String(currentDoc.title || "document").replace(/[\\/:*?"<>|]+/g, " ").trim() || "document"}.docx`;
    await saveFile(name, blob);
    return true;
  } catch (error) {
    toast(`Could not write the Word file: ${error.message}`, true);
    return false;
  }
}

function docWordRuns(D, node, style = {}) {
  const runs = [];
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      if (child.nodeValue) runs.push(new D.TextRun({ text: child.nodeValue, ...style }));
      continue;
    }
    if (child.nodeType !== 1) continue;
    const tag = child.tagName.toLowerCase();
    if (tag === "br") runs.push(new D.TextRun({ text: "", break: 1 }));
    else if (tag === "strong" || tag === "b") runs.push(...docWordRuns(D, child, { ...style, bold: true }));
    else if (tag === "em" || tag === "i") runs.push(...docWordRuns(D, child, { ...style, italics: true }));
    else if (tag === "del" || tag === "s") runs.push(...docWordRuns(D, child, { ...style, strike: true }));
    else if (tag === "code") runs.push(...docWordRuns(D, child, { ...style, font: "Consolas" }));
    else if (tag === "img") runs.push(new D.TextRun({ text: `[${child.getAttribute("alt") || "picture"}]`, ...style }));
    else if (tag === "a" && /^(https?:|mailto:)/i.test(child.getAttribute("href") || "")) {
      runs.push(new D.ExternalHyperlink({ link: child.getAttribute("href"), children: docWordRuns(D, child, { ...style, style: "Hyperlink" }) }));
    } else runs.push(...docWordRuns(D, child, style));
  }
  return runs;
}

const DOC_WORD_HEADINGS = { h1: "HEADING_1", h2: "HEADING_2", h3: "HEADING_3", h4: "HEADING_4", h5: "HEADING_5", h6: "HEADING_6" };

function docWordBlocks(D, root, depth = 0) {
  const out = [];
  for (const el of root.children) {
    //: The renderer draws `#` as an h3 for the page's scale and says the
    //: level the text wrote in its class (`md-h1`); Word wants that level.
    const level = /(?:^|\s)md-h([1-6])(?:\s|$)/.exec(el.className || "");
    const tag = level ? `h${level[1]}` : el.tagName.toLowerCase();
    if (DOC_WORD_HEADINGS[tag]) out.push(new D.Paragraph({ heading: D.HeadingLevel[DOC_WORD_HEADINGS[tag]], children: docWordRuns(D, el) }));
    else if (tag === "p") out.push(new D.Paragraph({ children: docWordRuns(D, el) }));
    else if (tag === "hr") out.push(new D.Paragraph({ thematicBreak: true, children: [] }));
    else if (tag === "pre") {
      for (const line of el.textContent.replace(/\n$/, "").split("\n")) {
        out.push(new D.Paragraph({ children: [new D.TextRun({ text: line, font: "Consolas" })] }));
      }
    } else if (tag === "blockquote") {
      for (const p of docWordBlocks(D, el, depth)) out.push(p);
    } else if (tag === "ul" || tag === "ol") {
      let n = 0;
      for (const li of el.children) {
        if (li.tagName.toLowerCase() !== "li") continue;
        n += 1;
        const own = document.createElement("div");
        const nested = [];
        for (const part of li.childNodes) {
          if (part.nodeType === 1 && /^(ul|ol)$/i.test(part.tagName)) nested.push(part);
          else own.append(part.cloneNode(true));
        }
        const runs = docWordRuns(D, own);
        out.push(tag === "ul"
          ? new D.Paragraph({ bullet: { level: Math.min(depth, 8) }, children: runs })
          : new D.Paragraph({ indent: { left: 360 * (depth + 1) }, children: [new D.TextRun(`${n}. `), ...runs] }));
        for (const list of nested) {
          const wrap = document.createElement("div");
          wrap.append(list.cloneNode(true));
          out.push(...docWordBlocks(D, wrap, depth + 1));
        }
      }
    } else if (tag === "table") {
      const rows = [...el.querySelectorAll("tr")].map((tr) => new D.TableRow({
        children: [...tr.children].map((cell) => new D.TableCell({ children: [new D.Paragraph({ children: docWordRuns(D, cell, cell.tagName === "TH" ? { bold: true } : {}) })] })),
      }));
      if (rows.length) out.push(new D.Table({ rows }));
    } else if (el.querySelector("p, h1, h2, h3, h4, ul, ol, table, pre")) {
      //: A wrapper the renderer adds (a callout, a column): its blocks.
      out.push(...docWordBlocks(D, el, depth));
    } else if (el.textContent.trim()) {
      out.push(new D.Paragraph({ children: docWordRuns(D, el) }));
    }
  }
  return out;
}
