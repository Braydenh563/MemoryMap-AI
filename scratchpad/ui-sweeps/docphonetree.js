// The Documents editor's boxes on a phone, as a tree (INBOX 430): each
// visible element down to depth DEPTH under #tab-documents, with its box,
// display, overflow and flex, to see which box is short and why.
//   VIEW=390 DEPTH=6 node scratchpad/ui-sweeps/docphonetree.js
const { boot } = require("./lib.js");
const W = Number(process.env.VIEW || 390);
const H = Number(process.env.HEIGHT || (W > 900 ? 768 : 844));
const TOUCH = process.env.TOUCH !== "0";
(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: H }, ...(TOUCH ? { hasTouch: true, isMobile: true } : {}) });
  const out = await page.evaluate(async ({ depth, view }) => {
    const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
    const content = ["# Tree probe", "", ...Array.from({ length: 30 }, (_, i) => `Paragraph ${i + 1} with some words in it.`)].join("\n\n");
    const d = await (await fetch("/documents", { method: "POST", headers, body: JSON.stringify({ title: "Tree probe", content }) })).json();
    switchTab("documents");
    await new Promise((r) => setTimeout(r, 800));
    await openDocument(d.id);
    await new Promise((r) => setTimeout(r, 2000));
    if (view && typeof setDocView === "function") setDocView(view);
    await new Promise((r) => setTimeout(r, 800));
    const lines = [];
    const walk = (el, level) => {
      if (level > depth) return;
      for (const child of el.children) {
        if (!child.getClientRects().length) continue;
        const b = child.getBoundingClientRect();
        if (b.height < 2) continue;
        const cs = getComputedStyle(child);
        lines.push(`${"  ".repeat(level)}w${Math.round(b.width)} x${Math.round(b.left)} ${child.tagName.toLowerCase()}${child.id ? "#" + child.id : ""}.${child.className.toString().split(" ").slice(0, 2).join(".")} ${Math.round(b.top)}-${Math.round(b.bottom)} h${Math.round(b.height)} ${cs.display} ov:${cs.overflowY} flex:${cs.flex} pos:${cs.position} maxh:${cs.maxHeight}`);
        walk(child, level + 1);
      }
    };
    walk(document.getElementById("tab-documents"), 0);
    await fetch(`/documents/${d.id}`, { method: "DELETE", headers });
    return lines;
  }, { depth: Number(process.env.DEPTH || 6), view: process.env.DOCVIEW || "" });
  console.log(out.join("\n"));
  await browser.close();
})();
