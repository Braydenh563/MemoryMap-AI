// MINDMAP_PLAN §14e gate (mc1): the note and document editors insert an emoji
// or an icon from the one picker; the reading view draws `:ph-name:`.
//   BASE=http://127.0.0.1:8798 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mc1-editoricons.js
const { boot } = require("./lib.js");
const results = [];
const check = (label, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
};
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.waitForTimeout(2000);
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1000);
  await page.evaluate(() => [...document.querySelectorAll("#tab-notes button")].find((x) => x.textContent.trim() === "Capture" && x.offsetParent)?.click());
  await page.waitForTimeout(800);

  // --- the note composer's toolbar ---
  const buttons = await page.evaluate(() => ({
    note: Boolean(document.querySelector('#note-toolbar [data-md="emoji"]')),
    doc: Boolean(document.querySelector('#doc-toolbar-insert [data-md="emoji"]')),
  }));
  check("the note toolbar and the document's Insert menu each offer Emoji or icon", buttons.note && buttons.doc, JSON.stringify(buttons));

  await page.fill("#entry-content", "Party time ");
  await page.evaluate(() => {
    const box = document.getElementById("entry-content");
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  });
  const btn = page.locator('#note-toolbar [data-md="emoji"]');
  if (await btn.isVisible()) await btn.click();
  else await page.evaluate(() => applyMarkdown("emoji", "entry-content"));
  await page.waitForSelector(".icon-picker", { timeout: 8000 });
  await page.keyboard.type("party popper");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const note = await page.evaluate(() => ({ value: document.getElementById("entry-content").value, focus: document.activeElement?.id || (document.activeElement?.closest(".cm-editor") ? "entry-content" : "") }));
  check("an emoji goes in at the caret, as itself, and the box keeps the focus", note.value === "Party time \u{1F389}" && note.focus === "entry-content", JSON.stringify(note));

  // An icon from the Icons tab goes in as its token.
  await page.evaluate(() => applyMarkdown("emoji", "entry-content"));
  await page.waitForSelector(".icon-picker");
  await page.click('.icon-picker-modes [data-mode="icon"]');
  await page.keyboard.type("rocket launch");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(400);
  const token = await page.evaluate(() => document.getElementById("entry-content").value);
  check("an icon goes in as :ph-name:", token.endsWith(":ph-rocket-launch:"), JSON.stringify(token));

  // --- the "/" menu ---
  const slash = await page.evaluate(() => {
    const rows = editorBlockRows("note");
    const row = rows.find((r) => r.id === "emoji");
    return row ? { label: row.label, icon: row.icon } : null;
  });
  check("the / menu has Emoji or icon", slash && slash.label === "Emoji or icon", JSON.stringify(slash));

  // --- the reading view ---
  const read = await page.evaluate(() => {
    const el = document.createElement("div");
    renderInlineMarkdown(el, "Launch :ph-rocket-launch: today, `code :ph-x:` stays");
    const i = el.querySelector("i.ph-rocket-launch");
    return { icon: Boolean(i), label: i?.getAttribute("aria-label"), code: el.querySelector("code")?.textContent, text: el.textContent };
  });
  check("the reading view draws :ph-name: as the icon", read.icon && read.label === "rocket launch", JSON.stringify(read));
  check("and leaves it as words inside code", /:ph-x:/.test(read.code || ""), read.code);

  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
