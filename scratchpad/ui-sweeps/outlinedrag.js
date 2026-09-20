// Probe: reordering a document from its outline (DOCUMENTS_PLAN Phase 4 item
// 3, PLAN D6). What is measured is the document's own text after each move:
// a drag that redraws the outline and leaves the markdown alone is the failure
// this is here to catch.
//
// The drag itself is driven with real pointer events (Playwright's
// `dragAndDrop` does not fire the HTML5 drag protocol reliably in this
// Chromium), so the handlers are exercised by dispatching the same events the
// browser would, with a shared DataTransfer.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };

const DOC = [
  "# Paper",
  "",
  "intro line",
  "",
  "## Method",
  "",
  "method body",
  "",
  "### Sampling",
  "",
  "sampling body",
  "",
  "## Results",
  "",
  "results body",
  "",
  "## Discussion",
  "",
  "discussion body",
  "",
].join("\n");

const headings = (page) => page.evaluate(() =>
  docScanHeadings(docSurface().text).map((h) => h.text));

const dragRow = (page, fromText, toText, after) => page.evaluate(({ f, t, a }) => {
  const rows = [...document.querySelectorAll("#doc-outline > li")];
  const from = rows.find((li) => li.textContent.trim().startsWith(f));
  const to = rows.find((li) => li.textContent.trim().startsWith(t));
  if (!from || !to) return "rows not found";
  const data = new DataTransfer();
  from.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: data }));
  const box = to.getBoundingClientRect();
  const y = a ? box.top + box.height - 2 : box.top + 2;
  to.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: data, clientY: y }));
  const mark = to.classList.contains("is-drop-after") ? "after" : to.classList.contains("is-drop-before") ? "before" : "none";
  to.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: data, clientY: y }));
  from.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: data }));
  return mark;
}, { f: fromText, t: toText, a: after });

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.evaluate(async (content) => {
    const r = await api("/documents", { method: "POST", body: JSON.stringify({ title: "Reorder probe", content }) });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
  }, DOC);
  await page.waitForTimeout(2400);
  await page.evaluate(() => showDocSidebarSection("outline"));
  await page.waitForTimeout(600);

  ok("the outline reads as written", (await headings(page)).join(" > ") === "Paper > Method > Sampling > Results > Discussion",
    (await headings(page)).join(" > "));
  const draggable = await page.evaluate(() =>
    [...document.querySelectorAll("#doc-outline > li")].every((li) => li.draggable));
  ok("every row is draggable", draggable);

  // Results above Method.
  let mark = await dragRow(page, "Results", "Method", false);
  await page.waitForTimeout(500);
  ok("the drop line is drawn above the target", mark === "before", mark);
  ok("Results moves above Method, with its own body",
    (await headings(page)).join(" > ") === "Paper > Results > Method > Sampling > Discussion",
    (await headings(page)).join(" > "));
  let text = await page.evaluate(() => docSurface().text);
  ok("and the body travelled with the heading",
    /## Results\n\nresults body\n\n## Method\n\nmethod body/.test(text),
    JSON.stringify(text.slice(text.indexOf("## Results"), text.indexOf("### Sampling"))));

  // Method carries its own subsection when it moves.
  mark = await dragRow(page, "Method", "Discussion", true);
  await page.waitForTimeout(500);
  ok("the drop line is drawn below the target", mark === "after", mark);
  ok("a section takes its subsections with it",
    (await headings(page)).join(" > ") === "Paper > Results > Discussion > Method > Sampling",
    (await headings(page)).join(" > "));

  // A parent cannot be dropped inside its own child.
  const before = await headings(page);
  await dragRow(page, "Method", "Sampling", false);
  await page.waitForTimeout(500);
  ok("a section cannot be dropped inside itself",
    (await headings(page)).join(" > ") === before.join(" > "), (await headings(page)).join(" > "));

  // The keyboard half.
  await page.evaluate(() => {
    const row = [...document.querySelectorAll("#doc-outline .outline-link")]
      .find((b) => b.textContent.trim().startsWith("Discussion"));
    row.focus();
  });
  await page.keyboard.press("Alt+ArrowUp");
  await page.waitForTimeout(600);
  ok("Alt+ArrowUp moves a section up",
    (await headings(page)).join(" > ") === "Paper > Discussion > Results > Method > Sampling",
    (await headings(page)).join(" > "));
  const focused = await page.evaluate(() => (document.activeElement.textContent || "").trim().slice(0, 12));
  ok("and focus stays on the row that moved", /^Discussion/.test(focused), focused);

  // Nothing was lost: every body line is still in the document, once.
  text = await page.evaluate(() => docSurface().text);
  const bodies = ["intro line", "method body", "sampling body", "results body", "discussion body"];
  const counts = bodies.map((b) => (text.split(b).length - 1));
  ok("every paragraph is still there, exactly once", counts.every((n) => n === 1), JSON.stringify(counts));
  ok("no run of three blank lines was left behind", !/\n\n\n\n/.test(text),
    JSON.stringify(text.slice(0, 60)));

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
