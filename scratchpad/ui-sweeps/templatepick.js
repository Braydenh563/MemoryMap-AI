// New from a template: choosing is not making (INBOX 410, "I want to be able
// to confirm my template selection, not have it instantly be made when I
// press it"). Opens the dialog, reads which row is chosen on open, clicks a
// row and counts the documents (none made), walks the rows with the arrows,
// makes one with Enter, another with Use this template, another with a
// double click, and checks the chosen row is told apart from the others by
// more than its colour. Then at 390, where the preview is left out and the
// Use button must still be in the dialog.
//
//   BASE=http://127.0.0.1:8786 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node templatepick.js
// THEME=dark for dark; SHOTS=1 writes the dialog to $SCRATCH/shots.
const { boot } = require("./lib.js");

const OUT = (process.env.SCRATCH || ".") + "/shots";

async function state(page) {
  return page.evaluate(async () => {
    const dialog = document.getElementById("doc-template-dialog");
    const rows = [...document.querySelectorAll("#doc-template-list .doc-template-choice")];
    const chosen = rows.find((r) => r.getAttribute("aria-checked") === "true");
    const others = rows.filter((r) => r !== chosen);
    const cs = (el) => getComputedStyle(el);
    const docs = (await apiJson("/documents")).length;
    return {
      open: dialog.open,
      roles: [...new Set(rows.map((r) => r.getAttribute("role")))],
      group: document.getElementById("doc-template-list").getAttribute("role"),
      chosen: chosen?.dataset.template || null,
      chosenTab: chosen?.tabIndex,
      otherTabs: [...new Set(others.map((r) => r.tabIndex))],
      focused: document.activeElement?.dataset?.template || document.activeElement?.id || null,
      preview: document.getElementById("doc-template-preview").dataset.template,
      chosenBg: chosen && cs(chosen).backgroundColor,
      otherBg: others[0] && cs(others[0]).backgroundColor,
      chosenNameColor: chosen && cs(chosen.querySelector("strong")).color,
      otherNameColor: others[0] && cs(others[0].querySelector("strong")).color,
      check: chosen && cs(chosen.querySelector(".doc-template-check")).display,
      otherCheck: others[0] && cs(others[0].querySelector(".doc-template-check")).display,
      use: (() => {
        const b = document.getElementById("doc-template-use");
        const r = b.getBoundingClientRect();
        const d = dialog.getBoundingClientRect();
        return { text: b.textContent.trim(), cls: b.className, inDialog: r.right <= d.right + 1 && r.bottom <= d.bottom + 1, w: Math.round(r.width) };
      })(),
      cancelFirst: dialog.querySelector(".space-dialog-actions button").textContent.trim() === "Cancel",
      docs,
      title: document.getElementById("doc-title").value,
    };
  });
}

//: The real button where it shows; a phone width keeps the document list
//: (where the button lives) in a drawer, so there the dialog opens through
//: the same handler the button calls.
async function reopen(page) {
  if (await page.isVisible("#doc-new-template")) await page.click("#doc-new-template");
  else await page.evaluate(() => openDocTemplateDialog());
}

async function run(width) {
  const findings = [];
  const { page, browser } = await boot({ viewport: { width, height: 900 } });
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2500);
  await reopen(page);
  await page.waitForTimeout(600);
  const opened = await state(page);
  console.log(`${width} open: ${JSON.stringify({ chosen: opened.chosen, focused: opened.focused, preview: opened.preview, roles: opened.roles, group: opened.group, use: opened.use, docs: opened.docs })}`);
  if (!opened.open) findings.push(`${width}: the dialog did not open`);
  if (opened.chosen !== "blank") findings.push(`${width}: the first row is not chosen on open (${opened.chosen})`);
  if (opened.focused !== "blank") findings.push(`${width}: the chosen row is not focused on open (${opened.focused})`);
  if (opened.group !== "radiogroup" || String(opened.roles) !== "radio") findings.push(`${width}: rows are ${opened.roles} in a ${opened.group}`);
  if (opened.use.text !== "Use this template" || !/accent/.test(opened.use.cls)) findings.push(`${width}: the Use button is "${opened.use.text}" (${opened.use.cls})`);
  if (!opened.use.inDialog) findings.push(`${width}: the Use button sits outside the dialog`);
  if (!opened.cancelFirst) findings.push(`${width}: Cancel is not before Use`);

  // A click chooses and makes nothing.
  await page.click('#doc-template-list [data-template="meeting"]');
  await page.waitForTimeout(700);
  const chosen = await state(page);
  console.log(`${width} click meeting: ${JSON.stringify({ open: chosen.open, chosen: chosen.chosen, preview: chosen.preview, docs: chosen.docs, tabs: [chosen.chosenTab, chosen.otherTabs], bg: [chosen.chosenBg, chosen.otherBg], name: [chosen.chosenNameColor, chosen.otherNameColor], check: [chosen.check, chosen.otherCheck] })}`);
  if (!chosen.open) findings.push(`${width}: a click closed the dialog`);
  if (chosen.docs !== opened.docs) findings.push(`${width}: a click made a document`);
  if (chosen.chosen !== "meeting" || chosen.preview !== "meeting") findings.push(`${width}: the click did not choose meeting (chosen ${chosen.chosen}, preview ${chosen.preview})`);
  if (chosen.chosenTab !== 0 || String(chosen.otherTabs) !== "-1") findings.push(`${width}: the tab stop does not rove (${chosen.chosenTab}, ${chosen.otherTabs})`);
  if (chosen.chosenBg === chosen.otherBg) findings.push(`${width}: the chosen row has the same ground as the others`);
  if (chosen.chosenNameColor === chosen.otherNameColor) findings.push(`${width}: the chosen row's name is in the same ink as the others`);
  if (chosen.check === "none" || chosen.otherCheck !== "none") findings.push(`${width}: the check is ${chosen.check} on the chosen row and ${chosen.otherCheck} on the others`);
  if (process.env.SHOTS) {
    await page.locator("#doc-template-dialog").screenshot({ path: `${OUT}/templatepick-${width}-${process.env.THEME || "light"}.png` });
  }

  // The arrows walk the rows; Enter makes the chosen one.
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(150);
  const walked = await state(page);
  console.log(`${width} arrow down: chosen ${walked.chosen}, focused ${walked.focused}, preview ${walked.preview}`);
  if (walked.chosen !== "decision" || walked.focused !== "decision" || walked.preview !== "decision") findings.push(`${width}: ArrowDown did not move the choice to decision`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  const entered = await state(page);
  console.log(`${width} enter: open ${entered.open}, docs ${entered.docs}, title "${entered.title}"`);
  if (entered.open) findings.push(`${width}: Enter did not close the dialog`);
  if (entered.docs !== opened.docs + 1) findings.push(`${width}: Enter made ${entered.docs - opened.docs} documents`);
  if (entered.title !== "Decision record") findings.push(`${width}: Enter made "${entered.title}", not a decision record`);

  // Use this template makes the chosen one.
  await reopen(page);
  await page.waitForTimeout(600);
  await page.click('#doc-template-list [data-template="weekly"]');
  await page.waitForTimeout(150);
  await page.click("#doc-template-use");
  await page.waitForTimeout(2500);
  const used = await state(page);
  console.log(`${width} use: open ${used.open}, docs ${used.docs}, title "${used.title}"`);
  if (used.open) findings.push(`${width}: Use this template did not close the dialog`);
  if (used.docs !== opened.docs + 2) findings.push(`${width}: Use made ${used.docs - opened.docs - 1} documents`);
  if (used.title !== "Weekly review") findings.push(`${width}: Use made "${used.title}", not a weekly review`);

  // A double click makes the row, once.
  await reopen(page);
  await page.waitForTimeout(600);
  await page.dblclick('#doc-template-list [data-template="lecture"]');
  await page.waitForTimeout(2500);
  const doubled = await state(page);
  console.log(`${width} dblclick: open ${doubled.open}, docs ${doubled.docs}, title "${doubled.title}"`);
  if (doubled.open) findings.push(`${width}: a double click did not close the dialog`);
  if (doubled.docs !== opened.docs + 3) findings.push(`${width}: a double click made ${doubled.docs - opened.docs - 2} documents`);
  if (doubled.title !== "Lecture notes") findings.push(`${width}: the double click made "${doubled.title}"`);

  // Cancel makes nothing.
  await reopen(page);
  await page.waitForTimeout(600);
  await page.click('#doc-template-list [data-template="assignment"]');
  await page.click('#doc-template-dialog [data-close-dialog]');
  await page.waitForTimeout(1200);
  const cancelled = await state(page);
  if (cancelled.open || cancelled.docs !== opened.docs + 3) findings.push(`${width}: Cancel left the dialog open or made a document`);
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflowX) findings.push(`${width}: the page scrolls sideways`);
  await browser.close();
  return findings;
}

(async () => {
  const findings = [...(await run(1440)), ...(await run(390))];
  for (const f of findings) console.log("    " + f);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : "PASS: 0 findings");
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log("ERR " + e.message); process.exit(1); });
