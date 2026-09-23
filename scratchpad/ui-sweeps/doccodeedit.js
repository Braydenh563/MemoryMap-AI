// The owner, 2026-09-23: "if I write a \" it automatically does \"\" and puts
// my cursor position in between them ... where I write var_name { and it
// automatically does {} and then if I press enter it automatically indents
// ... also a button to automatically format the whole document, ot just a
// selection ... also recommended fixes to apply".
//
// Types into real code documents in Chromium and asserts the resulting text
// and caret, key by key, for the pairs, Enter, the formatter and a quick fix.
// tests/test_code_editing.py holds the string work to exact output; this
// holds the wiring (that the keys reach it) to the same.
//
// Usage: BASE=http://127.0.0.1:8803 [THEME=dark] node doccodeedit.js
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

  const open = async (title, fileType, content) => {
    await page.evaluate(
      async ([t, f, c]) => {
        const d = await apiJson("/documents", {
          method: "POST",
          body: JSON.stringify({ title: t, content: c, file_type: f }),
        });
        await loadDocuments(d.id);
      },
      [title, fileType, content]
    );
    await page.waitForTimeout(1200);
    await page.evaluate(() => {
      docCmView.focus();
      docCmView.dispatch({ selection: { anchor: docCmView.state.doc.length } });
    });
  };
  const state = () =>
    page.evaluate(() => {
      const s = docCmView.state;
      const head = s.selection.main.head;
      const line = s.doc.lineAt(head);
      return { text: s.doc.toString(), head, line: line.number, col: head - line.from };
    });
  const J = JSON.stringify;

  // --- pairs -----------------------------------------------------------------
  await open("pairs.c", "c", "");
  await page.keyboard.type('"');
  let s = await state();
  ok('" in a .c file gives "" with the caret between', s.text === '""' && s.head === 1, J(s));
  await page.keyboard.type("hi");
  await page.keyboard.type('"');
  s = await state();
  ok('typing the closing " steps over it', s.text === '"hi"' && s.head === 4, J(s));

  await open("pairs2.c", "c", "");
  await page.keyboard.type("(");
  s = await state();
  ok("( gives () with the caret between", s.text === "()" && s.head === 1, J(s));
  await page.keyboard.press("Backspace");
  s = await state();
  ok("Backspace in an empty pair deletes both", s.text === "" && s.head === 0, J(s));

  await open("wrap.c", "c", "abc");
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: 0, head: 3 } }));
  await page.keyboard.type('"');
  s = await state();
  ok('" over a selection wraps it', s.text === '"abc"', J(s));
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: 1, head: 4 } }));
  await page.keyboard.type("[");
  s = await state();
  ok("[ over a selection wraps it", s.text === '"[abc]"', J(s));

  await open("life.rs", "rs", "fn f<");
  await page.keyboard.type("'");
  s = await state();
  ok("a Rust lifetime quote is not paired", s.text === "fn f<'", J(s));

  // --- Enter between braces ---------------------------------------------------
  const braceEnter = async (fileType, prefix, unit) => {
    await open(`enter.${fileType}`, fileType, prefix);
    await page.keyboard.type("{");
    await page.keyboard.press("Enter");
    const got = await state();
    const want = `${prefix}{\n${unit}\n}`;
    const lead = prefix.split("\n").pop().match(/^\s*/)[0];
    const wantIndented = `${prefix}{\n${lead}${unit}\n${lead}}`;
    return { got, want: lead ? wantIndented : want, unit: lead + unit };
  };
  for (const [fileType, prefix, unit] of [
    ["c", "int main() ", "    "],
    ["java", "class A {\n    void f() ", "    "],
    ["js", "function f() ", "  "],
    ["go", "func main() ", "\t"],
    ["rs", "fn main() ", "    "],
    ["cs", "class A ", "    "],
    ["php", "<?php\nif ($x) ", "    "],
    ["css", "a ", "  "],
  ]) {
    const r = await braceEnter(fileType, prefix, unit);
    ok(`{ then Enter in a .${fileType} file splits into three lines`,
      r.got.text === r.want && r.got.col === r.unit.length && r.got.line === prefix.split("\n").length + 1,
      J({ got: r.got.text, want: r.want, col: r.got.col }));
  }

  await open("close.c", "c", "int main() {\n    x();\n    ");
  await page.keyboard.type("}");
  s = await state();
  ok("a typed } snaps back to its opener's depth", s.text === "int main() {\n    x();\n}", J(s));

  await open("paren.java", "java", "class A {\n    void f() {\n        foo(a,");
  await page.keyboard.press("Enter");
  s = await state();
  ok("Enter inside an open ( indents one unit", s.col === 12, J(s));

  await open("case.java", "java", "class A {\n    void f() {\n        switch (x) {\n            case 1:");
  await page.keyboard.press("Enter");
  s = await state();
  ok("Enter after a case label indents its body", s.col === 16, J(s));

  // --- Tab stays what it was ---------------------------------------------------
  await open("tab.c", "c", "int x;");
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: 0 } }));
  await page.keyboard.press("Tab");
  s = await state();
  ok("Tab indents by the file type's unit, caret after the indent", s.text === "    int x;" && s.head === 4, J(s));
  await page.keyboard.press("Shift+Tab");
  s = await state();
  ok("Shift+Tab takes it back", s.text === "int x;" && s.head === 0, J(s));
  await page.keyboard.press("Tab");
  await page.keyboard.type("a");
  s = await state();
  ok("what is typed after Tab lands after the indent", s.text === "    aint x;", J(s));
  await page.keyboard.press("Control+z");
  await page.keyboard.press("Control+z");
  await page.evaluate(() => docCmView.dispatch({ changes: { from: 0, to: docCmView.state.doc.length, insert: "int x;" } }));
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: 0 } }));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  const inside = await page.evaluate(() => docCmView.dom.contains(document.activeElement));
  ok("Escape then Tab still leaves the editor", !inside);

  // --- prose is untouched --------------------------------------------------------
  await open("prose.md", "md", "");
  await page.keyboard.type('"');
  s = await state();
  ok('a markdown document does not pair "', s.text === '"', J(s));
  await open("prose2.md", "md", "hello");
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: 0 } }));
  await page.keyboard.press("Tab");
  await page.keyboard.type("a");
  s = await state();
  ok("Tab in prose leaves the caret after the indent too", s.text === "  ahello", J(s));

  console.log(`\n${good} passed, ${bad} failed; page errors: ${errors.length ? errors.join(" | ") : "none"}`);
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})();
