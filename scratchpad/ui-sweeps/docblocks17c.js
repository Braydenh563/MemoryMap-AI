// DOCUMENTS_PLAN 17c: the three blocks a reader judges a document by, each
// measured against its own rendered form and against the gate.
//
// Tables: the cell inset, the header ground, whether the cell the caret is in
// is marked, Tab and Shift+Tab walking the cells in the live view, Tab in the
// last cell adding a row, and whether the kebab covers the header's last cell.
// Fences: how far the code's first glyph sits from the tinted slab's edge.
// Quotations: the bar, the inset and the ink, against the rendered view's.
//
// Usage: BASE=http://127.0.0.1:8793 node docblocks17c.js
const { boot } = require("./lib.js");

const DOC = [
  "# Blocks",
  "",
  "| Name | Kind | A rather long last heading |",
  "| --- | --- | --- |",
  "| One | a | first |",
  "| Two | b | second |",
  "",
  "```python",
  "def hello():",
  "    return 1",
  "```",
  "",
  "> A quotation that says something worth quoting.",
  "",
  "The end.",
  "",
].join("\n");

let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async (text) => {
    const d = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title: "Blocks", content: text }),
    });
    await loadDocuments(d.id);
  }, DOC);
  await page.waitForTimeout(1800);
  await page.evaluate(() => setDocView("live"));
  await page.waitForTimeout(1000);

  const px = (v) => Math.round(parseFloat(v) * 10) / 10;
  // --- the three blocks at rest --------------------------------------------
  const rest = await page.evaluate(() => {
    const q = (s) => document.querySelector(`#doc-editor ${s}`);
    const cell = q(".cm-md-table:not(.cm-md-table-head) .cm-md-td");
    const head = q(".cm-md-table-head");
    const code = [...document.querySelectorAll("#doc-editor .cm-md-fence")].find((l) =>
      l.textContent.includes("def hello")
    );
    const quote = q(".cm-md-quote");
    const range = document.createRange();
    const firstGlyph = (line) => {
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node && !node.textContent.trim()) node = walker.nextNode();
      const at = node.textContent.search(/\S/);
      range.setStart(node, at);
      range.setEnd(node, at + 1);
      return range.getBoundingClientRect();
    };
    const cs = (el) => getComputedStyle(el);
    return {
      cellPad: [cs(cell).paddingTop, cs(cell).paddingLeft],
      cellH: cell.closest(".cm-line").getBoundingClientRect().height,
      headBg: cs(head).backgroundColor,
      headWeight: cs(head).fontWeight,
      codeInset: firstGlyph(code).left - code.getBoundingClientRect().left,
      codeFont: cs(code).fontSize,
      quoteBar: cs(quote).borderLeftWidth + " " + cs(quote).borderLeftColor,
      quoteInset: firstGlyph(quote).left - quote.getBoundingClientRect().left,
      quoteInk: cs(quote).color,
      quoteBg: cs(quote).backgroundColor,
    };
  });
  console.log("live at rest:", JSON.stringify(rest));

  // --- the rendered view of the same document ------------------------------
  await page.evaluate(() => setDocView("rendered"));
  await page.waitForTimeout(900);
  const rendered = await page.evaluate(() => {
    const p = document.querySelector("#doc-preview");
    const td = p.querySelector("tbody td");
    const th = p.querySelector("thead th");
    const pre = p.querySelector("pre");
    const bq = p.querySelector("blockquote");
    const cs = (el) => (el ? getComputedStyle(el) : null);
    return {
      cellPad: td ? [cs(td).paddingTop, cs(td).paddingLeft] : null,
      headBg: th ? cs(th).backgroundColor : null,
      prePad: pre ? cs(pre).paddingLeft : null,
      quoteBar: bq ? cs(bq).borderLeftWidth + " " + cs(bq).borderLeftColor : null,
      quotePad: bq ? cs(bq).paddingLeft : null,
      quoteInk: bq ? cs(bq).color : null,
      quoteBg: bq ? cs(bq).backgroundColor : null,
    };
  });
  console.log("rendered:     ", JSON.stringify(rendered));
  await page.evaluate(() => setDocView("live"));
  await page.waitForTimeout(900);

  ok("the code's first glyph is inset from its slab", rest.codeInset >= 8, `${rest.codeInset.toFixed(1)}px`);
  ok("a table cell has room around its words", px(rest.cellPad[1]) >= 8 && px(rest.cellPad[0]) >= 2,
    rest.cellPad.join(" "));
  ok("the quotation's text is inset from its bar", rest.quoteInset >= 12, `${rest.quoteInset.toFixed(1)}px`);
  // The bar is the only thing that says "quotation", so it is held to the
  // 3:1 a graphic needs (WCAG 1.4.11), composited on the editor's own ground
  // with a canvas rather than worked out by hand.
  const barContrast = await page.evaluate(() => {
    const quote = document.querySelector("#doc-editor .cm-md-quote");
    let ground = "rgb(255, 255, 255)";
    for (let el = quote; el; el = el.parentElement) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { ground = bg; break; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    const paint = (colours) => {
      ctx.clearRect(0, 0, 1, 1);
      for (const c of colours) { ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1); }
      return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const page = paint([getComputedStyle(document.body).backgroundColor, ground]);
    const bar = paint([getComputedStyle(document.body).backgroundColor, ground, getComputedStyle(quote).borderLeftColor]);
    const [a, b] = [lum(page), lum(bar)].sort((x, y) => y - x);
    return { ratio: (a + 0.05) / (b + 0.05), page, bar };
  });
  ok("the quotation's bar can be seen (3:1)", barContrast.ratio >= 3, JSON.stringify(barContrast));

  // --- a table, edited ------------------------------------------------------
  const cellOf = () =>
    page.evaluate(() => {
      const view = docCmView;
      const pos = view.state.selection.main.head;
      const line = view.state.doc.lineAt(pos);
      const active = [...document.querySelectorAll("#doc-editor .cm-md-td-active")];
      return {
        line: line.number,
        col: line.text.slice(0, pos - line.from).split("|").length - 2,
        sel: view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to),
        active: active.map((a) => a.textContent.trim()),
        ring: active[0] ? getComputedStyle(active[0]).boxShadow : "",
        rows: view.state.doc.toString().split("\n").filter((l) => l.startsWith("|")).length,
      };
    });
  // Click into "One".
  const one = await page.evaluate(() => {
    const cell = [...document.querySelectorAll("#doc-editor .cm-md-td")].find(
      (c) => c.textContent.trim() === "One"
    );
    const r = cell.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await page.mouse.click(one.x, one.y);
  await page.waitForTimeout(300);
  let at = await cellOf();
  ok("a click puts the caret in the cell", at.line === 5 && at.col === 0, JSON.stringify(at));
  ok("and that cell is marked as the one being edited", at.active.length === 1 && at.active[0] === "One",
    JSON.stringify(at.active));
  ok("with a visible ring", /rgb/.test(at.ring) && at.ring !== "none", at.ring);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  at = await cellOf();
  ok("Tab goes to the next cell", at.line === 5 && at.col === 1 && at.sel === "a", JSON.stringify(at));
  ok("and the mark follows it", at.active.length === 1 && at.active[0] === "a", JSON.stringify(at.active));
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(250);
  at = await cellOf();
  ok("Shift+Tab goes back", at.line === 5 && at.col === 0 && at.sel === "One", JSON.stringify(at));
  // To the last cell, then Tab again.
  for (let i = 0; i < 5; i += 1) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(120);
  }
  at = await cellOf();
  ok("Tab walks to the last cell", at.line === 6 && at.col === 2 && at.sel === "second", JSON.stringify(at));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  at = await cellOf();
  ok("Tab in the last cell adds a row and goes to it", at.rows === 5 && at.line === 7 && at.col === 0,
    JSON.stringify(at));
  await page.keyboard.type("Three");
  await page.waitForTimeout(250);
  const text = await page.evaluate(() => docCmView.state.doc.toString());
  ok("and typing lands in the new row's first cell", /\n\| ?Three ?\|/.test(text),
    JSON.stringify(text.split("\n").slice(2, 8)));

  // The kebab against the header's last cell.
  await page.mouse.click(one.x, one.y);
  await page.waitForTimeout(300);
  const kebab = await page.evaluate(() => {
    const menu = document.querySelector("#doc-editor .cm-md-table-menu");
    const head = document.querySelector("#doc-editor .cm-md-table-head");
    const cells = [...head.querySelectorAll(".cm-md-td")];
    const last = cells[cells.length - 1];
    const range = document.createRange();
    range.selectNodeContents(last);
    const text = range.getBoundingClientRect();
    const m = menu ? menu.getBoundingClientRect() : null;
    return m
      ? { menuLeft: m.left, menuRight: m.right, textRight: text.right, cellRight: last.getBoundingClientRect().right }
      : null;
  });
  ok("the kebab is on the header while the caret is in the table", !!kebab);
  ok("and covers none of the header's words", kebab && kebab.menuLeft >= kebab.textRight,
    JSON.stringify(kebab));

  // The caret leaves the table: no mark.
  await page.evaluate(() => {
    const view = docCmView;
    view.dispatch({ selection: { anchor: view.state.doc.length } });
  });
  await page.waitForTimeout(250);
  at = await cellOf();
  ok("no cell is marked once the caret leaves the table", at.active.length === 0, JSON.stringify(at.active));

  console.log(`\n${bad ? bad + " FAIL" : "all pass"}`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
