// INBOX 402, sticky scroll (doccodevs.js and doccodevs2.js have the rest):
// scrolled into a method, its class's and its own first lines are pinned
// over the top of the pane, opaque, column for column over the code, and a
// click on one goes there. Measured: rects, computed colours, the caret.
//
// Usage: BASE=http://127.0.0.1:8799 [THEME=dark] node doccodevs3.js
const { boot } = require("./lib.js");

let bad = 0;
let good = 0;
const ok = (n, c, d) => {
  if (c) good += 1;
  else bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  const J = JSON.stringify;

  const body = Array.from({ length: 80 }, (_, k) => `        v${k} = ${k}`).join("\n");
  const tail = Array.from({ length: 60 }, (_, k) => `        w${k} = ${k}`).join("\n");
  const content = `class A:\n    def m(self):\n${body}\n    def n(self):\n${tail}\n`;
  await page.evaluate(async (c) => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "sticky.py", content: c, file_type: "py" }) });
    await loadDocuments(d.id);
  }, content);
  await page.waitForTimeout(1400);

  const read = () =>
    page.evaluate(() => {
      const el = document.querySelector(".cm-sticky");
      if (!el) return null;
      const rows = [...el.querySelectorAll(".cm-sticky-line")];
      const scroller = docCmView.scrollDOM.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      return {
        shown: getComputedStyle(el).display !== "none",
        rows: rows.map((row) => row.textContent),
        top: Math.round(r.top - scroller.top),
        bg: getComputedStyle(el).backgroundColor,
      };
    });

  let s = await read();
  ok("at the top of the file nothing is pinned", !!s && !s.shown, J(s));

  //: Scroll so line 40 (inside m) is at the top.
  await page.evaluate(() => {
    const block = docCmView.lineBlockAt(docCmView.state.doc.line(40).from);
    docCmView.scrollDOM.scrollTop = block.top;
  });
  await page.waitForTimeout(400);
  s = await read();
  ok("scrolled into m, the class's line and m's are pinned", !!s && s.shown && J(s.rows) === J(["class A:", "    def m(self):"]), J(s));
  ok("over the top of the scroller", !!s && Math.abs(s.top) <= 1, J(s));
  ok("on an opaque ground", !!s && s.bg && !/, 0(\.\d+)?\)$/.test(s.bg) && s.bg !== "rgba(0, 0, 0, 0)", s && s.bg);

  //: Column for column: the `d` of `def` in the pinned row over the `d` in
  //: the real line 2.
  const cols = await page.evaluate(() => {
    const row = document.querySelectorAll(".cm-sticky-line")[1];
    const range = document.createRange();
    range.setStart(row.firstChild, 4);
    range.setEnd(row.firstChild, 5);
    const pinned = range.getBoundingClientRect().left;
    //: Line 2 is under the overlay, scrolled away; any visible line of m's
    //: body has the same columns.
    const shown = docCmView.state.doc.line(50);
    const real = docCmView.coordsAtPos(shown.from + 4, 1);
    return { pinned: Math.round(pinned), real: real ? Math.round(real.left) : null };
  });
  ok("each pinned line sits column for column over the code", cols.real !== null && Math.abs(cols.pinned - cols.real) <= 1, J(cols));

  await page.evaluate(() => {
    const block = docCmView.lineBlockAt(docCmView.state.doc.line(90).from);
    docCmView.scrollDOM.scrollTop = block.top;
  });
  await page.waitForTimeout(400);
  s = await read();
  ok("scrolled into n, m is let go", !!s && J(s.rows) === J(["class A:", "    def n(self):"]), J(s));

  await page.evaluate(() => {
    const block = docCmView.lineBlockAt(docCmView.state.doc.line(40).from);
    docCmView.scrollDOM.scrollTop = block.top;
  });
  await page.waitForTimeout(400);
  const box = await page.evaluate(() => {
    const r = document.querySelectorAll(".cm-sticky-line")[1].getBoundingClientRect();
    return { x: r.left + 40, y: r.top + r.height / 2 };
  });
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(400);
  const line = await page.evaluate(() => docCmView.state.doc.lineAt(docCmView.state.selection.main.head).number);
  ok("a click on a pinned line goes to it", line === 2, `line ${line}`);

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
