// The writing panel is as tall as what is in it (INBOX 157, "can this popup be
// displayed better??": the owner's screenshot is one finding in a panel with the
// rest of it empty). Measured at both ends, because the floor that made the
// short case wasteful is the floor that stopped the long case being squeezed to
// nothing: one finding, one finding with its answers open, and twenty.
const { boot } = require("./lib.js");

const FILL = "The quick brown fox jumped over the lazy dog and then went home again. ";
const ONE = ["Short probe", "", "A line with teh only typo in it.", "", ...Array.from({ length: 20 }, (_, i) => `Filler ${i + 1}. ${FILL}`)].join("\n");
const MANY = ["Long probe", "", ...Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1} has teh and recieve and definately in it. ${FILL}`)].join("\n");

const measure = () => {
  const panel = document.getElementById("doc-prose-panel");
  const editor = document.querySelector(".cm-editor");
  const pr = panel.getBoundingClientRect();
  const er = editor.getBoundingClientRect();
  //: What the panel's content actually wants, which is **not** `scrollHeight`:
  //: the list is a flex child that grows, so it stretches to whatever the panel
  //: is and `scrollHeight` comes back equal to `clientHeight` however empty the
  //: box looks. The sum of the children's own boxes is the number the report is
  //: about. `.doc-prose-head` and the list are the two children, and the list is
  //: `.doc-prose-list` with no id (a sum that asked for `#doc-prose-list` got
  //: 51px for sixty rows).
  const cs = getComputedStyle(panel);
  const kids = [...panel.children].reduce((total, el) => {
    const r = el.getBoundingClientRect();
    //: The list's own height is whatever it was stretched to, so its rows are
    //: what count.
    if (el.classList.contains("doc-prose-list")) {
      const rows = [...el.children].reduce((h, row) => h + row.getBoundingClientRect().height, 0);
      const gap = parseFloat(getComputedStyle(el).rowGap) || 0;
      return total + rows + gap * Math.max(0, el.children.length - 1);
    }
    return total + r.height;
  }, 0);
  const content = Math.round(kids + parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom));
  return {
    panelH: Math.round(pr.height),
    panelPct: Math.round((pr.height / innerHeight) * 100),
    editorH: Math.round(er.height),
    editorPct: Math.round((er.height / innerHeight) * 100),
    content,
    // Empty room inside the panel: what the report is about.
    slack: Math.round(panel.clientHeight - content),
    scrolls: panel.scrollHeight > panel.clientHeight + 1,
    rows: document.querySelectorAll("#doc-prose-panel .doc-prose-row").length,
    // Nothing below the panel may be pushed off the card.
    panelInsideCard: (() => {
      const card = document.querySelector(".doc-main").getBoundingClientRect();
      return pr.bottom <= card.bottom + 1;
    })(),
  };
};

(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => errs.push("PAGEERROR " + e.message.slice(0, 160)));
  const fails = [];

  const open = async (content) => page.evaluate(async (text) => {
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Fit probe", content: text }),
    });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 2600));
    const chip = document.querySelector("[aria-controls='doc-prose-panel']");
    if (chip && document.getElementById("doc-prose-panel").classList.contains("hidden")) chip.click();
    await new Promise((res) => setTimeout(res, 700));
    return docProseFound.length;
  }, content);

  console.log("one finding: " + await open(ONE));
  const one = await page.evaluate(measure);
  console.log("one -> " + JSON.stringify(one));
  if (one.slack > 24) fails.push(`${one.slack}px of empty panel around one finding`);
  if (!one.panelInsideCard) fails.push("the panel hangs past the card");

  // Two passes rather than one: the page's own CSP forbids `unsafe-eval`, so a
  // function cannot be shipped in as a string and called there.
  await page.evaluate(async () => {
    document.querySelector("#doc-prose-panel .doc-prose-jump").click();
    await new Promise((r) => setTimeout(r, 900));
  });
  const oneOpen = { ...(await page.evaluate(measure)), ...(await page.evaluate(() => {
    const row = document.querySelector(".doc-prose-row[aria-current]");
    const answers = row.querySelector(".doc-prose-answers");
    const items = [...answers.querySelectorAll("button")];
    const tops = new Set(items.map((b) => Math.round(b.getBoundingClientRect().top)));
    return {
      rowH: Math.round(row.getBoundingClientRect().height),
      answersH: Math.round(answers.getBoundingClientRect().height),
      answerCount: items.length,
      answerLines: tops.size,
      rowInsidePanel: (() => {
        const p = document.getElementById("doc-prose-panel").getBoundingClientRect();
        const r = row.getBoundingClientRect();
        return r.top >= p.top - 1 && r.bottom <= p.bottom + 1;
      })(),
    };
  })) };
  console.log("one, open -> " + JSON.stringify(oneOpen));
  if (oneOpen.slack > 24) fails.push(`${oneOpen.slack}px of empty panel around one open finding`);
  if (!oneOpen.rowInsidePanel) fails.push("the open row does not fit inside the panel");
  if (oneOpen.answerLines > 2) fails.push(`the answers run down the panel over ${oneOpen.answerLines} lines`);
  if (oneOpen.answerCount < 5) fails.push("fewer than five candidates offered");

  // The ceiling has to clear one open row, and the row is taller under Large
  // text and Spacious: that is the whole risk of taking the floor off, so it is
  // the case that has to be measured rather than reasoned about.
  await page.evaluate(async () => {
    document.documentElement.setAttribute("data-fontsize", "large");
    document.documentElement.setAttribute("data-density", "spacious");
    await new Promise((r) => setTimeout(r, 600));
  });
  const big = { ...(await page.evaluate(measure)), ...(await page.evaluate(() => {
    const row = document.querySelector(".doc-prose-row[aria-current]");
    const p = document.getElementById("doc-prose-panel").getBoundingClientRect();
    const r = row.getBoundingClientRect();
    return {
      rowH: Math.round(r.height),
      rowInsidePanel: r.top >= p.top - 1 && r.bottom <= p.bottom + 1,
    };
  })) };
  console.log("one, open, large + spacious -> " + JSON.stringify(big));
  if (!big.rowInsidePanel) fails.push(`the open row does not fit the panel under large text (${big.rowH}px in ${big.panelH}px)`);
  await page.evaluate(async () => {
    document.documentElement.removeAttribute("data-fontsize");
    document.documentElement.removeAttribute("data-density");
    await new Promise((r) => setTimeout(r, 400));
  });

  console.log("many findings: " + await open(MANY));
  const many = await page.evaluate(measure);
  console.log("many -> " + JSON.stringify(many));
  if (many.panelPct > 34) fails.push(`the panel takes ${many.panelPct}% of the window`);
  if (many.editorPct < 42) fails.push(`the editor is down to ${many.editorPct}% of the window`);
  if (many.slack > 8) fails.push(`${many.slack}px of empty panel with twenty findings`);
  if (!many.scrolls) fails.push("twenty findings do not scroll inside the panel");
  if (!many.panelInsideCard) fails.push("the panel hangs past the card");

  console.log("console errors: " + errs.length + (errs.length ? " " + JSON.stringify(errs.slice(0, 3)) : ""));
  if (errs.length) fails.push(`${errs.length} console errors`);
  await browser.close();
  if (fails.length) { console.log("FAIL\n- " + fails.join("\n- ")); process.exit(1); }
  console.log("PASS");
})();
