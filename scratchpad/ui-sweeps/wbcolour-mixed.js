// The owner, 2026-10-11: "if I highlight and select multiple objects, cna I
// cnahge the properties they share". The Format panel shows what a selection
// shares, says Mixed where it differs, and one edit is one Undo for them all.
//   BASE=http://127.0.0.1:8800 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbcolour-mixed.js
const { openBoard, sketch } = require("./wbcolour-lib.js");
const { checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
(async () => {
  const { browser, page, errors, board } = await openBoard();
  const rect = (x, extra) => ({ d: `M ${x} 200 L ${x + 160} 200 L ${x + 160} 300 L ${x} 300 Z`, shape: "rect", fillOpacity: 1, color: "#1f2430", width: 3, ...extra });
  const a = await sketch(page, board.id, rect(300, { fill: "#da5252" }));
  const b = await sketch(page, board.id, rect(560, { fill: "#387fe3", width: 6, dash: "dashed" }));
  const c = await sketch(page, board.id, { d: "M 300 450 L 360 480 L 430 440 L 520 490", color: "#1f2430", width: 3 });
  const data = (id) => page.evaluate((i) => JSON.parse(wbFindItem("sketch", i).data), id);
  const centre = (id) => page.evaluate((i) => { const r = document.querySelector(`.sketch-group[data-id="${i}"]`).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, id);
  await page.evaluate(() => wbSelectToolRef("select"));
  const pa = await centre(a), pb = await centre(b);
  await page.mouse.click(pa.x, pa.y);
  await page.keyboard.down("Shift");
  await page.mouse.click(pb.x, pb.y);
  await page.keyboard.up("Shift");
  await page.waitForTimeout(400);
  await page.evaluate(() => wbFormatOpen("style", { focus: false }));
  await page.waitForTimeout(500);
  const read = () => page.evaluate(() => {
    const row = (f) => { const r = document.querySelector(`#wb-format [data-fmt="${f}"]`); return Boolean(r && !r.hidden && r.getBoundingClientRect().height > 0); };
    const dash = document.getElementById("wb-fmt-dash");
    const opener = dash.closest(".select-shell")?.querySelector(".select-opener") || dash.nextElementSibling;
    return {
      n: wbMultiSelection.size,
      fill: row("fill"), stroke: row("stroke"), caps: row("caps"), width: row("width"),
      strokeWord: document.getElementById("wb-fmt-stroke-word").textContent,
      fillMixed: document.getElementById("wb-fmt-fill").classList.contains("wb-mixed"),
      strokeMixed: document.getElementById("wb-fmt-stroke").classList.contains("wb-mixed"),
      widthValue: document.getElementById("wb-fmt-width").value,
      widthHint: document.getElementById("wb-fmt-width").placeholder,
      dashText: (opener?.textContent || "").trim(),
      dashValue: dash.value,
    };
  });
  let s = await read();
  check("two shapes: Fill and Border both show, border word is Border", s.n === 2 && s.fill && s.stroke && s.strokeWord === "Border" && !s.caps, s);
  check("the values they differ on say Mixed (fill, width, pattern)", s.fillMixed && !s.strokeMixed && s.widthValue === "" && s.widthHint === "Mixed" && s.dashValue === "" && /Mixed/.test(s.dashText), s);
  await page.fill("#wb-fmt-width", "5");
  await page.press("#wb-fmt-width", "Enter");
  await page.locator("#wb-fmt-width").blur();
  await page.waitForTimeout(800);
  const [wa, wb] = [await data(a), await data(b)];
  s = await read();
  check("one width typed sets both, and the field no longer says Mixed", wa.width === 5 && wb.width === 5 && s.widthValue === "5", { wa: wa.width, wb: wb.width, s: s.widthValue });
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(800);
  const [ua, ub] = [await data(a), await data(b)];
  check("one Undo puts both widths back", ua.width === 3 && ub.width === 6, { a: ua.width, b: ub.width });
  await page.click("#wb-fmt-fill");
  await page.waitForTimeout(400);
  const head = await page.evaluate(() => document.getElementById("wb-colour-head").textContent);
  check("the fill's well says it is mixed and a pick sets them all", /mixed/.test(head), head);
  await page.click('#wb-colour-menu .swatch-option[aria-label="Teal"]');
  await page.waitForTimeout(800);
  const [fa, fb] = [await data(a), await data(b)];
  check("one fill pick fills both", fa.fill === "#159172" && fb.fill === "#159172", { a: fa.fill, b: fb.fill });
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(800);
  const [ga, gb] = [await data(a), await data(b)];
  check("one Undo puts both fills back", ga.fill === "#da5252" && gb.fill === "#387fe3", { a: ga.fill, b: gb.fill });
  await page.click("#wb-fmt-stroke");
  await page.waitForTimeout(400);
  await page.click(".wb-colour-match");
  await page.waitForTimeout(800);
  const [ma, mb] = [await data(a), await data(b)];
  check("Same as fill on a selection gives each shape its own fill as border", ma.color === "#da5252" && mb.color === "#387fe3", { a: ma.color, b: mb.color });
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(800);
  // The pen line is thin, so its shift-click goes through the click handler.
  await page.evaluate((id) => wbHandleItemClick("sketch", id, { shiftKey: true }), c);
  await page.evaluate(() => wbFormatSync());
  await page.waitForTimeout(600);
  s = await read();
  check("add a pen line: only what all three share (no fill), the word is Line", s.n === 3 && !s.fill && s.stroke && s.width && s.strokeWord === "Line", s);
  check("no page errors", errors.length === 0, errors.slice(0, 3));
  summary();
  await browser.close();
})();
