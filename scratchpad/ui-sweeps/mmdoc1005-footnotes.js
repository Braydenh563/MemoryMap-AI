// Audit FEAT-03: footnotes render in Read, in the print render (comments as
// footnotes) and in the HTML export's cleaned clone, with no `[^` left.
//
//   BASE=http://127.0.0.1:8844 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmdoc1005-footnotes.js   (VIEWPORT=390x844, THEME=dark)
const { boot } = require("./lib.js");

const VIEWPORT = (() => {
  const [w, h] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
  return { width: w, height: h };
})();

const CONTENT = [
  "Footnote probe",
  "",
  "A claim[^1] and this ==phrase== %%check the source%% here, cited twice[^1].",
  "",
  "Inline code keeps `[^1]` as typed, and a [^missing] one too.",
  "",
  "[^1]: The footnote text, with **bold**.",
].join("\n");

(async () => {
  const { page, browser } = await boot({ viewport: VIEWPORT });
  const errs = [];
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 160)));
  const fails = [];
  await page.evaluate(async (content) => {
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Footnote probe", content }),
    });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 2000));
  }, CONTENT);
  const measure = () => page.evaluate(() => {
    const pane = document.getElementById("doc-preview");
    const text = pane.textContent;
    const refs = [...pane.querySelectorAll("sup.md-fn-ref a")];
    const items = [...pane.querySelectorAll(".md-footnotes li")];
    const code = pane.querySelector("code")?.textContent || "";
    const first = refs[0]?.getBoundingClientRect();
    const section = pane.querySelector(".md-footnotes");
    return {
      refs: refs.map((a) => a.textContent),
      items: items.map((li) => li.textContent.trim()),
      bold: Boolean(items[0]?.querySelector("strong, b")),
      rawLeft: (text.replace(code, "").match(/\[\^(?!missing)/g) || []).length,
      codeKept: code.includes("[^1]"),
      missingKept: text.includes("[^missing]"),
      refHref: refs[0]?.getAttribute("href"),
      targetExists: Boolean(refs[0] && pane.querySelector(refs[0].getAttribute("href"))),
      refTop: first ? Math.round(first.top) : null,
      sectionColor: section ? getComputedStyle(section).color : null,
      overflowX: pane.scrollWidth > pane.clientWidth + 1,
    };
  });
  await page.evaluate(() => { setDocView("rendered"); renderDocPreview(); });
  await page.waitForTimeout(400);
  const read = await measure();
  console.log("read  ", JSON.stringify(read));
  if (read.refs.join() !== "1,1") fails.push("read: refs " + read.refs);
  if (read.items.length !== 1) fails.push("read: items " + read.items.length);
  if (read.rawLeft) fails.push("read: raw [^ left");
  if (!read.codeKept) fails.push("read: code lost its [^1]");
  if (!read.missingKept) fails.push("read: undefined ref changed");
  if (!read.targetExists) fails.push("read: ref target missing");
  if (!read.bold) fails.push("read: note inline markdown not rendered");
  if (read.overflowX) fails.push("read: horizontal overflow");

  // The print render: comments travel as footnotes.
  const print = await page.evaluate(() => {
    docPrintComments = true;
    renderDocPreview();
    const pane = document.getElementById("doc-preview");
    const items = [...pane.querySelectorAll(".md-footnotes li")].map((li) => li.textContent.trim());
    const code = pane.querySelector("code")?.textContent || "";
    const raw = (pane.textContent.replace(code, "").match(/\[\^(?!missing)/g) || []).length;
    // The HTML export's own path: a clone, cleaned.
    const clone = pane.cloneNode(true);
    docExportClean(clone);
    const exported = {
      items: clone.querySelectorAll(".md-footnotes li").length,
      raw: (clone.textContent.replace(code, "").match(/\[\^(?!missing)/g) || []).length,
      hrefs: [...clone.querySelectorAll("a[href^='#fn']")].length,
    };
    docPrintComments = false;
    renderDocPreview();
    return { items, raw, exported };
  });
  console.log("print ", JSON.stringify(print));
  if (print.items.length !== 2) fails.push("print: expected the footnote and the comment, got " + print.items.length);
  if (print.raw) fails.push("print: raw [^ left");
  if (print.exported.items !== 2 || print.exported.raw) fails.push("export: " + JSON.stringify(print.exported));

  // A press on a reference lands on its note without changing the address.
  const before = await page.evaluate(() => location.hash);
  await page.click("#doc-preview sup.md-fn-ref a");
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => location.hash);
  if (before !== after) fails.push("click changed location.hash");
  await page.screenshot({ path: `${process.env.SCRATCH || "/tmp"}/mmdoc1005-footnotes-${VIEWPORT.width}-${process.env.THEME || "light"}.png` });

  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(fails.length ? "FAIL " + fails.join("; ") : "PASS");
  await browser.close();
})();
