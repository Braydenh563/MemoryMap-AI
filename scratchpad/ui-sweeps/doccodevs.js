// The owner, 2026-09-23 (INBOX 402): "are there any other vscode features we
// can add to the document editor like emmet for other languages or file
// types??"
//
// Presses the real keys in real code documents in Chromium and asserts the
// resulting text, one section per feature. tests/test_code_vscode.py holds
// the commands to exact output in node; this holds that the keys reach them.
//
// Usage: BASE=http://127.0.0.1:8799 [THEME=dark] node doccodevs.js
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

  //: A new document of a type; `|` in the content marks the caret.
  const open = async (title, fileType, marked) => {
    const at = marked.indexOf("|");
    const content = at >= 0 ? marked.slice(0, at) + marked.slice(at + 1) : marked;
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
    await page.evaluate((a) => {
      docCmView.focus();
      docCmView.dispatch({ selection: { anchor: a < 0 ? docCmView.state.doc.length : a } });
    }, at);
  };
  const text = () => page.evaluate(() => docCmView.state.doc.toString());
  const select = (from, to) => page.evaluate(([a, b]) => docCmView.dispatch({ selection: { anchor: a, head: b } }), [from, to]);
  const J = JSON.stringify;

  // --- 1. the comment toggle by the language at the caret ----------------------
  const html = "<p>x</p>\n<script>\n  let a = 1;\n</script>\n<style>\n  a { color: red; }\n</style>";
  await open("mixed.html", "html", html.replace("1;", "1;|"));
  await page.keyboard.press("Control+/");
  await page.waitForTimeout(200);
  let t = await text();
  ok("Ctrl+/ in an HTML file's <script> uses //", t.includes("  // let a = 1;"), J(t));
  await page.keyboard.press("Control+/");
  await page.waitForTimeout(200);
  ok("and again takes it off exactly", (await text()) === html);
  await page.evaluate(() => {
    const s = docCmView.state.doc.toString();
    docCmView.dispatch({ selection: { anchor: s.indexOf("red; }") + 6 } });
  });
  await page.keyboard.press("Control+/");
  await page.waitForTimeout(200);
  t = await text();
  ok("in its <style> uses /* */", t.includes("  /* a { color: red; } */"), J(t));
  await page.keyboard.press("Control+/");
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: 2 } }));
  await page.keyboard.press("Control+/");
  await page.waitForTimeout(200);
  t = await text();
  ok("in its markup uses <!-- -->", t.startsWith("<!-- <p>x</p> -->"), J(t.slice(0, 30)));

  await open("comp.js", "js", "const A = () => (\n  <div>\n    <span>hi</span>|\n  </div>\n);");
  await page.keyboard.press("Control+/");
  await page.waitForTimeout(200);
  t = await text();
  ok("a JSX child takes {/* */}", t.includes("    {/* <span>hi</span> */}"), J(t));

  await open("sum.js", "js", "f(a + b);");
  await select(2, 7);
  await page.keyboard.press("Shift+Alt+A");
  await page.waitForTimeout(200);
  t = await text();
  ok("Shift+Alt+A wraps the selection in a block comment", t === "f(/* a + b */);", J(t));

  await open("q.sql", "sql", "select 1;|");
  await page.keyboard.press("Control+/");
  await page.waitForTimeout(200);
  t = await text();
  ok("a .sql document opens and comments with --", t === "-- select 1;", J(t));

  await open("prose.md", "md", "Some words|");
  await page.keyboard.press("Control+/");
  await page.waitForTimeout(200);
  t = await text();
  ok("prose keeps the file type's own comment", t === "<!-- Some words -->", J(t));


  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
