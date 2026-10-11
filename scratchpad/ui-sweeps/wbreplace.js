// canvasdepth: find reads shape and connector labels; Ctrl+H replaces all, one undo.
//   BASE=http://127.0.0.1:8850 W=1440 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbreplace.js
const { openFresh, checker } = require("./cdlib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, errors } = await openFresh({ width: W });
  const { check, summary } = checker();
  await page.evaluate(async () => {
    await wbImportMermaid("flowchart LR\nA[Ship order] -->|ship it| B{Shipped?}\nB --> C[Done]", [0, 0]);
    await wbCreateObject("text", { content: "Remember to SHIP on Friday" }, 0, 200, 240, 50);
  });
  await page.waitForTimeout(500);
  await page.mouse.click(W / 2, 500);
  await page.keyboard.press("Control+h");
  await page.waitForTimeout(400);
  const ui = await page.evaluate(() => {
    const bar = document.getElementById("wb-search-bar").getBoundingClientRect();
    const row = document.getElementById("wb-replace-row");
    const r = row.getBoundingClientRect();
    return { open: !row.hidden, focus: document.activeElement?.id, inside: r.left >= bar.left - 0.5 && r.right <= bar.right + 0.5 && r.bottom <= bar.bottom + 0.5, right: bar.right, vw: innerWidth };
  });
  check("Ctrl+H opens the bar with the Replace row focused", ui.open && ui.focus === "wb-replace-input", ui);
  check("the row sits inside the bar, the bar inside the window", ui.inside && ui.right <= ui.vw, ui);
  await page.fill("#wb-search-input", "ship");
  await page.evaluate(() => document.getElementById("wb-search-input").dispatchEvent(new Event("input", { bubbles: true })));
  await page.waitForTimeout(300);
  const count = await page.textContent("#wb-search-count");
  check("find counts shape and connector labels and the text box", /of 4$/.test(count.trim()), count);
  const before = await page.evaluate(() => JSON.stringify(wbState.sketches.map((s) => s.data)) + JSON.stringify(wbState.objects.map((o) => o.data)));
  await page.fill("#wb-replace-input", "send");
  await page.click("#wb-replace-all");
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => ({
    labels: wbState.sketches.map((s) => JSON.parse(s.data).label).filter(Boolean),
    text: wbState.objects.find((o) => o.kind === "text")?.data?.content,
  }));
  check("labels and text rewritten", JSON.stringify(after.labels.sort()) === JSON.stringify(["Done", "send it", "send order", "sendped?"].sort()) && after.text === "Remember to send on Friday", after);
  const undone = await page.evaluate(async () => { await wbUndo(); return JSON.stringify(wbState.sketches.map((s) => s.data)) + JSON.stringify(wbState.objects.map((o) => o.data)); });
  check("one Ctrl+Z puts every one back", undone === before);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
