// Probe: does Tab indent in the documents editor, and what does the prose
// checker flag? Temporary diagnostic for the documents polish task.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.evaluate(async () => {
    const r = await api("/documents", { method: "POST",
      body: JSON.stringify({ title: "Tab probe", content: "alpha\nbeta\n" }) });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
  });
  await page.waitForTimeout(2500);
  console.log("view:", await page.evaluate(() => docView));
  console.log("cm mounted:", await page.evaluate(() => Boolean(window.docCmView) || Boolean(document.querySelector('#doc-editor .cm-content'))));
  await page.click("#doc-editor .cm-content");
  await page.evaluate(() => docSurface().setSelection(0, 0));
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => docSurface().text);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => docSurface().text);
  console.log("TAB before:", JSON.stringify(before), "after:", JSON.stringify(after));
  console.log("focus after Tab:", await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.className)));
  // Escape then Tab should leave
  await page.keyboard.press("Escape");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  console.log("focus after Esc+Tab:", await page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.className)));
  const after2 = await page.evaluate(() => docSurface().text);
  console.log("text after Esc+Tab:", JSON.stringify(after2));
  await browser.close();
})();
