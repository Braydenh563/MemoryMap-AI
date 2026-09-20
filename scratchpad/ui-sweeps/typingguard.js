// Probe: the app's "is the user typing?" guard and a `contenteditable`.
//
// app.js's bare-shortcut guard listed INPUT, TEXTAREA and SELECT only. The
// documents editor stops its own keys at the host (`docGuardGlobalShortcuts`),
// so the shared guard's gap shows on any *other* contenteditable: the Library's
// OCR region text (`library.js`, `text.contentEditable`) is the one in the app
// today. Measured here on a stand-in with the same shape, focused, so the probe
// needs no OCR fixture: a literal "/" must stay in the box and must not focus
// the global search.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };
(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.evaluate(() => {
    const box = document.createElement("p");
    box.id = "probe-editable";
    box.contentEditable = "plaintext-only";
    box.textContent = "a line that was read";
    document.body.appendChild(box);
    box.focus();
  });
  const before = await page.evaluate(() => document.activeElement.id);
  ok("the box has focus", before === "probe-editable", before);

  await page.keyboard.press("/");
  await page.waitForTimeout(250);
  let after = await page.evaluate(() => document.activeElement.id);
  ok('"/" does not jump to the global search', after === "probe-editable", after);

  await page.keyboard.press("?");
  await page.waitForTimeout(400);
  const overlays = await page.evaluate(() =>
    [...document.querySelectorAll(".modal-overlay:not(.hidden)")].map((el) => el.id || el.className));
  after = await page.evaluate(() => document.activeElement.id);
  ok('"?" does not open a sheet from inside the box', after === "probe-editable" && !overlays.length,
    `${after}, overlays ${JSON.stringify(overlays)}`);

  // The chorded half still works from a contenteditable: Ctrl+K opens the
  // palette, which is the behaviour the guard must not take away.
  await page.evaluate(() => document.getElementById("probe-editable").focus());
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  const palette = await page.evaluate(() =>
    !document.getElementById("palette-overlay").classList.contains("hidden"));
  ok("Ctrl+K still opens the palette from inside it", palette);

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
