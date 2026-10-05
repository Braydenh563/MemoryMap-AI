// New board from a template (BACKLOG 4b answered by WHITEBOARD_PLAN decision
// 25): the gallery offers Blank, the built-in frames and your own templates;
// Save this board as a template puts one there.
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-templates.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
const W = +(process.env.W || 1440);

(async () => {
  const { browser, page, errors } = await openBoard({ viewport: { width: W, height: 900 } });
  // A board with two frames and a sticky, saved as a template.
  await page.evaluate(async () => {
    await wbCreateFrame(0, 0);
    await wbCreateFrame(600, 0);
    await wbCreateSticky(200, 200);
    window.promptDialog = async () => "Two rooms";
    await wbRunCommand("save-template");
  });
  await page.waitForTimeout(1000);
  const saved = await page.evaluate(async () => (await apiJson("/board-library?kind=template")).items.map((i) => i.name));
  check(`${W}: Save this board as a template lands in Yours`, saved.includes("Two rooms"), saved);

  // The gallery: Blank first, the built-ins, then ours.
  page.evaluate(() => createNewBoard("board"));
  await page.waitForTimeout(1200);
  const rows = await page.evaluate(() => [...document.querySelectorAll("#wb-template-list .doc-template-choice strong")].map((s) => s.textContent));
  check(`${W}: the gallery offers Blank, the built-ins and yours`, rows[0] === "Blank" && rows.includes("Kanban, three columns") && rows.includes("Two rooms"), rows);
  const dialog = await page.evaluate(() => {
    const d = document.getElementById("wb-template-dialog").getBoundingClientRect();
    return { open: document.getElementById("wb-template-dialog").open, fits: d.top >= 0 && d.bottom <= innerHeight && d.right <= innerWidth };
  });
  check(`${W}: it opens inside the window`, dialog.open && dialog.fits, dialog);
  await page.keyboard.type("Sprint board");
  await page.click('#wb-template-list .doc-template-choice:has-text("Kanban")');
  await page.waitForTimeout(200);
  const preview = await page.evaluate(() => document.querySelectorAll("#wb-template-preview svg rect").length);
  check(`${W}: choosing a row shows what it makes`, preview === 3, preview);
  check(`${W}: choosing is not making, the name typed stays`, await page.evaluate(() => document.getElementById("wb-template-name").value === "Sprint board"));
  await page.click("#wb-template-create");
  await page.waitForTimeout(2500);
  const made = await page.evaluate(() => ({
    id: window.currentBoardId,
    frames: (wbState.objects || []).filter((o) => o.kind === "frame").map((o) => o.data.content),
  }));
  check(`${W}: Create opens the new board with the Kanban's three frames`, made.frames.length === 3 && made.frames.includes("Doing"), made);

  // Ours, through the same gallery.
  page.evaluate(() => createNewBoard("board"));
  await page.waitForTimeout(1200);
  await page.click('#wb-template-list .doc-template-choice:has-text("Two rooms")');
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
  const ours = await page.evaluate(() => ({
    frames: (wbState.objects || []).filter((o) => o.kind === "frame").length,
    stickies: (wbState.objects || []).filter((o) => o.kind === "text").length,
  }));
  check(`${W}: a board from your template has what it held`, ours.frames === 2 && ours.stickies === 1, ours);
  check(`${W}: no console errors`, errors.length === 0, errors);
  summary();
  await browser.close();
})();
