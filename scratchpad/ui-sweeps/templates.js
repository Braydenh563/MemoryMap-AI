// Settings, Templates: every template is editable, the built-ins included
// (INBOX 409, "templates cant be edited"). Opens the pane, edits the built-in
// Journal through the same form "Add your own" uses, reads the row's word
// ("Edited"), checks the Capture dropdown offers the edited text under the
// shipped name, presses Reset and reads "Built-in" again. Then the same at
// 390, where the row must not push the pane sideways.
//
//   BASE=http://127.0.0.1:8786 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node templates.js
// THEME=dark for dark; SHOTS=1 writes the pane to $SCRATCH/shots.
const { boot } = require("./lib.js");

const OUT = (process.env.SCRATCH || ".") + "/shots";
const EDITED = "Journal: {date}\n\nToday I noticed ";

async function pane(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll("#template-list li")].map((li) => ({
      name: li.querySelector(".item-title")?.textContent.trim(),
      word: li.querySelector(".item-label")?.textContent.trim() || "",
      buttons: [...li.querySelectorAll("button")].map((b) => b.textContent.trim()),
      wide: li.scrollWidth > li.clientWidth + 1,
    }));
    const option = [...document.querySelectorAll("#entry-template option")].find(
      (o) => o.value === "Journal"
    );
    return {
      rows,
      journalGroup: option?.parentElement.label,
      journalContent: option?.dataset.content,
      nameReadOnly: document.getElementById("template-name").readOnly,
      status: document.getElementById("template-status").textContent,
      overflowX: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function run(width) {
  const findings = [];
  const { page, browser } = await boot({ viewport: { width, height: 900 } });
  // A clean slate: an earlier run's edit must not read as this run's.
  await page.evaluate(async () => {
    await apiJson("/preferences", { method: "PUT", body: JSON.stringify({ custom_templates: [] }) });
    openSettingsModal("templates");
  });
  await page.waitForTimeout(900);
  const before = await pane(page);
  console.log(`${width} before: ${JSON.stringify(before.rows)}`);
  const journal = before.rows.find((r) => r.name === "Journal");
  if (!journal) findings.push(`${width}: no Journal row`);
  else {
    if (journal.word !== "Built-in") findings.push(`${width}: Journal says "${journal.word}", not Built-in`);
    if (!journal.buttons.includes("Edit")) findings.push(`${width}: the built-in has no Edit`);
    if (journal.buttons.includes("Reset")) findings.push(`${width}: an unedited built-in offers Reset`);
  }
  if (before.rows.some((r) => r.wide)) findings.push(`${width}: a row scrolls sideways`);

  // Edit it the way a person does: the row's Edit, the form, Save changes.
  await page.evaluate(() => {
    const li = [...document.querySelectorAll("#template-list li")].find(
      (li) => li.querySelector(".item-title")?.textContent.trim() === "Journal"
    );
    [...li.querySelectorAll("button")].find((b) => b.textContent.trim() === "Edit").click();
  });
  await page.waitForTimeout(200);
  const editing = await pane(page);
  const nameValue = await page.$eval("#template-name", (el) => el.value);
  const bodyValue = await page.$eval("#template-body", (el) => el.value);
  console.log(`${width} editing: name "${nameValue}" readOnly=${editing.nameReadOnly} body ${JSON.stringify(bodyValue.slice(0, 20))} status "${editing.status}"`);
  if (nameValue !== "Journal") findings.push(`${width}: the form was not prefilled with the name`);
  if (!editing.nameReadOnly) findings.push(`${width}: a built-in's name can be retyped`);
  if (!bodyValue.startsWith("Journal:")) findings.push(`${width}: the form was not prefilled with the body`);
  await page.fill("#template-body", EDITED);
  await page.click("#template-add");
  await page.waitForTimeout(900);
  const after = await pane(page);
  console.log(`${width} after: ${JSON.stringify(after.rows.find((r) => r.name === "Journal"))} group=${after.journalGroup} content=${JSON.stringify(after.journalContent)} status "${after.status}"`);
  const edited = after.rows.find((r) => r.name === "Journal");
  if (!edited || edited.word !== "Edited") findings.push(`${width}: the edited built-in does not say Edited`);
  if (!edited || !edited.buttons.includes("Reset")) findings.push(`${width}: the edited built-in has no Reset`);
  if (edited && edited.buttons.includes("Delete")) findings.push(`${width}: a built-in offers Delete`);
  if (after.rows.filter((r) => r.name === "Journal").length !== 1) findings.push(`${width}: Journal is listed twice`);
  if (after.journalGroup !== "Built-in") findings.push(`${width}: the edited Journal moved to the "${after.journalGroup}" group`);
  // The form trims the body on save (`addTemplate`), so the dropdown carries
  // the trimmed text.
  if (after.journalContent !== EDITED.trim()) findings.push(`${width}: the dropdown does not carry the edit`);
  if (after.nameReadOnly) findings.push(`${width}: the name field stayed read-only after saving`);
  if (process.env.SHOTS) {
    await page.locator("#settings-templates").screenshot({ path: `${OUT}/templates-${width}-${process.env.THEME || "light"}.png` });
  }

  await page.evaluate(() => {
    const li = [...document.querySelectorAll("#template-list li")].find(
      (li) => li.querySelector(".item-title")?.textContent.trim() === "Journal"
    );
    [...li.querySelectorAll("button")].find((b) => b.textContent.trim() === "Reset").click();
  });
  await page.waitForTimeout(900);
  const reset = await pane(page);
  console.log(`${width} reset: ${JSON.stringify(reset.rows.find((r) => r.name === "Journal"))} content=${JSON.stringify(reset.journalContent)}`);
  const restored = reset.rows.find((r) => r.name === "Journal");
  if (!restored || restored.word !== "Built-in") findings.push(`${width}: Reset did not bring Built-in back`);
  if (reset.journalContent !== "Journal: {date}\n\nToday I ") findings.push(`${width}: Reset did not restore the original text`);
  if (reset.overflowX) findings.push(`${width}: the page scrolls sideways`);
  await browser.close();
  return findings;
}

(async () => {
  const findings = [...(await run(1440)), ...(await run(390))];
  for (const f of findings) console.log("    " + f);
  console.log(findings.length ? `FAIL: ${findings.length} findings` : "PASS: 0 findings");
  process.exit(findings.length ? 1 : 0);
})().catch((e) => { console.log("ERR " + e.message); process.exit(1); });
