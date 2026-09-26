// Every block the "/" menu writes renders as a block, in every view
// (INBOX 421 b: "the icons dont render in the live view in the documents
// editor and probably not in other places as well").
//
// One text holding every block, written into a document (Read and Live
// views) and a note (the note card and the note reader), and each view
// measured: callouts with an icon element (never a `ph:` token as text),
// columns side by side (stacked below 600, 09-editor.css), a contents list with entries, the three rules, the
// quote's attribution and display maths. Also counts any text node anywhere
// on the page that still reads like `ph:name`, which is how an icon written
// as text shows itself.
//
//   BASE=http://127.0.0.1:8794 node scratchpad/ui-sweeps/blocksrender.js
//   VIEW=390 THEME=dark ... for the phone width and dark.
const { boot } = require("./lib.js");

const WIDTH = Number(process.env.VIEW || 1440);
const KINDS = ["note", "abstract", "info", "todo", "tip", "success", "question",
  "warning", "failure", "danger", "bug", "example", "quote", "toggle"];

const TEXT = [
  "# Blocks probe",
  "",
  "[TOC]",
  "",
  "## First section",
  "",
  ...KINDS.flatMap((k) => [`> [!${k}] A ${k} callout`, "> Body of it.", ""]),
  "> [!caution]- An alias, folded",
  "> Hidden body.",
  "",
  "## Layout",
  "",
  ":::columns",
  "Left column text.",
  ":::column",
  "Right column text.",
  ":::",
  "",
  ":::columns",
  "One",
  ":::column",
  "Two",
  ":::column",
  "Three",
  ":::",
  "",
  "---",
  "",
  "***",
  "",
  "___",
  "",
  "> Stay hungry, stay foolish.",
  "> -- Stewart Brand",
  "",
  "### Maths",
  "",
  "$$ \\frac{a}{b} + x^2 $$",
  "",
  "Last line.",
].join("\n");

async function measure(page, root) {
  return page.evaluate((sel) => {
    const host = document.querySelector(sel);
    if (!host) return { missing: sel };
    const r = (el) => el.getBoundingClientRect();
    const callouts = [...host.querySelectorAll(".callout")];
    const withIcon = callouts.filter((c) => c.querySelector(".callout-head i.ph")).length;
    const cols = [...host.querySelectorAll(".doc-cols")].map((box) => {
      const kids = [...box.children].map(r);
      return {
        n: kids.length,
        sideBySide: kids.length > 1 && kids.every((k) => Math.abs(k.top - kids[0].top) < 2) &&
          kids.every((k, i) => i === 0 || k.left > kids[i - 1].left),
      };
    });
    const toc = host.querySelector(".md-toc");
    const rules = [...host.querySelectorAll("hr.md-rule")].map((h) => h.className.replace("md-rule ", ""));
    const cite = host.querySelector(".md-quote-cite")?.textContent || null;
    const math = host.querySelector(".md-math-block math") ? "mathml" : host.querySelector(".md-math-block") ? "source" : null;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
    const phText = [];
    while (walker.nextNode()) {
      if (/\bph:[a-z-]+/.test(walker.currentNode.nodeValue)) phText.push(walker.currentNode.nodeValue.trim().slice(0, 40));
    }
    const kindsSeen = [...new Set(callouts.map((c) => c.dataset.calloutKind))];
    const inks = [...new Set(callouts.map((c) => getComputedStyle(c).borderLeftColor))].length;
    return {
      callouts: callouts.length, withIcon, kindsSeen: kindsSeen.length, inks,
      cols, toc: toc ? toc.querySelectorAll(".md-toc-item").length : null,
      rules, cite, math, phText,
    };
  }, root);
}

(async () => {
  const { page, browser } = await boot({});
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ": " + detail : ""}`);
  };
  try {
    const ids = await page.evaluate(async (text) => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
      const doc = await (await fetch("/documents", { method: "POST", headers, body: JSON.stringify({ title: "Blocks probe", content: text }) })).json();
      const note = await (await fetch("/entries", { method: "POST", headers, body: JSON.stringify({ content: text }) })).json();
      return { doc: doc.id, note: note.id };
    }, TEXT);
    if (WIDTH < 600) await page.setViewportSize({ width: WIDTH, height: 844 });

    // --- the document, Read view ---------------------------------------------
    await page.evaluate(async (id) => {
      switchTab("documents");
      await new Promise((r) => setTimeout(r, 500));
      await openDocument(id);
      await new Promise((r) => setTimeout(r, 2000));
      if (typeof setDocView === "function") setDocView("rendered");
      await new Promise((r) => setTimeout(r, 800));
    }, ids.doc);
    const read = await measure(page, "#doc-preview");
    console.log("read:", JSON.stringify(read));
    check("read callouts", read.callouts === 15 && read.withIcon === 15, `${read.withIcon}/${read.callouts} with an icon`);
    check("read kinds", read.kindsSeen === 14 && read.inks >= 5, `${read.kindsSeen} kinds, ${read.inks} inks`);
    check("read columns", read.cols && read.cols.length === 2 && read.cols.every((c) => c.sideBySide === (WIDTH >= 600)) && read.cols[1].n === 3, JSON.stringify(read.cols));
    check("read contents", read.toc >= 4, `${read.toc} entries`);
    check("read rules", JSON.stringify(read.rules) === JSON.stringify(["md-rule-line", "md-rule-dots", "md-rule-thick"]), JSON.stringify(read.rules));
    check("read attribution", read.cite === "Stewart Brand", read.cite);
    check("read maths", read.math === "mathml", read.math);
    check("read no ph: text", !read.phText.length, read.phText.join(" | "));

    // --- the document, Live view ------------------------------------------------
    const live = await page.evaluate(async () => {
      if (typeof setDocView === "function") setDocView("live");
      await new Promise((r) => setTimeout(r, 900));
      document.querySelector(".cm-content")?.blur();
      const s = document.querySelector(".cm-scroller");
      const out = { labels: 0, iconEls: 0, kinds: new Set(), toc: 0, cols: 0, rules: [], phText: [] };
      for (let y = 0; y < s.scrollHeight; y += Math.max(200, s.clientHeight - 100)) {
        s.scrollTop = y;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        for (const l of document.querySelectorAll(".cm-md-callout-label")) {
          out.kinds.add(l.className);
          if (l.querySelector("i.ph")) out.iconEls += 1;
          out.labels += 1;
        }
        out.toc = Math.max(out.toc, document.querySelectorAll(".cm-md-toc .md-toc-item").length);
        out.cols = Math.max(out.cols, document.querySelectorAll(".cm-editor .doc-cols").length);
        for (const r of document.querySelectorAll(".cm-md-rule")) out.rules.push(r.className.match(/cm-md-rule-(\w+)/)?.[1] || "plain");
        const walker = document.createTreeWalker(document.querySelector(".cm-content"), NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) if (/\bph:[a-z-]+/.test(walker.currentNode.nodeValue)) out.phText.push(walker.currentNode.nodeValue.slice(0, 30));
      }
      return { ...out, kinds: out.kinds.size, rules: [...new Set(out.rules)] };
    });
    console.log("live:", JSON.stringify(live));
    check("live callout icons", live.labels > 0 && live.iconEls === live.labels, `${live.iconEls}/${live.labels}`);
    check("live kinds", live.kinds >= 14, `${live.kinds} kinds`);
    check("live contents", live.toc >= 4, `${live.toc} entries`);
    check("live columns", live.cols >= 1, `${live.cols}`);
    check("live rules", ["line", "dots", "thick"].every((k) => live.rules.includes(k)), JSON.stringify(live.rules));
    check("live no ph: text", !live.phText.length, live.phText.join(" | "));

    // --- the note card ------------------------------------------------------------
    await page.evaluate(async () => {
      switchTab("notes");
      await new Promise((r) => setTimeout(r, 400));
      if (typeof loadEntries === "function") await loadEntries();
      await new Promise((r) => setTimeout(r, 1200));
    });
    const cardSel = await page.evaluate((id) => {
      const card = document.querySelector(`[data-id="${id}"] .entry-content`) ||
        [...document.querySelectorAll(".entry-content")].find((el) => el.textContent.includes("Stewart Brand"));
      if (!card) return null;
      card.id = card.id || "blocks-probe-card";
      card.classList.remove("entry-clamped");
      return `#${card.id}`;
    }, ids.note);
    if (!cardSel) check("note card found", false);
    else {
      const card = await measure(page, cardSel);
      console.log("card:", JSON.stringify(card));
      check("card callouts", card.callouts === 15 && card.withIcon === 15, `${card.withIcon}/${card.callouts}`);
      check("card columns", card.cols && card.cols.length === 2 && card.cols.every((c) => c.sideBySide === (WIDTH >= 600)), JSON.stringify(card.cols));
      check("card contents", card.toc >= 3, `${card.toc}`);
      check("card rules", card.rules.length === 3, JSON.stringify(card.rules));
      check("card no ph: text", !card.phText.length, card.phText.join(" | "));
    }

    // --- the whole page, for any icon still written as text ----------------------
    const pagePh = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const found = [];
      while (walker.nextNode()) {
        const v = walker.currentNode.nodeValue;
        const el = walker.currentNode.parentElement;
        if (/(^|\s)ph:[a-z-]+/.test(v) && el && !el.closest("textarea, script, style, .cm-content, code, pre")) found.push(v.trim().slice(0, 40));
      }
      return found;
    });
    check("page no ph: text", !pagePh.length, pagePh.slice(0, 5).join(" | "));

    await page.evaluate(async (ids) => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "" };
      await fetch(`/documents/${ids.doc}`, { method: "DELETE", headers });
      await fetch(`/entries/${ids.note}`, { method: "DELETE", headers });
    }, ids);
    console.log(fails ? `FAIL: ${fails} check(s)` : "all blocks render");
  } finally {
    await browser.close();
  }
  process.exit(fails ? 1 : 0);
})();
