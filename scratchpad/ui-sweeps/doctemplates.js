// Verification, not new work: DOCUMENTS_PLAN Phase 4 item 5's templates
// gallery ("New ▾ → Meeting / Spec / Decision / Weekly review", stored as
// documents tagged `template`, "offered with a preview"). The dialog exists
// on this branch; this measures it against that line so "already exists" is
// triaged rather than assumed.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2200);

  const opened = await page.evaluate(() => {
    const button = document.getElementById("doc-new-template");
    if (!button) return "no button";
    button.click();
    return "clicked";
  });
  await page.waitForTimeout(900);
  ok("there is a way in from the editor", opened === "clicked", opened);

  const dialog = await page.evaluate(() => {
    const el = document.getElementById("doc-template-dialog");
    if (!el) return null;
    const box = el.getBoundingClientRect();
    const rows = [...el.querySelectorAll("li, .doc-template-row, button")]
      .filter((r) => r.getBoundingClientRect().height > 8);
    return {
      open: !el.classList.contains("hidden"),
      w: Math.round(box.width),
      h: Math.round(box.height),
      rows: rows.length,
      names: rows.map((r) => r.textContent.trim().replace(/\s+/g, " ").slice(0, 46)).slice(0, 12),
    };
  });
  console.log("      dialog:", JSON.stringify(dialog));
  ok("the gallery opens", dialog && dialog.open, JSON.stringify(dialog));
  ok("and it offers something", dialog && dialog.rows > 0, `${dialog && dialog.rows} rows`);
  //: "offered with a preview": a row that is only a name is a gallery that
  //: makes you create a document to find out what is in it.
  const preview = await page.evaluate(() => {
    const el = document.getElementById("doc-template-dialog");
    //: Not the first row: that is "Blank", whose honest description is three
    //: words. The question is whether a *template* row says what is in it.
    const row = [...el.querySelectorAll("li")]
      .find((li) => !/^Blank/.test(li.textContent.trim()));
    if (!row) return null;
    const small = [...row.querySelectorAll("*")]
      .map((n) => n.textContent.trim())
      .filter((t) => t.length > 24);
    return { text: row.textContent.trim().replace(/\s+/g, " ").slice(0, 90), longParts: small.length };
  });
  console.log("      first row:", JSON.stringify(preview));
  ok("a row says more than its name", preview && preview.longParts > 0, JSON.stringify(preview));

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
