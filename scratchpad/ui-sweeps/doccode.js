// INBOX 392: "the code document types dont act like a code editor with
// errors, suggestions". A code document, opened for real, must underline a
// syntax error in the app's error ink with a mark in the gutter, clear it when
// the error is fixed, and offer completions as a name is typed; a markdown
// document and Plain view must do neither.
//
// Usage: BASE=http://127.0.0.1:8793 [THEME=dark] node doccode.js
const { boot } = require("./lib.js");

let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
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
    await page.waitForTimeout(1500);
  };
  const lint = () =>
    page.evaluate(() => {
      const ranges = [...document.querySelectorAll("#doc-editor .cm-lintRange-error")];
      const marks = [...document.querySelectorAll("#doc-editor .cm-lint-marker-error")];
      const gutter = document.querySelector("#doc-editor .cm-gutter-lint");
      const root = getComputedStyle(document.documentElement);
      const probe = document.createElement("span");
      probe.style.color = root.getPropertyValue("--error");
      document.body.appendChild(probe);
      const errorInk = getComputedStyle(probe).color;
      probe.remove();
      const lines = ranges.map((r) => docCmView.state.doc.lineAt(docCmView.posAtDOM(r)).number);
      const gutters = [...document.querySelectorAll("#doc-editor .cm-gutter")].map((g) => g.className);
      return {
        count: ranges.length,
        lines,
        text: ranges.map((r) => r.textContent),
        underline: ranges[0] ? getComputedStyle(ranges[0]).textDecorationColor : null,
        style: ranges[0] ? getComputedStyle(ranges[0]).textDecorationStyle : null,
        bgImage: ranges[0] ? getComputedStyle(ranges[0]).backgroundImage : null,
        mark: marks[0] ? getComputedStyle(marks[0]).backgroundColor : null,
        markBox: marks[0] ? marks[0].getBoundingClientRect().width : 0,
        gutter: !!gutter,
        firstGutter: gutters[0] || "",
        errorInk,
      };
    });

  // --- Python, checked by the server -----------------------------------------
  await open("broken.py", "py", "x = 1\ndef broken(:\n    pass\n");
  await page.waitForTimeout(1500);
  let m = await lint();
  ok("a Python syntax error is underlined on its line", m.count === 1 && m.lines[0] === 2, JSON.stringify(m));
  ok("in the app's error ink, as a wavy line", m.underline === m.errorInk && m.style === "wavy",
    `${m.underline} vs ${m.errorInk}, ${m.style}`);
  ok("with none of the library's own squiggle image left under it", m.bgImage === "none", m.bgImage);
  ok("and a dot in the gutter in the same ink", m.mark === m.errorInk && m.markBox > 4, `${m.mark} ${m.markBox}`);
  ok("the error gutter is outside the line numbers", /cm-gutter-lint/.test(m.firstGutter), m.firstGutter);
  // Hover shows the message.
  const tip = await page.evaluate(async () => {
    const r = document.querySelector("#doc-editor .cm-lintRange-error").getBoundingClientRect();
    return { x: r.left + 3, y: r.top + r.height / 2 };
  });
  await page.mouse.move(tip.x, tip.y);
  await page.waitForTimeout(900);
  const hover = await page.evaluate(() => {
    const t = document.querySelector(".cm-tooltip-lint");
    if (!t) return null;
    const r = t.getBoundingClientRect();
    return {
      text: t.textContent,
      bg: getComputedStyle(t.closest(".cm-tooltip") || t).backgroundColor,
      visible: r.width > 0 && r.top >= 0 && r.bottom <= innerHeight,
    };
  });
  ok("hovering the underline says what is wrong, on a solid card", !!hover && hover.visible && hover.text.length > 3 && /^rgb\(/.test(hover.bg),
    JSON.stringify(hover));
  await page.mouse.move(5, 5);
  // Fix it.
  await page.evaluate(() => {
    const line = docCmView.state.doc.line(2);
    docCmView.dispatch({ changes: { from: line.from, to: line.to, insert: "def fixed():" } });
  });
  await page.waitForTimeout(1600);
  m = await lint();
  ok("fixing it clears the underline", m.count === 0, JSON.stringify(m.text));

  // --- JSON, in the browser --------------------------------------------------
  await open("bad.json", "json", '{\n  "a": 1,\n  "b": \n}\n');
  await page.waitForTimeout(1300);
  m = await lint();
  ok("a JSON error is underlined", m.count === 1, JSON.stringify(m));

  // --- JavaScript, from the parse tree ---------------------------------------
  await open("bad.js", "js", "const ok = 1;\nfunction (a {\n  return a;\n}\n");
  await page.waitForTimeout(1300);
  m = await lint();
  ok("a JavaScript error is underlined", m.count >= 1 && m.lines.includes(2), JSON.stringify(m));
  await open("good.js", "js", "const ok = 1;\nfunction named(a) {\n  return a + ok;\n}\n");
  await page.waitForTimeout(1300);
  m = await lint();
  ok("valid JavaScript is left alone", m.count === 0, JSON.stringify(m.text));

  // --- TOML, by the server ---------------------------------------------------
  await open("bad.toml", "toml", 'title = "ok"\nbroken = \n');
  await page.waitForTimeout(1500);
  m = await lint();
  ok("a TOML error is underlined", m.count === 1 && m.lines[0] === 2, JSON.stringify(m));

  // --- completions -----------------------------------------------------------
  const complete = async (fileType, content, typed) => {
    await open(`c.${fileType}`, fileType, content);
    await page.evaluate(() => {
      docCmView.focus();
      docCmView.dispatch({ selection: { anchor: docCmView.state.doc.length } });
    });
    await page.keyboard.type(typed, { delay: 40 });
    await page.waitForTimeout(700);
    return page.evaluate(() => {
      const box = document.querySelector(".cm-tooltip-autocomplete");
      if (!box) return null;
      const sel = box.querySelector("li[aria-selected]");
      return {
        options: [...box.querySelectorAll("li")].map((li) => li.textContent).slice(0, 12),
        selectedBg: sel ? getComputedStyle(sel).backgroundColor : null,
        selectedInk: sel ? getComputedStyle(sel).color : null,
      };
    });
  };
  let c = await complete("go", "package main\n\nfunc helperFunction() {}\n\n", "hel");
  ok("Go offers a name already in the file", !!c && c.options.some((o) => o.includes("helperFunction")),
    JSON.stringify(c));
  await page.keyboard.press("Escape");
  c = await complete("go", "package main\n\n", "fu");
  ok("and the language's keywords", !!c && c.options.some((o) => o.includes("func")), JSON.stringify(c));
  const accent = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue("--accent-soft");
    document.body.appendChild(probe);
    const v = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return v;
  });
  ok("the chosen row is in the app's accent, not the library's blue", c && c.selectedBg === accent,
    `${c && c.selectedBg} vs ${accent}`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  const accepted = await page.evaluate(() => docCmView.state.doc.toString());
  ok("Enter takes the completion", /\nfunc$/.test(accepted.trimEnd()), JSON.stringify(accepted.slice(-12)));
  c = await complete("py", "import os\n\n", "pri");
  ok("Python keeps its own completions (print)", !!c && c.options.some((o) => o.includes("print")),
    JSON.stringify(c));
  await page.keyboard.press("Escape");

  // --- and not in prose, or in Plain -----------------------------------------
  c = await complete("md", "# Notes\n\nprinting helperFunction\n\n", "pri");
  const mdGutter = await page.evaluate(() => !!document.querySelector("#doc-editor .cm-gutter-lint"));
  ok("a markdown document gets no completion list", c === null, JSON.stringify(c));
  ok("and no error gutter", !mdGutter);
  await open("plain.py", "py", "def broken(:\n");
  await page.evaluate(() => setDocView("plain"));
  await page.waitForTimeout(1500);
  m = await lint();
  ok("Plain view on a code file draws no diagnostics", m.count === 0 && !m.gutter, JSON.stringify(m));
  await page.evaluate(() => setDocView("source"));
  await page.waitForTimeout(1500);
  m = await lint();
  ok("and Source brings them back", m.count === 1 && m.gutter, JSON.stringify(m));

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${bad ? bad + " FAIL" : "all pass"}`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
