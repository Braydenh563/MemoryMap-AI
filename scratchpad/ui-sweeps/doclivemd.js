// INBOX 392: "the live view needs a lot better md rendering". An inventory of
// the constructs common markdown has, each checked against what the live view
// draws with the caret elsewhere: nested list guides, a finished task, a bare
// address, an angle-bracket autolink and a backslash escape. The constructs
// the view already drew (headings, emphasis, code, links, images, tasks,
// quotations, callouts, fences, rules, tables, footnotes, math) are measured
// by cm-live.js and cm-reveal.js; this is what was left.
//
// Usage: BASE=http://127.0.0.1:8793 node doclivemd.js
const { boot } = require("./lib.js");

const DOC = [
  "# Inventory",
  "",
  "- Level one",
  "  - Level two",
  "    - Level three",
  "- Back to one",
  "",
  "- [x] A finished task",
  "- [ ] An open task",
  "",
  "See https://example.com/page for more, or <https://example.org>.",
  "",
  "An escaped \\*star\\* stays a star.",
  "",
  "The end.",
  "",
].join("\n");

let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async (text) => {
    const d = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title: "Inventory", content: text }),
    });
    await loadDocuments(d.id);
  }, DOC);
  await page.waitForTimeout(1800);
  await page.evaluate(() => setDocView("live"));
  await page.waitForTimeout(1000);

  const m = await page.evaluate(() => {
    const lines = [...document.querySelectorAll("#doc-editor .cm-line")];
    const find = (s) => lines.find((l) => l.textContent.includes(s));
    const guides = (s) => {
      const bg = getComputedStyle(find(s)).backgroundImage;
      return bg === "none" ? 0 : (bg.match(/gradient/g) || []).length;
    };
    const struck = (s) => {
      const line = find(s);
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent.includes(s)) {
          const deco = getComputedStyle(node.parentElement).textDecorationLine;
          return deco.includes("line-through");
        }
      }
      return false;
    };
    // Where the first guide falls against the parent's own bullet.
    const parentDot = find("Level one").querySelector(".cm-md-li-bullet").getBoundingClientRect();
    const child = find("Level two");
    const pos = getComputedStyle(child).backgroundPosition.split(",")[0].trim().split(" ")[0];
    const guideX = child.getBoundingClientRect().left + parseFloat(pos);
    const guideOff = Math.abs(guideX - (parentDot.left + parentDot.width / 2));
    const url = document.querySelector('#doc-editor [data-doc-href="https://example.com/page"]');
    const auto = document.querySelector('#doc-editor [data-doc-href="https://example.org"]');
    return {
      guideOff,
      g1: guides("Level one"),
      g2: guides("Level two"),
      g3: guides("Level three"),
      doneStruck: struck("A finished task"),
      openStruck: struck("An open task"),
      url: url ? url.className : null,
      urlLine: find("See ").textContent,
      auto: auto ? auto.className : null,
      escape: find("escaped").textContent,
    };
  });
  console.log(JSON.stringify(m));
  ok("a top-level item draws no guide", m.g1 === 0, m.g1);
  ok("a second-level item draws one guide", m.g2 === 1, m.g2);
  ok("a third-level item draws two", m.g3 === 2, m.g3);
  ok("the guide runs under its parent's bullet", m.guideOff <= 2, `${m.guideOff.toFixed(1)}px off`);
  ok("a finished task is struck through", m.doneStruck);
  ok("an open task is not", !m.openStruck);
  ok("a bare address is a link", /cm-md-link/.test(m.url || ""), m.url);
  ok("an autolink is a link", /cm-md-link/.test(m.auto || ""), m.auto);
  ok("and its angle brackets are hidden", !/[<>]/.test(m.urlLine), JSON.stringify(m.urlLine));
  ok("an escape's backslash is hidden", m.escape === "An escaped *star* stays a star.", JSON.stringify(m.escape));

  // The caret on the escape's line brings the backslashes back.
  const revealed = await page.evaluate(async () => {
    const view = docCmView;
    const line = [...Array(view.state.doc.lines).keys()]
      .map((i) => view.state.doc.line(i + 1))
      .find((l) => l.text.includes("escaped"));
    view.focus();
    view.dispatch({ selection: { anchor: line.from + 3 } });
    await new Promise((r) => setTimeout(r, 250));
    return [...document.querySelectorAll("#doc-editor .cm-line")].find((l) =>
      l.textContent.includes("escaped")
    ).textContent;
  });
  ok("and comes back when the caret is on its line", revealed.includes("\\*star\\*"), JSON.stringify(revealed));

  // The rendered view strikes the same task.
  await page.evaluate(() => setDocView("rendered"));
  await page.waitForTimeout(900);
  const rendered = await page.evaluate(() => {
    const items = [...document.querySelectorAll("#doc-preview li")];
    const done = items.find((li) => li.textContent.includes("A finished task"));
    const open = items.find((li) => li.textContent.includes("An open task"));
    return {
      done: done ? getComputedStyle(done).textDecorationLine : null,
      open: open ? getComputedStyle(open).textDecorationLine : null,
    };
  });
  ok("the rendered view agrees about the finished task", /line-through/.test(rendered.done || "")
    && !/line-through/.test(rendered.open || ""), JSON.stringify(rendered));

  console.log(`\n${bad ? bad + " FAIL" : "all pass"}`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
