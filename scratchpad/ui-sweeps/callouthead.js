// INBOX 486: a callout in the Live view shows its kind once (an icon with a
// caret, the kind picker), its title as the line's own text, no `>` or
// `[!kind]` even with the caret on it, and an empty body says what goes there.
// The "/" menu's callout row writes an empty body with the caret in it.
//
//   BASE=http://127.0.0.1:8791 node scratchpad/ui-sweeps/callouthead.js
const { boot } = require("./lib.js");

const BODY = ["# Callouts", "", "> [!note] Note", "> ", "", "> [!warning]", "> Mind the gap.", "", "After."].join("\n");
let failures = 0;
const ok = (name, pass, detail) => {
  if (!pass) failures += 1;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail === undefined ? "" : "  " + JSON.stringify(detail)}`);
};

(async () => {
  const W = +(process.env.W || 1440);
  const { browser, page } = await boot(W < 600 ? { viewport: { width: W, height: 844 }, hasTouch: true, isMobile: true } : {});
  await page.evaluate(async (body) => {
    const r = await api("/documents", { method: "POST", body: JSON.stringify({ title: "Callout sweep", content: body }) });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
  }, BODY);
  await page.waitForTimeout(2500);
  await page.evaluate(() => setDocView("live"));
  await page.waitForTimeout(900);

  const lines = () => page.evaluate(() => [...document.querySelectorAll("#doc-editor .cm-line.cm-md-callout")].map((l) => ({
    text: l.textContent,
    word: l.querySelector(".cm-md-callout-word")?.textContent || null,
    caret: !!l.querySelector(".cm-md-callout-caret"),
    hint: l.querySelector(".cm-md-callout-hint")?.textContent || null,
  })));
  let rows = await lines();
  ok("the titled callout reads its kind once", rows[0] && rows[0].text.trim() === "Note" && rows[0].word === null && rows[0].caret, rows[0]);
  ok("its empty body says what goes there", rows[1] && rows[1].hint === "Write the note", rows[1]);
  ok("an untitled callout names its kind once, standing in for a title", rows[2] && rows[2].word === "Warning" && rows[2].text.trim() === "Warning", rows[2]);
  ok("no marker shows at rest", rows.every((r) => !r.text.includes(">") && !r.text.includes("[!")), rows.map((r) => r.text));

  // The caret on each callout line: still no marker.
  for (const needle of ["Note\n", "Mind the gap"]) {
    await page.evaluate((n) => {
      const at = docSurface().text.indexOf(n) + 1;
      docSurface().focus();
      docSurface().setSelection(at, at);
    }, needle);
    await page.waitForTimeout(300);
    rows = await lines();
    ok(`with the caret in "${needle.trim()}", no marker shows`, rows.every((r) => !r.text.includes(">") && !r.text.includes("[!")), rows.map((r) => r.text));
  }

  // The icon is the kind picker.
  await page.click("#doc-editor .cm-md-callout-kindbtn");
  await page.waitForTimeout(400);
  const menu = await page.evaluate(() => [...document.querySelectorAll(".action-menu:not(.hidden) [role=menuitem], .action-menu:not(.hidden) button")].map((b) => b.textContent.trim()).filter(Boolean));
  ok("the icon opens the kinds", menu.includes("Warning") && menu.includes("Folded until clicked"), menu.slice(0, 6));
  await page.keyboard.press("Escape");

  // The "/" row writes an empty body, caret inside.
  const inserted = await page.evaluate(async () => {
    const s = docSurface();
    s.focus();
    s.setSelection(s.text.length, s.text.length);
    const row = editorBlockRows("document").find((r) => r.id === "callout-tip");
    row.run(s);
    await new Promise((r) => setTimeout(r, 300));
    const text = s.text;
    return { tail: text.slice(-40), caretAtBody: text.slice(0, s.selectionStart).endsWith("[!tip] Tip\n> ") };
  }).catch((e) => ({ error: String(e) }));
  ok("the / row writes the kind once and an empty body", inserted.tail && inserted.tail.includes("> [!tip] Tip\n> ") && inserted.caretAtBody, inserted);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });

  console.log(failures ? `FAIL: ${failures}` : "PASS: 0 findings");
  await browser.close();
})();
