// The owner, 2026-09-23 (INBOX 394 (c)): "on the document editor code files
// I want ALL THE PREFILL SUGGESTIONS AND POPUP BOXES FOR OPTIONS. like if I
// do just '!' on a document and press enter it does base html code, or for
// all the available css properties for that css feature, or doinf inline
// suggestions."
//
// Types into real code documents in Chromium and asserts the list, the ghost
// text and the resulting text, key by key: Emmet's `!` and `ul>li*3` in
// HTML, a property then its own values in CSS, Emmet's `m10`, a name in
// scope in JavaScript, a builtin in Python, and that prose gets none of it.
// tests/test_code_completion.py holds the string work to exact output.
//
// Usage: BASE=http://127.0.0.1:8799 [THEME=dark] node doccomplete.js
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

  //: Open a new document of a type, with the caret at `at` (default: end).
  const open = async (title, fileType, content, at) => {
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
      docCmView.dispatch({ selection: { anchor: a ?? docCmView.state.doc.length } });
    }, at);
  };
  const state = () =>
    page.evaluate(() => {
      const s = docCmView.state;
      const r = s.selection.main;
      return { text: s.doc.toString(), head: r.head, selected: s.sliceDoc(r.from, r.to) };
    });
  //: The list as drawn: each row's label and detail, and the chosen one.
  const list = () =>
    page.evaluate(() => {
      const box = document.querySelector(".cm-tooltip-autocomplete");
      if (!box) return null;
      const rows = [...box.querySelectorAll("li")].map((li) => ({
        label: li.querySelector(".cm-completionLabel")?.textContent || "",
        detail: li.querySelector(".cm-completionDetail")?.textContent || "",
        chosen: li.getAttribute("aria-selected") === "true",
      }));
      return { rows, labels: rows.map((r) => r.label) };
    });
  const ghost = () =>
    page.evaluate(() => {
      const g = document.querySelector(".cm-ghostText");
      if (!g) return null;
      const cs = getComputedStyle(g);
      return { text: g.textContent, color: cs.color, pointer: cs.pointerEvents };
    });
  const settle = () => page.waitForTimeout(450);
  const J = JSON.stringify;

  // --- HTML: `!` and Enter ---------------------------------------------------
  await open("page.html", "html", "");
  await page.waitForFunction(() => !!window.EMMET, null, { timeout: 5000 }).catch(() => {});
  ok("the Emmet bundle loads when an HTML document opens", await page.evaluate(() => !!window.EMMET));
  await page.keyboard.type("!");
  await settle();
  let l = await list();
  ok("typing ! opens the list with an Emmet row", !!l && l.labels.includes("!") && l.rows.some((r) => r.detail === "Emmet"), J(l));
  const info = await page.evaluate(() => document.querySelector(".cm-completionInfo")?.textContent || "");
  ok("the row's detail pane previews the page", info.startsWith("<!DOCTYPE html>"), info.slice(0, 40));
  const infoBg = await page.evaluate(() => {
    const el = document.querySelector(".cm-tooltip.cm-completionInfo");
    return el ? getComputedStyle(el).backgroundColor : null;
  });
  ok("the detail pane is opaque", !!infoBg && !/rgba\(.*, 0(\.\d+)?\)$/.test(infoBg), infoBg);
  await page.keyboard.press("Enter");
  await settle();
  let s = await state();
  ok("! then Enter writes the HTML5 page", s.text.startsWith("<!DOCTYPE html>\n<html lang=\"en\">\n<head>") && s.text.includes("<title>Document</title>") && s.text.trimEnd().endsWith("</html>"), J(s.text.slice(0, 80)));
  ok("the viewport line is whole", s.text.includes('content="width=device-width, initial-scale=1.0"'));
  ok("the caret lands on the title, selected", s.selected === "Document", J(s.selected));
  await page.keyboard.type("My page");
  await page.keyboard.press("Tab");
  await settle();
  s = await state();
  const bodyLine = await page.evaluate(() => {
    const st = docCmView.state;
    return st.doc.lineAt(st.selection.main.head).text;
  });
  ok("Tab moves to the body", s.text.includes("<title>My page</title>") && /^\s*$/.test(bodyLine) && s.text.indexOf("<body>") < s.head, J({ bodyLine, head: s.head }));

  // --- HTML: an abbreviation with operators ------------------------------------
  await page.keyboard.type("div.card>ul>li*3");
  await settle();
  l = await list();
  ok("div.card>ul>li*3 is offered", !!l && l.labels.includes("div.card>ul>li*3"), J(l && l.labels));
  await page.keyboard.press("Enter");
  await settle();
  s = await state();
  ok("and expands with the body's indent", s.text.includes('\t<div class="card">\n\t\t<ul>\n\t\t\t<li></li>\n\t\t\t<li></li>\n\t\t\t<li></li>\n\t\t</ul>\n\t</div>') || s.text.includes('  <div class="card">\n    <ul>\n      <li></li>'), J(s.text.split("<body>")[1]));

  await open("links.html", "html", "");
  await page.keyboard.type("a[href");
  await settle();
  s = await state();
  ok("closeBrackets closed the [ ahead of the caret", s.text === "a[href]", J(s.text));
  await page.keyboard.press("Tab");
  await settle();
  s = await state();
  ok("Tab expands a[href] with the caret in the href", s.text === '<a href=""></a>' && s.head === 9, J(s));

  await open("prose.html", "html", "<p>Read this ");
  await page.keyboard.type("p");
  await settle();
  l = await list();
  ok("a word mid-sentence opens no Emmet row", !l || !l.rows.some((r) => r.detail === "Emmet"), J(l));
  await page.keyboard.press("Escape");

  await open("tags.html", "html", "");
  await page.keyboard.type("<di");
  await settle();
  l = await list();
  ok("HTML's own tag list still opens after <", !!l && l.labels.includes("div"), J(l && l.labels.slice(0, 8)));
  await page.keyboard.press("Escape");

  // --- CSS: a property, then its own values ------------------------------------
  await open("site.css", "css", "a {\n  \n}", 6);
  await page.keyboard.type("col");
  await settle();
  l = await list();
  ok("col in a rule lists color", !!l && l.labels.includes("color"), J(l && l.labels.slice(0, 8)));
  const chosen = l && l.rows.find((r) => r.chosen);
  let g = await ghost();
  const expectGhost = chosen && chosen.label.startsWith("col") ? chosen.label.slice(3) : null;
  ok("the ghost text is the rest of the chosen row", !!g && g.text === expectGhost, J({ g, chosen }));
  const muted = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--muted)";
    document.querySelector(".cm-content").appendChild(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  ok("the ghost is in muted ink and takes no clicks", !!g && g.color === muted && g.pointer === "none", J({ g, muted }));
  await page.keyboard.press("Escape");
  await settle();
  g = await ghost();
  l = await list();
  ok("Escape closes the list and the ghost with it", !g && !l, J({ g, l }));

  await open("site2.css", "css", "a {\n  \n}", 6);
  await page.keyboard.type("colo");
  await settle();
  l = await list();
  const top = l && l.rows.find((r) => r.chosen);
  await page.keyboard.press("Tab");
  await settle();
  s = await state();
  ok("Tab takes the chosen row and writes the colon", !!top && s.text === `a {\n  ${top.label}: \n}`, J({ top, text: s.text }));
  l = await list();
  //: The list draws its first 60 rows; the whole set is the engine's.
  const all = await page.evaluate(() => CM6.autocomplete.currentCompletions(docCmView.state).map((c) => c.label));
  ok("and the value list opens straight away", !!l && all.includes("red") && all.includes("rebeccapurple"), `${all.length} values`);
  ok("currentcolor and transparent head it", l && l.labels.slice(0, 2).sort().join(" ") === "currentcolor transparent", J(l && l.labels.slice(0, 4)));
  await page.keyboard.press("Escape");

  await open("site3.css", "css", "a {\n  display: \n}", 15);
  await page.keyboard.type("f");
  await settle();
  l = await list();
  ok("display: f lists flex, and not a colour", !!l && l.labels.includes("flex") && !l.labels.includes("fuchsia"), J(l && l.labels.slice(0, 10)));
  const displayRows = await page.evaluate(async () => {
    CM6.autocomplete.closeCompletion(docCmView);
    const st = docCmView.state;
    docCmView.dispatch({ changes: { from: st.selection.main.head - 1, to: st.selection.main.head, insert: "" } });
    CM6.autocomplete.startCompletion(docCmView);
    await new Promise((r) => setTimeout(r, 400));
    return [...document.querySelectorAll(".cm-tooltip-autocomplete li .cm-completionLabel")].map((e) => e.textContent);
  });
  ok("display: lists its own values, the global four last", displayRows.includes("grid") && displayRows.indexOf("inline-block") < displayRows.indexOf("inherit") && displayRows.slice(-4).sort().join(" ") === "inherit initial revert unset", J(displayRows.slice(-6)));
  ok("each value once", displayRows.length === new Set(displayRows).size, `${displayRows.length} rows`);
  await page.keyboard.press("Escape");

  await open("site4.css", "css", "a {\n  \n}", 6);
  await page.keyboard.type("m10");
  await settle();
  l = await list();
  ok("m10 is offered as Emmet", !!l && l.rows.some((r) => r.label === "m10" && r.detail === "Emmet"), J(l));
  await page.keyboard.press("Enter");
  await settle();
  s = await state();
  ok("and Enter writes margin: 10px;", s.text === "a {\n  margin: 10px;\n}", J(s.text));

  // --- JavaScript and Python ---------------------------------------------------
  await open("app.js", "js", "const totalCount = 1;\nconst x = ");
  await page.keyboard.type("tot");
  await settle();
  l = await list();
  ok("a JS name in scope is offered", !!l && l.labels.includes("totalCount"), J(l && l.labels.slice(0, 8)));
  g = await ghost();
  ok("with its ghost", !!g && g.text === "alCount", J(g));
  await page.keyboard.press("Tab");
  await settle();
  s = await state();
  ok("Tab takes it", s.text.endsWith("const x = totalCount"), J(s.text));

  await open("app2.js", "js", "");
  await page.keyboard.type("func");
  await settle();
  l = await list();
  ok("JS snippets are offered", !!l && l.labels.includes("function"), J(l && l.labels.slice(0, 8)));
  await page.keyboard.press("Escape");

  await open("run.py", "py", "");
  await page.keyboard.type("pri");
  await settle();
  l = await list();
  ok("a Python builtin is offered", !!l && l.labels.includes("print"), J(l && l.labels.slice(0, 8)));
  await page.keyboard.press("Escape");

  // --- prose gets none of it -----------------------------------------------------
  await open("notes.md", "md", "");
  await page.keyboard.type("div");
  await settle();
  l = await list();
  ok("a markdown document opens no list", !l, J(l));
  await page.keyboard.type(" !");
  await page.keyboard.press("Enter");
  await settle();
  s = await state();
  ok("and ! then Enter is a new line", s.text === "div !\n", J(s.text));
  await page.keyboard.press("Tab");
  await settle();
  s = await state();
  ok("Tab in prose still indents", /^div !\n\s+$/.test(s.text), J(s.text));

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
