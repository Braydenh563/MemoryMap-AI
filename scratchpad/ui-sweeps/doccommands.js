// Probe: the editor's command table, its two doors (DOCUMENTS_PLAN Phase 4
// item 4). The palette carries the editor's actions with their chords while a
// document is open and drops them when one is not, and the `?` sheet's editor
// section is built from the same rows, so the two cannot disagree.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };

const paletteRows = (page) => page.evaluate(() =>
  [...document.querySelectorAll("#palette-list > li")].map((li) => ({
    group: li.classList.contains("palette-group-header"),
    text: li.textContent.trim(),
    keys: li.querySelector("kbd.palette-keys")?.textContent || "",
  })));

(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  // With no document open, and on another tab, the editor group is absent.
  await page.evaluate(() => { switchTab("notes"); });
  await page.waitForTimeout(800);
  await page.evaluate(() => openPalette());
  await page.waitForTimeout(700);
  let rows = await paletteRows(page);
  ok("no editor group before a document is open",
    !rows.some((r) => r.text === "This document"), JSON.stringify(rows.slice(0, 2)));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  await page.evaluate(async () => {
    const r = await api("/documents", { method: "POST",
      body: JSON.stringify({ title: "Command probe", content: "# Title\n\nsome words\n" }) });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
  });
  await page.waitForTimeout(2400);

  await page.evaluate(() => openPalette());
  await page.waitForTimeout(700);
  rows = await paletteRows(page);
  const header = rows.findIndex((r) => r.text === "This document");
  ok("the editor group is the first thing in the palette", header === 0, `${header}: ${rows[0]?.text}`);
  const group = [];
  for (let i = header + 1; i < rows.length && !rows[i].group; i += 1) group.push(rows[i]);
  ok("it carries every command with a run", group.length === 31, `${group.length} rows`);
  ok("and the app's own commands are a group of their own below it",
    rows.some((r) => r.group && r.text === "Everywhere"),
    JSON.stringify(rows.filter((r) => r.group).map((r) => r.text)));
  const withKeys = group.filter((r) => r.keys);
  ok("and the chords are drawn beside them", withKeys.length === 10, JSON.stringify(withKeys.map((r) => r.keys)));
  const bold = group.find((r) => r.text.startsWith("Bold"));
  ok("Bold is listed with Ctrl+B", bold && bold.keys === "Ctrl+B", JSON.stringify(bold));

  // Running one from the palette reaches the document.
  await page.fill("#palette-input", "Heading 2");
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    docSurface().focus();
    const at = docSurface().text.indexOf("some words");
    docSurface().setSelection(at, at);
  });
  await page.evaluate(() => {
    const li = [...document.querySelectorAll("#palette-list > li")]
      .find((el) => el.textContent.trim().startsWith("Heading 2"));
    li.click();
  });
  await page.waitForTimeout(700);
  const text = await page.evaluate(() => docSurface().text);
  ok("running a command from the palette writes in the document",
    /## some words/.test(text), JSON.stringify(text));

  // The sheet, from the same table.
  await page.evaluate(() => openShortcuts());
  await page.waitForTimeout(700);
  const sheet = await page.evaluate(() => {
    const list = document.getElementById("shortcut-list-documents");
    const note = document.getElementById("shortcut-list-documents-note");
    return {
      noteHidden: note.classList.contains("hidden"),
      rows: [...list.children].map((li) => ({
        keys: [...li.querySelectorAll("kbd")].map((k) => k.textContent).join("+"),
        label: li.lastElementChild.textContent.trim(),
      })),
      h: Math.round(list.getBoundingClientRect().height),
    };
  });
  ok("the sheet has an editor section", sheet.rows.length > 0 && sheet.noteHidden, `${sheet.rows.length} rows, ${sheet.h}px`);
  const table = await page.evaluate(() =>
    DOC_COMMANDS.filter((c) => c.keys).map((c) => `${c.keys}|${c.label}`));
  const drawn = sheet.rows.map((r) => `${r.keys}|${r.label}`);
  ok("and every row in it comes from the table, unchanged",
    drawn.join("\n") === table.join("\n"),
    `${drawn.length} drawn vs ${table.length} in the table`);
  ok("the palette and the sheet agree about Ctrl+B",
    drawn.includes("Ctrl+B|Bold") && bold.keys === "Ctrl+B");

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
