// INBOX 404, suggestion mode: typed and deleted text becomes marks, the
// marks are drawn and answered, and they are saved with the document.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  : " + d}`); };
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  const id = await page.evaluate(async () => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Suggest probe", content: "The cat sat on the mat.\n" }) });
    await loadDocuments(d.id);
    setDocView("live");
    return d.id;
  });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => ({ chip: document.getElementById("doc-suggest-status").hidden }));
  ok("the status chip is hidden while the mode is off", before.chip === true);

  // Turn it on from the menu.
  await page.click("#doc-dock-menu > summary");
  await page.waitForTimeout(200);
  await page.click("#doc-suggest-row");
  await page.waitForTimeout(200);
  const on = await page.evaluate(() => ({ checked: document.getElementById("doc-suggest-mode").checked, chip: document.getElementById("doc-suggest-status").hidden, label: document.getElementById("doc-suggest-status").textContent.trim() }));
  ok("the menu switch turns it on and the chip says so", on.checked && !on.chip, on.label);
  await page.keyboard.press("Escape");
  await page.evaluate(() => { const d = document.getElementById("doc-dock-menu"); if (d) d.open = false; });

  // Type after "cat" and delete "mat" with Backspace.
  await page.evaluate(() => { docCmView.focus(); docCmView.dispatch({ selection: { anchor: 7 } }); });
  await page.keyboard.type(" black");
  await page.evaluate(() => docCmView.dispatch({ selection: { anchor: docCmView.state.doc.toString().indexOf("mat.") + 3 } }));
  for (let i = 0; i < 3; i++) await page.keyboard.press("Backspace");
  await page.keyboard.type("rug");
  await page.waitForTimeout(400);
  const text = await page.evaluate(() => docText());
  ok("typing is an insertion, backspacing a deletion (typing lands before the struck word, as in Word and Docs)", text === "The cat{++ black++} sat on the {++rug++}{--mat--}.\n", JSON.stringify(text));
  const drawn = await page.evaluate(() => ({
    ins: [...document.querySelectorAll(".cm-suggest-ins")].map((e) => e.textContent),
    del: [...document.querySelectorAll(".cm-suggest-del")].map((e) => e.textContent),
    shown: document.querySelector(".cm-content").textContent,
    strike: getComputedStyle(document.querySelector(".cm-suggest-del")).textDecorationLine,
    chip: document.getElementById("doc-suggest-status").textContent.trim(),
  }));
  ok("insertions and deletions are drawn", drawn.ins.join("|") === " black|rug" && drawn.del.join("|") === "mat", JSON.stringify(drawn));
  ok("Live hides the markers", !/\{\+\+|\+\+\}|\{--|--\}/.test(drawn.shown), drawn.shown);
  ok("a deletion is struck through", drawn.strike === "line-through", drawn.strike);
  ok("the chip counts the changes", /3 changes/.test(drawn.chip), drawn.chip);

  // Undo takes the last suggestion back as one step.
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(200);
  const undone = await page.evaluate(() => docText());
  ok("Ctrl+Z undoes the suggested typing", !undone.includes("rug"), JSON.stringify(undone));
  await page.keyboard.press("Control+y");
  await page.waitForTimeout(200);
  const redone = await page.evaluate(() => docText());
  ok("Ctrl+Y puts it back", redone === text, JSON.stringify(redone));

  // Accept one from its own menu.
  const spot = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".cm-suggest-ins")].find((e) => e.textContent === " black");
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(300);
  const rows = await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].filter((r) => r.getClientRects().length).map((r) => r.textContent.trim()));
  ok("a change's menu offers accept, reject and the rest", rows.includes("Accept this insertion") && rows.includes("Reject this insertion"), rows.join(", "));
  await page.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((r) => r.getClientRects().length && r.textContent.trim() === "Accept this insertion")?.click());
  await page.waitForTimeout(300);
  const accepted = await page.evaluate(() => docText());
  ok("accepting keeps the words and drops the marks", accepted.startsWith("The cat black sat"), JSON.stringify(accepted));

  // Read view shows the proposal.
  await page.evaluate(() => setDocView("rendered"));
  await page.waitForTimeout(600);
  const read = await page.evaluate(() => {
    const pane = document.getElementById("doc-preview");
    return { del: [...pane.querySelectorAll("del")].map((e) => e.textContent), mark: [...pane.querySelectorAll("mark")].map((e) => e.textContent) };
  });
  ok("Read view strikes and highlights", read.del.includes("mat") && read.mark.includes("rug"), JSON.stringify(read));
  await page.evaluate(() => setDocView("live"));
  await page.waitForTimeout(300);

  // Saved with the document.
  await page.evaluate(async () => { await saveDocument?.(); });
  await page.waitForTimeout(1500);
  const stored = await page.evaluate(async (id) => (await apiJson(`/documents/${id}`)).content, id);
  ok("the marks are saved with the document", stored.includes("{++rug++}{--mat--}"), JSON.stringify(stored));

  // Reject all from the menu, then the mode off.
  await page.click("#doc-dock-menu > summary");
  await page.waitForTimeout(200);
  const menuRows = await page.evaluate(() => ["doc-suggest-next", "doc-suggest-accept-all", "doc-suggest-reject-all"].map((id) => !document.getElementById(id).hidden));
  ok("the review rows show while there are changes", menuRows.every(Boolean), JSON.stringify(menuRows));
  await page.click("#doc-suggest-reject-all");
  await page.waitForTimeout(300);
  const rejected = await page.evaluate(() => docText());
  ok("reject all restores the words", rejected === "The cat black sat on the mat.\n", JSON.stringify(rejected));
  await page.click("#doc-dock-menu > summary").catch(() => {});
  await page.waitForTimeout(200);
  if (await page.isVisible("#doc-suggest-row")) await page.click("#doc-suggest-row");
  await page.waitForTimeout(200);
  await page.evaluate(() => { const d = document.getElementById("doc-dock-menu"); if (d) d.open = false; docCmView.focus(); docCmView.dispatch({ selection: { anchor: 3 } }); });
  await page.keyboard.type("!");
  const off = await page.evaluate(() => docText());
  ok("with the mode off typing is plain again", off.startsWith("The! cat"), JSON.stringify(off));

  console.log(bad ? `${bad} FAILED` : "all passed");
  await browser.close();
})();
