// Probe: the writing panel's answers, reached from the keyboard.
//
// OPEN.md (prose-intelligence.md): "The writing panel's answers are not
// reachable by keyboard from the row. Enter opens the row, focus stays on the
// control, the candidates are a Tab away with nothing saying so." The rule
// being measured: a row opened with Enter puts focus on the first candidate; a
// row opened with the pointer must not steal focus; Escape and a second Enter
// both hand focus back to the row.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };

const CONTENT = [
  "Writing keys probe",
  "",
  "A short line with teh first typo in it, and recieve as well.",
  "",
  "The last line ends with definately and seperate.",
].join("\n");

const focused = (page) => page.evaluate(() => {
  const el = document.activeElement;
  if (!el) return null;
  return {
    cls: el.className || "",
    text: (el.textContent || "").trim().slice(0, 30),
    inAnswers: Boolean(el.closest && el.closest(".doc-prose-answers")),
    isRow: Boolean(el.classList && el.classList.contains("doc-prose-jump")),
  };
});

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  const seeded = await page.evaluate(async (content) => {
    const r = await api("/documents", { method: "POST", body: JSON.stringify({ title: "Keys probe", content }) });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 2500));
    document.querySelector("[aria-controls='doc-prose-panel']")?.click();
    await new Promise((res) => setTimeout(res, 800));
    return document.querySelectorAll("#doc-prose-panel .doc-prose-jump").length;
  }, CONTENT);
  ok("the panel has rows", seeded > 0, `${seeded} rows`);

  // Keyboard: focus the first row and press Enter.
  await page.evaluate(() => document.querySelector("#doc-prose-panel .doc-prose-jump").focus());
  await page.keyboard.press("Enter");
  await page.waitForTimeout(700);
  let at = await focused(page);
  const opened = await page.evaluate(() =>
    document.querySelector("#doc-prose-panel .doc-prose-jump").getAttribute("aria-expanded"));
  ok("Enter opens the row", opened === "true", opened);
  ok("and focus lands on the first candidate", at && at.inAnswers, JSON.stringify(at));

  // Escape hands it back to the row.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  at = await focused(page);
  const closed = await page.evaluate(() =>
    document.querySelector("#doc-prose-panel .doc-prose-jump").getAttribute("aria-expanded"));
  ok("Escape closes the row", closed === "false", closed);
  ok("and focus is back on the row", at && at.isRow, JSON.stringify(at));

  // A second Enter opens it again, a third (on the row) closes it and keeps focus.
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  at = await focused(page);
  ok("Enter opens it again", at && at.inAnswers, JSON.stringify(at));
  await page.evaluate(() => document.querySelector("#doc-prose-panel .doc-prose-jump").focus());
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  at = await focused(page);
  const reclosed = await page.evaluate(() =>
    document.querySelector("#doc-prose-panel .doc-prose-jump").getAttribute("aria-expanded"));
  ok("Enter on an open row closes it", reclosed === "false", reclosed);
  ok("and leaves focus on the row", at && at.isRow, JSON.stringify(at));

  // The pointer must not have focus stolen from the document: a click opens the
  // row and the editor keeps the caret, which is what "show me this" means.
  await page.click("#doc-prose-panel .doc-prose-jump");
  await page.waitForTimeout(700);
  at = await focused(page);
  const byPointer = await page.evaluate(() =>
    document.querySelector("#doc-prose-panel .doc-prose-jump").getAttribute("aria-expanded"));
  ok("a click opens the row too", byPointer === "true", byPointer);
  ok("and does not move focus into the answers", at && !at.inAnswers, JSON.stringify(at));

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
