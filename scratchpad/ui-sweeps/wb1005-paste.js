// FEAT-09: text pasted onto a board becomes items, one undo step; the board's
// own Ctrl+C, Ctrl+V still copies items; a picture still pastes.
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-paste.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

(async () => {
  const { browser, ctx, page, errors } = await openBoard();
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  const count = () => page.evaluate(() => (wbState.objects || []).length);
  const paste = (data) => page.evaluate((d) => {
    const dt = new DataTransfer();
    for (const [type, value] of Object.entries(d)) dt.setData(type, value);
    document.getElementById("whiteboard-container").focus();
    document.getElementById("whiteboard-container").dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, data);

  const before = await count();
  await paste({ "text/plain": "- one\n- two\n- three" });
  await page.waitForTimeout(1200);
  check("a three-line list makes three stickies", (await count()) === before + 3, await count());
  const texts = await page.evaluate(() => (wbState.objects || []).map((o) => o.data.content));
  check("with the words and no marks", ["one", "two", "three"].every((t) => texts.includes(t)), texts);
  check("selected, announced", await page.evaluate(() => wbMultiSelection.size === 3));
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(800);
  check("one Undo takes all three back", (await count()) === before, await count());

  await paste({ "text/plain": "https://example.com/plans" });
  await page.waitForTimeout(900);
  const link = await page.evaluate(() => (wbState.objects || []).at(-1)?.data);
  check("a URL makes a link box", link?.md === true && /\]\(https:\/\/example\.com\/plans\)/.test(link.content), link);

  // The board's own copy and paste: Ctrl+C, Ctrl+V through the real keys.
  const n0 = await count();
  await page.evaluate(() => {
    const last = (wbState.objects || []).at(-1);
    selectWbItem("object", last.id);
  });
  await page.focus("#whiteboard-container");
  await page.keyboard.press("Control+c");
  await page.waitForTimeout(300);
  await page.keyboard.press("Control+v");
  await page.waitForTimeout(1200);
  const copied = await page.evaluate(() => (wbState.objects || []).slice(-2).map((o) => o.data.content));
  check("the board's own Ctrl+C, Ctrl+V copies the item", (await count()) === n0 + 1 && copied[0] === copied[1], copied);
  check("no console errors", errors.length === 0, errors);
  summary();
  await browser.close();
})();
