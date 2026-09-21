// The live view's highlights: the default colour, the named set, and the fact
// that the colour prefix is syntax rather than words.
//
// The owner's report, 2026-09-21 (INBOX 291): "a text which should be
// highlighted a normal yellow is still highlighted blue??", with screenshots
// showing `==highlighted==` drawn blue and `==blue|highlighted==` rendering
// the literal text "blue|highlighted". Two faults: the live view's default
// rule took `--accent-soft`, which is the blue of the named set, and its scan
// pattern had no colour half at all, so the prefix stayed in the words.
//
// Measured, not looked at: `getComputedStyle().backgroundColor` per mark, and
// the rendered text of each one.
const { boot } = require("./lib.js");
const { openDoc } = require("./docopen.js");

let failures = 0;

function ok(label, pass, detail) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}  — ${detail}`);
  if (!pass) failures += 1;
}

const CONTENT = [
  "# Highlights",
  "",
  "A plain ==highlighted== word.",
  "",
  "A ==blue|highlighted== word.",
  "",
  "A ==green|highlighted== word.",
  "",
].join("\n");

(async () => {
  const { page, browser } = await boot({ width: 1440, height: 900 });
  await openDoc(page, { title: "Highlight sweep", content: CONTENT });
  await page.waitForTimeout(600);

  const marks = await page.evaluate(() =>
    [...document.querySelectorAll(".cm-md-highlight")].map((el) => ({
      text: el.textContent,
      background: getComputedStyle(el).backgroundColor,
      classes: el.className,
    })),
  );

  ok("the live view draws all three highlights", marks.length >= 3, JSON.stringify(marks.length));

  const plain = marks[0] || {};
  const blue = marks[1] || {};
  const green = marks[2] || {};

  ok(
    "a plain highlight is not the blue of the named set",
    plain.background && blue.background && plain.background !== blue.background,
    `plain ${plain.background} vs blue ${blue.background}`,
  );
  ok(
    "and a blue one is blue, so the named set still reaches the class",
    blue.classes && blue.classes.includes("cm-md-highlight-blue"),
    String(blue.classes),
  );
  ok(
    "green is its own colour, not the default and not blue",
    green.background &&
      green.background !== plain.background &&
      green.background !== blue.background,
    `green ${green.background}`,
  );

  // The prefix is syntax. CodeMirror hides it with a replacing decoration, so
  // it is out of the layout rather than merely invisible: the mark's own text
  // must not carry it.
  for (const [name, mark] of [["blue", blue], ["green", green]]) {
    ok(
      `the ${name} prefix is hidden, not read as words`,
      mark.text !== undefined && !mark.text.includes("|"),
      JSON.stringify(mark.text),
    );
  }

  const rendered = await page.evaluate(() => document.querySelector(".cm-content")?.innerText || "");
  ok(
    "and no colour name survives anywhere in the visible text",
    !/\b(blue|green)\|/.test(rendered),
    JSON.stringify(rendered.slice(0, 120)),
  );

  await browser.close();
  console.log(failures ? `FAILURES: ${failures}` : "ALL PASS");
  process.exit(failures ? 1 : 0);
})();
