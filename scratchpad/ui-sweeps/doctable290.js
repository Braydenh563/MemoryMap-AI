// INBOX 290, measured before anything is changed. The owner, 2026-09-21:
// "when I click on a header row in a table on the live view in documents
// page, another row appears below it until I click off, and I cant click the
// meatball button on the end of the row".
//
// Two claims, so two measurements: the gap between the header line's bottom
// and the first data line's top (a phantom row is a gap, and a gap is a
// number), and whether a press on the kebab leaves a menu open with the
// widget still mounted. The second half was reported once before and fixed
// with a `mousedown` preventDefault in `docTableMenu`; if it is back, the
// preventDefault is not where the caret moves any more.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => {
  if (!c) bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};

const DOC = [
  "# Example",
  "",
  "Some prose before it.",
  "",
  "| Name | Kind | Note |",
  "| --- | --- | --- |",
  "| One | a | first |",
  "| Two | b | second |",
  "",
  "And prose after it.",
  "",
].join("\n");

(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2200);
  await page.evaluate(async (text) => {
    const d = await apiJson("/documents", {
      method: "POST",
      body: JSON.stringify({ title: "Example", content: text }),
    });
    await loadDocuments(d.id);
  }, DOC);
  await page.waitForTimeout(2000);
  await page.evaluate(() => setDocView("live"));
  await page.waitForTimeout(1600);

  // The geometry reader. Every table line in document order, with its class,
  // its top and bottom, and what it holds.
  const read = () =>
    page.evaluate(() => {
      const lines = [...document.querySelectorAll(".cm-line")];
      const rows = lines
        .map((n, i) => ({ n, i }))
        .filter(
          ({ n }) =>
            n.classList.contains("cm-md-table") || n.classList.contains("cm-md-table-rule")
        )
        .map(({ n, i }) => {
          const r = n.getBoundingClientRect();
          return {
            i,
            cls: [...n.classList].filter((c) => c.startsWith("cm-md-table")).join(" "),
            top: Math.round(r.top * 10) / 10,
            bottom: Math.round(r.bottom * 10) / 10,
            height: Math.round(r.height * 10) / 10,
            cells: n.querySelectorAll(".cm-md-td").length,
            text: n.textContent.replace(/\s+/g, " ").trim().slice(0, 40),
          };
        });
      const menu = document.querySelector(".cm-md-table-menu");
      const mr = menu ? menu.getBoundingClientRect() : null;
      return {
        rows,
        menu: menu
          ? {
              position: getComputedStyle(menu).position,
              display: getComputedStyle(menu).display,
              w: Math.round(mr.width),
              h: Math.round(mr.height),
              top: Math.round(mr.top * 10) / 10,
              left: Math.round(mr.left),
              buttons: menu.querySelectorAll("button").length,
            }
          : null,
        popups: document.querySelectorAll(".action-menu:not(.hidden)").length,
      };
    });

  const before = await read();
  console.log("  caret outside:", JSON.stringify(before, null, 0));

  // Click the header row, on its first cell, the way a person does.
  const head = await page.$(".cm-md-table-head .cm-md-td");
  await head.click();
  await page.waitForTimeout(900);
  const after = await read();
  console.log("  caret in header:", JSON.stringify(after, null, 0));

  const tableRows = after.rows.filter((r) => r.height > 0.5);
  ok(
    "the table draws three rows with the caret in the header",
    tableRows.length === 3,
    `${tableRows.length} rows tall: ${JSON.stringify(after.rows.map((r) => [r.cls, r.height]))}`
  );
  const gaps = [];
  for (let i = 1; i < after.rows.length; i += 1) {
    gaps.push(Math.round((after.rows[i].top - after.rows[i - 1].bottom) * 10) / 10);
  }
  ok("and no blank band between any two of them", gaps.every((g) => g <= 0.6), `gaps ${JSON.stringify(gaps)}`);
  const grew = after.rows.length && before.rows.length
    ? Math.round((after.rows[after.rows.length - 1].bottom - after.rows[0].top) -
        (before.rows[before.rows.length - 1].bottom - before.rows[0].top))
    : null;
  ok("the table is no taller focused than it was unfocused", grew !== null && grew <= 1, `grew ${grew}px`);

  ok("the menu is mounted with the caret in the header", !!after.menu, JSON.stringify(after.menu));
  ok("and is drawn out of the grid's flow", after.menu && after.menu.position === "absolute", after.menu && after.menu.position);
  ok("and is a real, pressable size", after.menu && after.menu.w >= 20 && after.menu.h >= 20, after.menu && `${after.menu.w}x${after.menu.h}`);

  // The press. The claim is that it does nothing, so the measurement is
  // whether a menu is open afterwards and the widget survived.
  const btn = await page.$(".cm-md-table-menu button");
  if (!btn) {
    ok("the kebab has a button to press", false, "none found");
  } else {
    await btn.click();
    await page.waitForTimeout(700);
    const pressed = await read();
    console.log("  after the press:", JSON.stringify(pressed));
    ok("the press leaves the widget mounted", !!pressed.menu, JSON.stringify(pressed.menu));
    ok("and opens a menu", pressed.popups > 0, `${pressed.popups} popups`);
    const items = await page.evaluate(
      () => document.querySelectorAll(".action-menu:not(.hidden) .menu-item").length
    );
    ok("with the table commands in it", items >= 6, `${items} items`);
    //: And the menu must be reachable: a menu whose opener has been unmounted
    //: is a menu nobody can press twice.
    const ran = await page.evaluate(async () => {
      const first = document.querySelector(".action-menu:not(.hidden) .menu-item");
      const before = document.querySelectorAll(".cm-md-table").length;
      if (!first) return { ok: false };
      first.click();
      await new Promise((r) => setTimeout(r, 900));
      return { ok: true, before, after: document.querySelectorAll(".cm-md-table").length };
    });
    ok("and a command pressed in it edits the table", ran.ok && ran.after === ran.before + 1, JSON.stringify(ran));
  }

  console.log(bad ? `FAILURES: ${bad}` : "ALL PASS");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
