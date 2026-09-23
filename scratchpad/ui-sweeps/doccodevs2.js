// INBOX 402, the second half of the VS Code features (doccodevs.js has the
// first): colour swatches, hover docs, indentation guides and bracket
// colours, the outline jump, wrap and whitespace, sticky scroll. Measured in
// Chromium, numbers not looks: computed colours, rects, the text produced.
//
// Usage: BASE=http://127.0.0.1:8799 [THEME=dark] node doccodevs2.js
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
  const J = JSON.stringify;

  // --- 4. colour swatches ---------------------------------------------------------
  await open(
    "colours.css",
    "css",
    "a {\n  color: #ff0000;\n  background: rgb(0, 128, 0);\n  border-color: red;\n}\n/* red and #00f in a comment */"
  );
  await page.waitForTimeout(300);
  const swatches = await page.evaluate(() =>
    [...document.querySelectorAll(".cm-color-swatch")].map((s) => {
      const cs = getComputedStyle(s);
      const r = s.getBoundingClientRect();
      return { bg: cs.backgroundColor, w: Math.round(r.width), h: Math.round(r.height), border: cs.borderTopWidth };
    })
  );
  ok("three values, three swatches, none for the comment", swatches.length === 3, J(swatches));
  ok(
    "each in its own colour",
    J(swatches.map((s) => s.bg)) === J(["rgb(255, 0, 0)", "rgb(0, 128, 0)", "rgb(255, 0, 0)"]),
    J(swatches.map((s) => s.bg))
  );
  ok("a small square on a hairline", swatches.every((s) => s.w === s.h && s.w >= 8 && s.w <= 16 && s.border === "1px"), J(swatches[0]));
  const pick = async (index, value) => {
    const box = await page.evaluate((i) => {
      const r = document.querySelectorAll(".cm-color-swatch")[i].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, index);
    await page.mouse.click(box.x, box.y);
    await page.waitForTimeout(200);
    return page.evaluate((v) => {
      const input = document.querySelector(".doc-color-input");
      if (!input) return null;
      const before = input.value;
      input.value = v;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      return { before, left: document.querySelector(".doc-color-input") !== null };
    }, value);
  };
  let picked = await pick(0, "#00ff00");
  let t = await text();
  ok("a click opens the picker on the value's colour", picked && picked.before === "#ff0000", J(picked));
  ok("and a pick writes the hex back", t.includes("color: #00ff00;"), J(t.split("\n")[1]));
  ok("the picker's input goes when it closes", picked && picked.left === false);
  picked = await pick(1, "#0000ff");
  t = await text();
  ok("rgb() stays rgb()", t.includes("background: rgb(0, 0, 255);"), J(t.split("\n")[2]));

  await open("style.html", "html", "<style>\n  p { color: teal; }\n</style>\n<p>teal</p>");
  await page.waitForTimeout(300);
  const inHtml = await page.evaluate(() => document.querySelectorAll(".cm-color-swatch").length);
  ok("an HTML file's <style> gets them, its text does not", inHtml === 1, `${inHtml} swatches`);

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
