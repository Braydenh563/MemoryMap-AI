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

  // --- format ---------------------------------------------------------------------
  const lastToast = () =>
    page.evaluate(() => {
      const all = [...document.querySelectorAll("#toast-box .toast")];
      const t = all[all.length - 1];
      return t ? { text: t.querySelector("span").textContent, error: t.classList.contains("error") } : null;
    });
  const clearToasts = () => page.evaluate(() => document.querySelectorAll("#toast-box .toast").forEach((t) => t.remove()));
  const button = () =>
    page.evaluate(() => {
      const b = document.getElementById("doc-code-format");
      const r = b.getBoundingClientRect();
      return { visible: !b.classList.contains("hidden") && r.width > 0, text: b.textContent.trim() };
    });

  const messyJson = '{"name":"x","big":12345678901234567890,"list":[1,2,{"a":1.0e5}],"empty":{}}';
  await open("messy.json", "json", messyJson);
  ok("a JSON document shows Format in its dock", (await button()).visible, J(await button()));
  await clearToasts();
  await page.click("#doc-code-format");
  await page.waitForTimeout(300);
  s = await state();
  const wantJson = '{\n  "name": "x",\n  "big": 12345678901234567890,\n  "list": [\n    1,\n    2,\n    {\n      "a": 1.0e5\n    }\n  ],\n  "empty": {}\n}\n';
  ok("Format lays out messy JSON, every number exactly as written", s.text === wantJson, J(s.text));
  let t = await lastToast();
  ok("and says so", t && !t.error && /Formatted the document/.test(t.text), J(t));
  const focused = await page.evaluate(() => docCmView.hasFocus);
  ok("the editor has the focus back after the press", focused);
  await page.keyboard.press("Control+z");
  s = await state();
  ok("one Ctrl+Z gives back the text as it was", s.text === messyJson, J(s.text));

  const messyJs = "function f(a){\nif(a){\n      return 1;   \n}else{\nreturn 2;}\n  }\n";
  await open("messy.js", "js", messyJs);
  await page.keyboard.press("Shift+Alt+F");
  await page.waitForTimeout(300);
  s = await state();
  ok("Shift+Alt+F re-indents messy JavaScript by its braces",
    s.text === "function f(a){\n  if(a){\n    return 1;\n  }else{\n    return 2;}\n}\n", J(s.text));

  await open("sel.c", "c", "int f() {\nint a;\nint b;\nint c;\n}\n");
  await page.evaluate(() => {
    const l = docCmView.state.doc.line(3);
    docCmView.dispatch({ selection: { anchor: l.from + 1, head: l.to - 1 } });
  });
  await page.click("#doc-code-format");
  await page.waitForTimeout(300);
  s = await state();
  ok("with a selection, only its lines move", s.text === "int f() {\nint a;\n    int b;\nint c;\n}\n", J(s.text));

  await open("broken.c", "c", 'int main() {\n    printf("hi);\n}\n');
  await clearToasts();
  await page.keyboard.press("Shift+Alt+F");
  await page.waitForTimeout(300);
  s = await state();
  t = await lastToast();
  ok("broken code is refused, untouched, with the reason",
    s.text === 'int main() {\n    printf("hi);\n}\n' && t && t.error && /line 2, this string is never closed/.test(t.text), J(t));

  await open("broken.js", "js", "function (a {\n        return a;\n}\n");
  await clearToasts();
  await page.keyboard.press("Shift+Alt+F");
  await page.waitForTimeout(300);
  t = await lastToast();
  ok("JavaScript that does not parse is refused by its own grammar", t && t.error && /does not parse/.test(t.text), J(t));

  await open("broken.py", "py", "def f(x)\n    return x   \n");
  await clearToasts();
  await page.keyboard.press("Shift+Alt+F");
  await page.waitForTimeout(900);
  s = await state();
  t = await lastToast();
  ok("Python the compiler rejects is refused, by the server's check", s.text === "def f(x)\n    return x   \n" && t && t.error, J(t));

  await open("jsx.js", "js", "const A = () => (\n<div>\n<p>Don't</p>\n</div>\n);\n");
  await page.waitForTimeout(900);
  const jsxErrors = await page.evaluate(() => document.querySelectorAll("#doc-editor .cm-lintRange-error").length);
  ok("JSX in a .js file is not underlined as an error", jsxErrors === 0, jsxErrors);

  await open("prose3.md", "md", "hello");
  ok("a markdown document does not show Format", !(await button()).visible);

  // --- quick fixes ------------------------------------------------------------------
  //: The hover card: a JSON trailing comma, fixed by pressing its button.
  const trailing = '{\n  "a": 1,\n  "b": 2,\n}\n';
  await open("fix.json", "json", trailing);
  await page.waitForTimeout(1300);
  const at = await page.evaluate(() => {
    const r = document.querySelector("#doc-editor .cm-lintRange-error").getBoundingClientRect();
    return { x: r.left + 3, y: r.top + r.height / 2 };
  });
  await page.mouse.move(at.x, at.y);
  await page.waitForTimeout(900);
  const card = await page.evaluate(() => {
    const b = document.querySelector(".cm-tooltip-lint .cm-diagnosticAction");
    if (!b) return null;
    const cs = getComputedStyle(b);
    return { text: b.textContent, bg: cs.backgroundColor, ink: cs.color };
  });
  ok("hovering a JSON error offers its fix as a button", card && /Remove the trailing comma/.test(card.text), J(card));
  ok("drawn in the app's tokens, not the library's dark slab", card && card.bg !== "rgb(68, 68, 68)", J(card));
  await page.click(".cm-tooltip-lint .cm-diagnosticAction");
  await page.waitForTimeout(300);
  s = await state();
  ok("pressing it fixes the text", s.text === '{\n  "a": 1,\n  "b": 2\n}\n', J(s.text));
  await page.waitForTimeout(1300);
  const left = await page.evaluate(() => document.querySelectorAll("#doc-editor .cm-lintRange-error").length);
  ok("and the underline goes", left === 0, left);
  await page.mouse.move(5, 5);

  //: The keyboard: Alt+Enter at the caret, in a C file.
  await open("fix.c", "c", 'int main() {\n    printf("hi);\n}\n');
  await page.waitForTimeout(1300);
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: docCmView.state.doc.line(2).from + 12 } }));
  await page.keyboard.press("Alt+Enter");
  await page.waitForTimeout(300);
  const menu = await page.evaluate(() => {
    const m = [...document.querySelectorAll(".action-menu")].find((el) => !el.classList.contains("hidden"));
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return {
      rows: [...m.querySelectorAll(".menu-item")].map((b) => b.textContent.trim()),
      focus: m.contains(document.activeElement) ? document.activeElement.textContent.trim() : null,
      top: Math.round(r.top),
    };
  });
  ok("Alt+Enter opens the fixes at the caret, first row focused",
    menu && menu.rows[0] === "Close the string" && menu.focus === "Close the string" &&
    menu.rows.includes("Format the document"), J(menu));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  s = await state();
  ok("Enter applies it", s.text === 'int main() {\n    printf("hi");\n}\n', J(s.text));
  const back = await page.evaluate(() => docCmView.hasFocus);
  ok("and the caret is back in the editor", back);
  await page.keyboard.press("Control+z");
  s = await state();
  ok("one Ctrl+Z takes the fix back", s.text === 'int main() {\n    printf("hi);\n}\n', J(s.text));

  //: F8 walks to a problem; a missing bracket is added where it belongs.
  await open("f8.java", "java", "class A {\n    void f() {\n        if (x > 1 {\n            y();\n        }\n    }\n}\n");
  await page.waitForTimeout(1300);
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: 0 } }));
  await page.keyboard.press("F8");
  await page.waitForTimeout(200);
  s = await state();
  ok("F8 goes to the problem", s.line === 3, J(s));
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const l = docCmView.state.doc.line(3);
    docCmView.dispatch({ selection: { anchor: l.from + 11 } });
  });
  await page.keyboard.press("Alt+Enter");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  s = await state();
  ok("a missing ) is added before the {",
    s.text === "class A {\n    void f() {\n        if (x > 1) {\n            y();\n        }\n    }\n}\n", J(s.text));

  //: Python: the compiler's own complaint, with its one certain fix.
  await open("fix.py", "py", "def f(x)\n    return x\n");
  await page.waitForTimeout(1800);
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: 3 } }));
  await page.keyboard.press("Alt+Enter");
  await page.waitForTimeout(300);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  s = await state();
  ok("a Python def gets its missing colon", s.text === "def f(x):\n    return x\n", J(s.text));

  //: Nothing to fix: the menu still opens, says so, and offers the formats.
  await open("clean.c", "c", "int x;\n");
  await page.keyboard.press("Alt+Enter");
  await page.waitForTimeout(300);
  const none = await page.evaluate(() => {
    const m = [...document.querySelectorAll(".action-menu")].find((el) => !el.classList.contains("hidden"));
    return m ? [...m.querySelectorAll(".menu-item")].map((b) => b.textContent.trim()) : null;
  });
  ok("with nothing at the caret the menu says so", none && none[0] === "No quick fix at the caret", J(none));
  await page.keyboard.press("Escape");

  console.log(`\n${good} passed, ${bad} failed; page errors: ${errors.length ? errors.join(" | ") : "none"}`);
  await browser.close();
  process.exit(bad || errors.length ? 1 : 0);
})();
