// Brief 42: the code editor against VS Code's everyday bar, measured on a
// .js and a .py document. Prints one row per feature: exists, works, number.
// Usage: BASE=http://127.0.0.1:8806 node docs42.js
const { boot } = require("./lib.js");
const J = JSON.stringify;
const JS = "// a nested file\nfunction outer(a) {\n  if (a) {\n    for (const x of a) {\n      console.log(x);\n    }\n  }\n  return a;\n}\nclass Box {\n  size() { return 1; }\n}\nconst value = outer([1, 2]);\n";
const PY = "import os\n\n\ndef outer(a):\n    if a:\n        for x in a:\n            print(x)\n    return a\n\n\nclass Box:\n    def size(self):\n        return 1\n";
(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(1500);
  const rows = [];
  const row = (lang, f, exists, works, n) => rows.push(`| ${lang} | ${f} | ${exists ? "yes" : "no"} | ${works ? "yes" : "no"} | ${n} |`);
  const LANGS = [["js", "js", JS], ["py", "py", PY]];
  if (process.env.ONLY) LANGS.splice(0, LANGS.length, ...LANGS.filter((l) => l[0] === process.env.ONLY));
  for (const [lang, ext, text] of LANGS) {
    const t0 = Date.now();
    await page.evaluate(async ([t, f, c]) => {
      const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: t, content: c, file_type: f }) });
      await loadDocuments(d.id);
    }, [`m42.${ext}`, ext, text]);
    await page.waitForFunction(() => typeof docCmView !== "undefined" && docCmView && docCmView.state.doc.length > 50, null, { timeout: 15000 });
    const openMs = Date.now() - t0;
    await page.waitForTimeout(1500);
    const sel = (a) => page.evaluate((a) => { docCmView.focus(); docCmView.dispatch({ selection: { anchor: a } }); }, a);
    row(lang, "open (ms, create plus load)", true, true, openMs);
    await sel(text.indexOf("console") > 0 ? text.indexOf("console") : text.indexOf("print"));
    await page.waitForTimeout(200);
    const g = await page.evaluate(() => {
      const el = document.querySelector(".cm-activeLineGutter");
      const line = document.querySelector(".cm-activeLine");
      return { w: el ? getComputedStyle(el).fontWeight : null, border: line ? getComputedStyle(line).borderTopWidth + "/" + getComputedStyle(line).outlineWidth + "/" + getComputedStyle(line).boxShadow.slice(0, 30) : null,
        guides: document.querySelectorAll(".cm-indent-guide, .cm-indent-markers").length,
        guideStyle: (() => { const l = [...document.querySelectorAll(".cm-line")].find((x) => /console|print/.test(x.textContent)); return l ? getComputedStyle(l).backgroundImage.slice(0, 40) : null; })(),
        folds: document.querySelectorAll(".cm-foldGutter .cm-gutterElement *").length,
        minimap: document.querySelectorAll(".cm-minimap-gutter, .cm-minimap").length,
        lintGutter: document.querySelectorAll(".cm-gutter-lint").length };
    });
    row(lang, "active line number weight / line border", true, g.w >= 600, `weight ${g.w}, border ${g.border}`);
    row(lang, "indent guides", g.guides > 0, g.guides > 0, `${g.guides} guide marks`);
    row(lang, "fold markers in gutter", g.folds > 0, g.folds > 0, g.folds);
    row(lang, "minimap", g.minimap > 0, g.minimap > 0, g.minimap);
    // completion
    const before = await page.evaluate(() => docCmView.state.doc.length);
    await sel(before);
    await page.keyboard.type(lang === "js" ? "\ncons" : "\npri", { delay: 60 });
    if (process.env.DEBUG) console.log(await page.evaluate(() => [document.activeElement.className, document.activeElement.id, docCmView.state.doc.toString().slice(-30), docCmView.hasFocus]));
    await page.waitForTimeout(700);
    const comp = await page.evaluate(() => ({ opts: [...document.querySelectorAll(".cm-tooltip-autocomplete li")].slice(0, 6).map((l) => l.textContent.slice(0, 20)), ghost: [...document.querySelectorAll(".cm-ghostText")].map((e) => e.textContent).filter(Boolean).slice(0, 3) }));
    row(lang, "completion knows the language", comp.opts.length > 0, comp.opts.length > 0, `options ${J(comp.opts)} ghost ${J(comp.ghost)}`);
    await page.keyboard.press("Escape"); await page.evaluate(() => docCmView.focus());
    // prose ghost on a sentence (INBOX 735)
    await page.keyboard.press("Escape"); await page.keyboard.type(lang === "py" ? "\n# the quick bro" : "\n// the quick bro", { delay: 60 }); await page.waitForTimeout(900);
    const ghost2 = await page.evaluate(() => [...document.querySelectorAll(".cm-ghostText")].map((e) => e.textContent).filter(Boolean).slice(0, 3));
    row(lang, "prose ghost text in a comment (INBOX 735, should be none)", true, ghost2.length === 0, J(ghost2));
    // brackets auto-close
    await page.keyboard.type("\nx = (", { delay: 40 });
    const tail = await page.evaluate(() => { const s = docCmView.state; const l = s.doc.lineAt(s.selection.main.head); return l.text; });
    row(lang, "bracket auto-close", true, /\(\)$/.test(tail), J(tail));
    // diagnostics
    await page.keyboard.type(lang === "js" ? "\nconst = ;" : "\ndef (:", { delay: 30 });
    await page.waitForTimeout(2500);
    const diag = await page.evaluate(() => ({ marks: document.querySelectorAll(".cm-lint-marker").length, under: document.querySelectorAll(".cm-lintRange").length }));
    row(lang, "diagnostics pinned to their line", diag.marks > 0, diag.marks > 0, J(diag));
    // multi-cursor
    await sel(text.indexOf(lang === "py" ? "return" : "outer"));
    await page.keyboard.press("Control+d"); await page.keyboard.press("Control+d");
    const ranges = await page.evaluate(() => docCmView.state.selection.ranges.length);
    row(lang, "multi-cursor Ctrl+D", true, ranges >= 2, `${ranges} ranges`);
    await page.keyboard.press("Escape"); await page.evaluate(() => docCmView.focus());
    // find with regex
    await sel(0);
    await page.keyboard.press("Control+f"); await page.waitForTimeout(300);
    const find = await page.evaluate(() => ({ panel: !!document.querySelector(".cm-search"), re: !!document.querySelector(".cm-search input[name=re]"), replace: !!document.querySelector(".cm-search input[name=replace]") }));
    row(lang, "find and replace with regex (Ctrl+F)", find.panel, find.re && find.replace, J(find));
    await page.keyboard.press("Escape"); await page.evaluate(() => docCmView.focus());
    // go to line
    await page.evaluate(() => docCmView.focus());
    await page.keyboard.press("Control+g"); await page.waitForTimeout(300);
    const gl = await page.evaluate(() => !!document.querySelector(".cm-gotoLine, .cm-panel.cm-gotoLine, [aria-label*='line' i] input"));
    row(lang, "go to line (Ctrl+G)", gl, gl, gl ? "dialog" : "Ctrl+G does nothing visible");
    await page.keyboard.press("Escape"); await page.evaluate(() => docCmView.focus());
    // go to symbol
    await page.evaluate(() => docCmView.focus());
    await page.keyboard.press("Control+Shift+o"); await page.waitForTimeout(300);
    const sym = await page.evaluate(() => document.querySelectorAll(".menu-popup button, [role=menu] [role=menuitem], .ctx-menu button").length);
    row(lang, "go to symbol (Ctrl+Shift+O)", sym > 0, sym > 0, `${sym} items`);
    await page.keyboard.press("Escape"); await page.evaluate(() => docCmView.focus());
    // palette
    const pal = await page.evaluate(() => { const code = !docFileType().previewable; const c = DOC_COMMANDS.filter((x) => x.run && (!x.code || code)); return { n: c.length, keys: c.filter((x) => x.keys).length, fold: c.filter((x) => /fold/i.test(x.label)).map((x) => x.label), lint: c.filter((x) => /problem|lint/i.test(x.label)).map((x) => x.label), fmt: c.filter((x) => /format/i.test(x.label)).length, diff: c.filter((x) => /compare|diff/i.test(x.label)).map((x) => x.label) }; });
    row(lang, "palette commands (with a shortcut)", true, pal.n > 0, `${pal.n} (${pal.keys})`);
    row(lang, "palette: fold all / unfold all", pal.fold.length > 0, pal.fold.length > 0, J(pal.fold));
    row(lang, "palette: problems panel", pal.lint.length > 0, pal.lint.length > 0, J(pal.lint));
    row(lang, "palette: format", pal.fmt > 0, pal.fmt > 0, pal.fmt);
    row(lang, "palette: diff against a version", pal.diff.length > 0, pal.diff.length > 0, J(pal.diff));
    const run = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /^Run\b/.test(b.title || "")).map((b) => (b.disabled ? "disabled" : "enabled") + (b.offsetParent ? ":shown:" : ":hidden:") + b.id));
    row(lang, "run button", run.length > 0, run.some((r) => r.startsWith("enabled")), J(run));
  }
  console.log(rows.join("\n"));
  console.log("errors", J(errors.slice(0, 5)));
  await browser.close();
})();
