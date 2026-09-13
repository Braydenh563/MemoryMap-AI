// The writing-intelligence surfaces: how much of the window the suggestions
// panel takes, and where the word menu opens from each of the two ways in.
//
// Reported: "the suggestions box at the bottom takes up a lot of my screen and
// it makes the text editor really small ... and when I click on the issue from
// the suggestions thing, the box just appears right there in my face."
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot({});
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 120)); });
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('[data-target="library-view-documents"]').catch(() => {});
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const t = [...document.querySelectorAll("#library-view-documents .library-card-title")]
      .find((n) => /Spelling probe/.test(n.textContent));
    (t?.closest(".library-card") || t)?.click();
  });
  await page.waitForTimeout(4000);
  await page.click(".cm-content").catch(() => {});
  await page.waitForTimeout(2500);

  // Open the suggestions panel from the count pill.
  await page.evaluate(() => {
    document.querySelector("[aria-controls='doc-prose-panel']")?.click();
  });
  await page.waitForTimeout(900);
  console.log(await page.evaluate(() => {
    const panel = document.getElementById("doc-prose-panel");
    const editor = document.querySelector(".cm-editor");
    const pr = panel?.getBoundingClientRect(), er = editor?.getBoundingClientRect();
    return JSON.stringify({
      panel: pr ? { h: Math.round(pr.height), pctOfWindow: Math.round((pr.height / window.innerHeight) * 100) } : "closed",
      editor: er ? { h: Math.round(er.height), pctOfWindow: Math.round((er.height / window.innerHeight) * 100) } : null,
    });
  }));

  // Press a row in the panel. Since DOCUMENTS_PLAN 12 D3 the row answers in
  // place, so the thing to measure is that nothing floats over the text and
  // that the answers are inside the panel's own box. prosepanel.js is the full
  // probe for that contract; this one keeps the share-of-the-window numbers.
  const where = await page.evaluate(async () => {
    const row = document.querySelector("#doc-prose-panel .doc-prose-jump");
    if (!row) return "no row";
    row.click();
    await new Promise((r) => setTimeout(r, 800));
    const menu = document.getElementById("doc-suggest-menu");
    const li = row.closest(".doc-prose-row");
    const answers = li.querySelector(".doc-prose-answers");
    const panel = document.getElementById("doc-prose-panel").getBoundingClientRect();
    const a = answers.getBoundingClientRect();
    return JSON.stringify({
      floatingOpen: menu ? !menu.classList.contains("hidden") : false,
      answersOpen: !answers.classList.contains("hidden"),
      answerRows: answers.querySelectorAll("button").length,
      answersInsidePanel: a.top >= panel.top - 1 && a.bottom <= panel.bottom + 1,
      panelPctNow: Math.round((panel.height / window.innerHeight) * 100),
    });
  });
  console.log("row click -> " + where);
  console.log("errors: " + (errs.length ? errs.join(" | ") : "0"));
  await browser.close();
})().catch((e) => { console.log("ERR " + e.message); process.exit(1); });
