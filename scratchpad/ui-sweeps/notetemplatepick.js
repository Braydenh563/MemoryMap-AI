// The Capture box's template picker confirms before it fills (INBOX 410; the
// owner decided it 2026-09-24): choose, preview, "Use this template", the
// documents' New from a template recipe.
//
// Measures: the opener is a button, not a select; the dialog opens with the
// first row chosen and its text previewed; a click or an arrow key chooses
// and previews without touching the box; Use fills it; Enter on the list and
// a double click fill it too; Cancel leaves it; typed text is asked about.
//
// Usage: BASE=http://127.0.0.1:8792 [THEME=dark] node notetemplatepick.js
const { boot } = require("./lib.js");

let bad = 0;
let good = 0;
const ok = (n, c, d) => {
  if (c) good += 1;
  else bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};
const J = JSON.stringify;

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector('[data-section="capture"]')?.click());
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.getElementById("entry-content").value = ""; });

  const state = () =>
    page.evaluate(() => {
      const d = document.getElementById("note-template-dialog");
      const chosen = d.querySelector('.doc-template-choice[aria-checked="true"]');
      const preview = document.getElementById("note-template-preview");
      const box = d.getBoundingClientRect();
      return {
        open: d.open,
        chosen: chosen?.dataset.template || null,
        focused: document.activeElement?.dataset?.template || document.activeElement?.id || null,
        preview: preview.textContent,
        rows: d.querySelectorAll(".doc-template-choice").length,
        box: document.getElementById("entry-content").value,
        centred: Math.abs(box.left + box.width / 2 - innerWidth / 2) <= 2,
        w: Math.round(box.width),
      };
    });

  const tag = await page.evaluate(() => document.getElementById("entry-template")?.tagName);
  ok("the opener is a button", tag === "BUTTON", tag);
  await page.click("#entry-template");
  await page.waitForTimeout(300);
  let s = await state();
  ok("the dialog opens with the first row chosen and focused", s.open && s.chosen && s.focused === s.chosen, J(s));
  ok("its text is previewed", s.preview.length > 0, J(s.preview.slice(0, 40)));
  ok("the dialog is centred", s.centred, J(s.w));
  const first = s.chosen;
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(100);
  s = await state();
  ok("an arrow key chooses the next row and previews it, and fills nothing", s.chosen !== first && s.box === "", J({ chosen: s.chosen, box: s.box }));
  await page.click('#note-template-list .doc-template-choice[data-template="Recipe"]');
  await page.waitForTimeout(100);
  s = await state();
  ok("a click chooses and previews, and fills nothing", s.chosen === "Recipe" && s.preview.startsWith("Recipe:") && s.box === "" && s.open, J(s));
  await page.click("#note-template-use");
  await page.waitForTimeout(300);
  s = await state();
  ok("Use this template fills the box and closes", !s.open && s.box.startsWith("Recipe:"), J(s.box.slice(0, 30)));

  // Cancel leaves the box alone.
  await page.evaluate(() => { document.getElementById("entry-content").value = ""; });
  await page.click("#entry-template");
  await page.waitForTimeout(200);
  await page.click('#note-template-dialog [data-close-dialog="note-template-dialog"]');
  await page.waitForTimeout(200);
  s = await state();
  ok("Cancel closes and fills nothing", !s.open && s.box === "", J(s));

  // Enter on the list is the confirmation.
  await page.click("#entry-template");
  await page.waitForTimeout(200);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  s = await state();
  ok("Enter fills the chosen template", !s.open && s.box.length > 0, J(s.box.slice(0, 30)));
  const date = await page.evaluate(() => new Date().toLocaleDateString());
  ok("with today's date in it where the template asks", !s.box.includes("{date}"), J(s.box.slice(0, 40)));

  // Typed text is asked about, after the choice is confirmed.
  await page.evaluate(() => { document.getElementById("entry-content").value = "My own words"; });
  await page.click("#entry-template");
  await page.waitForTimeout(200);
  await page.dblclick('#note-template-list .doc-template-choice[data-template="Contact"]');
  await page.waitForTimeout(400);
  const ask = await page.evaluate(() => {
    const d = [...document.querySelectorAll("dialog[open], .modal-overlay:not(.hidden)")].map((x) => x.textContent).join(" ");
    return /Replace what you've already written/.test(d);
  });
  ok("a double click confirms, and typed words are asked about first", ask);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  s = await state();
  ok("keeping them keeps them", s.box === "My own words", J(s.box));
  console.log("measure:", J({ date, w: s.w }));
  const shotDir = (process.env.SCRATCH || ".") + "/shots";
  await page.click("#entry-template");
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shotDir}/notetemplatepick-${process.env.THEME || "light"}.png` });

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
