// Probe: the outline folds and filters (DOCUMENTS_PLAN Phase 4 item 3, and
// OPEN.md's "The outline is headings only, and it does not fold").
//
// Measured: the fold gutter is one column at one width on every row, a fold
// hides the run of deeper headings under it and survives a reopen, the filter
// box appears only once there are headings worth hunting through, filtering
// ignores folds, and the scroll-spy never marks a row that is not drawn.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };

const SHORT = "# One\n\ntext\n\n## Two\n\ntext\n";
let LONG = "# Top\n\nintro\n";
for (let i = 1; i <= 6; i += 1) {
  LONG += `\n## Section ${i}\n\nbody\n`;
  for (let j = 1; j <= 2; j += 1) LONG += `\n### Part ${i}.${j}\n\nbody\n`;
}

const rowState = (page) => page.evaluate(() =>
  [...document.querySelectorAll("#doc-outline > li")].map((li) => ({
    text: li.querySelector(".outline-link").firstChild.textContent.trim(),
    hidden: li.classList.contains("hidden"),
    twist: li.querySelector(".outline-twist").tagName,
    twistW: Math.round(li.querySelector(".outline-twist").getBoundingClientRect().width),
    linkX: Math.round(li.querySelector(".outline-link").getBoundingClientRect().x),
    padLeft: Math.round(parseFloat(getComputedStyle(li.querySelector(".outline-link")).paddingLeft)),
  })));

const open = async (page, title, content) => {
  await page.evaluate(async ({ t, c }) => {
    const r = await api("/documents", { method: "POST", body: JSON.stringify({ title: t, content: c }) });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
    return doc.id;
  }, { t: title, c: content });
  await page.waitForTimeout(2200);
  await page.evaluate(() => showDocSidebarSection("outline"));
  await page.waitForTimeout(600);
};

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  await open(page, "Short outline", SHORT);
  let filter = await page.evaluate(() => {
    const el = document.getElementById("doc-outline-filter");
    return { hidden: el.classList.contains("hidden"), h: Math.round(el.getBoundingClientRect().height) };
  });
  ok("a two-heading outline has no filter box", filter.hidden, JSON.stringify(filter));

  await open(page, "Long outline", LONG);
  filter = await page.evaluate(() => {
    const el = document.getElementById("doc-outline-filter");
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      hidden: el.classList.contains("hidden"),
      w: Math.round(r.width),
      h: Math.round(r.height),
      box: cs.boxSizing,
      controlH: getComputedStyle(document.documentElement).getPropertyValue("--control-h").trim(),
    };
  });
  ok("a nineteen-heading outline has one", !filter.hidden && filter.h >= 28, JSON.stringify(filter));

  let rows = await rowState(page);
  ok("every heading has a row", rows.length === 19, `${rows.length} rows`);
  ok("nothing is hidden to start with", rows.every((r) => !r.hidden));
  const widths = [...new Set(rows.map((r) => r.twistW))];
  ok("the fold gutter is one width on every row", widths.length === 1, JSON.stringify(widths));
  ok("only the headings with children carry a button",
    rows.filter((r) => r.twist === "BUTTON").length === 7,
    `${rows.filter((r) => r.twist === "BUTTON").length} buttons of ${rows.length}`);
  const pads = [...new Set(rows.filter((r) => /^Part/.test(r.text)).map((r) => r.padLeft))];
  const topPads = [...new Set(rows.filter((r) => /^Section/.test(r.text)).map((r) => r.padLeft))];
  ok("depth still decides the indent, and only depth",
    pads.length === 1 && topPads.length === 1 && pads[0] > topPads[0],
    `h3 ${JSON.stringify(pads)} vs h2 ${JSON.stringify(topPads)}`);

  // Fold "Section 1": its two Part rows go, nothing else does.
  await page.evaluate(() => {
    const li = [...document.querySelectorAll("#doc-outline > li")]
      .find((el) => el.textContent.trim().startsWith("Section 1"));
    li.querySelector("button.outline-twist").click();
  });
  await page.waitForTimeout(500);
  rows = await rowState(page);
  const hidden = rows.filter((r) => r.hidden).map((r) => r.text);
  ok("folding a section hides its own parts and nothing else",
    hidden.join("|") === "Part 1.1|Part 1.2", JSON.stringify(hidden));
  const state = await page.evaluate(() => {
    const li = [...document.querySelectorAll("#doc-outline > li")]
      .find((el) => el.textContent.trim().startsWith("Section 1"));
    return li.querySelector("button.outline-twist").getAttribute("aria-expanded");
  });
  ok("and the control says so", state === "false", state);

  // Reopen the document: the fold is still there.
  await page.evaluate(async () => {
    const id = currentDoc.id;
    switchTab("library");
    await new Promise((r) => setTimeout(r, 300));
    switchTab("documents");
    await openDocument(id);
  });
  await page.waitForTimeout(2200);
  await page.evaluate(() => showDocSidebarSection("outline"));
  await page.waitForTimeout(600);
  rows = await rowState(page);
  ok("the fold survives reopening the document",
    rows.filter((r) => r.hidden).map((r) => r.text).join("|") === "Part 1.1|Part 1.2",
    JSON.stringify(rows.filter((r) => r.hidden).map((r) => r.text)));

  // Filtering ignores the fold: "Part 1.1" is findable while its section is folded.
  await page.fill("#doc-outline-filter", "part 1.");
  await page.waitForTimeout(400);
  rows = await rowState(page);
  const shown = rows.filter((r) => !r.hidden).map((r) => r.text);
  ok("a filter finds a heading inside a folded section",
    shown.join("|") === "Part 1.1|Part 1.2", JSON.stringify(shown));
  const count = await page.evaluate(() => document.getElementById("doc-outline-count").textContent);
  ok("the count says how much of the outline is showing", count === "2 of 19", count);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  rows = await rowState(page);
  ok("Escape clears the filter and the fold comes back",
    rows.filter((r) => r.hidden).map((r) => r.text).join("|") === "Part 1.1|Part 1.2",
    JSON.stringify(rows.filter((r) => r.hidden).map((r) => r.text)));

  // The spy must not mark a row that is not drawn.
  await page.evaluate(() => {
    const box = docSurface();
    const at = box.text.indexOf("### Part 1.2");
    box.focus();
    box.setSelection(at + 14, at + 14);
  });
  await page.waitForTimeout(600);
  const marked = await page.evaluate(() => {
    const el = document.querySelector("#doc-outline .outline-link[aria-current]");
    if (!el) return null;
    const li = el.closest("li");
    return { text: el.firstChild.textContent.trim(), hidden: li.classList.contains("hidden") };
  });
  ok("the caret inside a folded section marks the fold, not a hidden row",
    marked && !marked.hidden && marked.text === "Section 1", JSON.stringify(marked));

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
