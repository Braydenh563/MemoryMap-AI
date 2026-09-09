// DOCUMENTS_PLAN Phase 2 step 3: is Live actually rendering, in place?
//
// Numbers only. Every check reads the DOM the decorations built or the
// computed style they produced; nothing here is a screenshot looked at.
//
//   BASE=http://127.0.0.1:8786 node scratchpad/ui-sweeps/cm-live.js
const { boot } = require("./lib.js");

const BODY = [
  "# A heading",
  "",
  "Some **bold** and *italic* and `code` and ~~struck~~ and ==marked== text.",
  "",
  "A [link](https://example.com) and a [[Another doc]] chip.",
  "",
  "- [ ] a task",
  "- [x] a done task",
  "",
  "> a quote",
  "",
  "> [!note] a callout",
  "",
  "```",
  "fenced code",
  "```",
  "",
  "This sentance has teh typo in it.",
].join("\n");

let failures = 0;
function ok(name, condition, detail) {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail === undefined ? "" : `  — ${detail}`}`);
}

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 200)));
  page.on("pageerror", (e) => errors.push("PAGEERROR " + e.message));

  await page.evaluate(async (body) => {
    const r = await api("/documents", {
      method: "POST",
      body: JSON.stringify({ title: "Live sweep", content: body }),
    });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
  }, BODY);
  await page.waitForTimeout(2500);
  await page.evaluate(() => setDocView("live"));
  await page.waitForTimeout(900);
  // The caret starts at offset 0, which is *on* the heading line, and a
  // marker on the caret's line is revealed by design. Moved to the end first,
  // so what is measured below is the resting state a reader sees.
  await page.evaluate(() => docSurface().setSelection(docSurface().text.length));
  await page.waitForTimeout(400);

  const count = (selector) => page.evaluate((s) => document.querySelectorAll(s).length, selector);

  ok("no second pane", (await count("#doc-live")) === 0);
  ok("one editor", (await count("#doc-editor .cm-editor")) === 1);

  // Headings render at heading size, and the marker is hidden with the caret
  // elsewhere. Both read out of the page rather than looked at.
  const h1 = await page.evaluate(() => {
    const line = document.querySelector("#doc-editor .cm-md-h1");
    if (!line) return null;
    const body = getComputedStyle(document.querySelector("#doc-editor .cm-content"));
    return {
      size: Number.parseFloat(getComputedStyle(line).fontSize),
      base: Number.parseFloat(body.fontSize),
      text: line.textContent,
    };
  });
  ok("a heading is a heading", h1 && h1.size > h1.base * 1.4, JSON.stringify(h1));
  ok("its # is hidden until the caret is on the line", h1 && !h1.text.includes("#"), h1 && h1.text);

  ok("bold", (await count("#doc-editor .cm-md-strong")) === 1);
  ok("italic", (await count("#doc-editor .cm-md-em")) === 1);
  ok("inline code", (await count("#doc-editor .cm-md-code")) === 1);
  ok("strikethrough", (await count("#doc-editor .cm-md-strike")) === 1);
  ok("highlight", (await count("#doc-editor .cm-md-highlight")) === 1);
  ok("a link chip", (await count("#doc-editor .cm-md-link")) === 1);
  ok("a wiki chip", (await count("#doc-editor .cm-md-wiki")) === 1);
  ok("task checkboxes", (await count("#doc-editor input.cm-md-task")) === 2);
  ok("a quote bar", (await count("#doc-editor .cm-md-quote")) >= 1);
  ok("a callout bar", (await count("#doc-editor .cm-md-callout")) >= 1);
  ok("a fenced block", (await count("#doc-editor .cm-md-fence")) >= 3);
  ok("a finding underline", (await count("#doc-editor .cm-finding")) >= 1);

  ok(
    "the bold markers are hidden",
    !(await page.evaluate(() => document.querySelector("#doc-editor .cm-md-strong").textContent.includes("*")))
  );

  // The caret reveals the markers on the range it enters.
  const revealed = await page.evaluate(() => {
    const at = docSurface().text.indexOf("bold") + 1;
    docSurface().setSelection(at, at);
    return new Promise((resolve) =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          resolve(document.querySelector("#doc-editor .cm-md-strong").textContent)
        )
      )
    );
  });
  ok("the caret reveals them", revealed.includes("**"), JSON.stringify(revealed));

  // A checkbox writes the source.
  const toggled = await page.evaluate(async () => {
    const before = docSurface().text;
    document.querySelector("#doc-editor input.cm-md-task").click();
    await new Promise((r) => setTimeout(r, 200));
    return { before: before.includes("- [ ] a task"), after: docSurface().text.includes("- [x] a task") };
  });
  ok("a checkbox writes the source", toggled.before && toggled.after, JSON.stringify(toggled));

  // Source view is the same editor with the decorations off.
  await page.evaluate(() => setDocView("source"));
  await page.waitForTimeout(500);
  ok("Source drops the markdown decorations", (await count("#doc-editor .cm-md-strong")) === 0);
  ok("Source keeps the findings", (await count("#doc-editor .cm-finding")) >= 1);
  ok("Source is the same editor", (await count("#doc-editor .cm-editor")) === 1);

  ok("no console errors", errors.length === 0, errors.join(" | "));
  console.log(failures === 0 ? "ALL PASS" : `${failures} FAILED`);
  await browser.close();
})();
