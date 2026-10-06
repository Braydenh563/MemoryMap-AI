// MINDMAP_PLAN §14d/14e gate (mc1): stickers on a board and a map, a drop on
// a topic, and the editors' insert. Drops are dispatched DragEvents carrying
// the picker's own data (Playwright cannot drag between a popover and a
// canvas reliably), so the drop handlers are exercised, the OS drag is not.
//   BASE=http://127.0.0.1:8798 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mc1-stickers.js
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
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Stickers" }) });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1200));
  });

  const drop = (choice, x, y, targetSel = null) => page.evaluate(async ({ choice, x, y, targetSel }) => {
    const container = document.getElementById("whiteboard-container");
    const target = targetSel ? document.querySelector(targetSel) : container;
    const r = (targetSel ? target : container).getBoundingClientRect();
    const dt = new DataTransfer();
    dt.setData("application/x-memorymap-icon", JSON.stringify(choice));
    dt.setData("text/plain", choice.kind === "emoji" ? choice.value : `:ph-${choice.value}:`);
    const at = { clientX: r.left + (targetSel ? r.width / 2 : x), clientY: r.top + (targetSel ? r.height / 2 : y), bubbles: true, cancelable: true, dataTransfer: dt };
    target.dispatchEvent(new DragEvent("dragover", at));
    target.dispatchEvent(new DragEvent("drop", at));
    await new Promise((res) => setTimeout(res, 1500));
  }, { choice, x, y, targetSel });

  // --- an emoji dropped on a board ---
  const before = await page.evaluate(() => ({ objects: wbState.objects.length, sketches: wbState.sketches.length, undo: wbUndoStack.length }));
  await drop({ kind: "emoji", value: "\u{1F389}" }, 400, 300);
  const emoji = await page.evaluate(() => {
    const o = wbState.objects.find((x) => x.data?.sticker);
    const el = o && document.querySelector(`.wb-object[data-id="${o.id}"]`);
    const cs = el && getComputedStyle(el);
    const t = el && getComputedStyle(el.querySelector(".wb-text-content"));
    return o ? { content: o.data.content, w: o.width, cls: el.className, bg: cs.backgroundColor, border: cs.borderTopColor, font: t.fontSize, undo: wbUndoStack.length } : null;
  });
  console.log("    " + JSON.stringify(emoji));
  check("an emoji dropped on a board is a sticker object", emoji && emoji.content === "\u{1F389}" && /wb-sticker/.test(emoji.cls));
  check("drawn with no card, its glyph sized to the box", emoji && /rgba\(0, 0, 0, 0\)|transparent/.test(emoji.bg) && parseFloat(emoji.font) >= 60, `${emoji?.bg}, ${emoji?.font}`);
  check("one Undo step", emoji && emoji.undo === before.undo + 1);

  // --- a Phosphor icon dropped on a board: the library's vector icon ---
  await drop({ kind: "icon", value: "rocket" }, 700, 300);
  await page.waitForTimeout(1000);
  const icon = await page.evaluate(() => {
    const s = wbState.sketches.find((x) => /"icon"\s*:\s*"rocket"/.test(x.data || ""));
    return { found: Boolean(s), sketches: wbState.sketches.length };
  });
  check("an icon dropped on a board is the library's vector icon", icon.found, JSON.stringify(icon));

  // --- the Insert menu's row opens the picker; a pick places a sticker ---
  const insert = await page.evaluate(async () => {
    const row = document.querySelector('[data-wb-cmd="insert-sticker"]');
    if (!row) return { row: false };
    const n = wbState.objects.length;
    wbOpenStickerPicker();
    for (let i = 0; i < 30 && !document.querySelector(".icon-picker"); i++) await new Promise((r) => setTimeout(r, 100));
    const tile = document.querySelector(".icon-picker .icon-picker-tile");
    tile?.click();
    await new Promise((r) => setTimeout(r, 1200));
    const open = Boolean(document.querySelector(".icon-picker"));
    return { row: true, made: wbState.objects.length - n, open };
  });
  check("Insert, Emoji and icons… places the picked one and stays open for more", insert.row && insert.made === 1 && insert.open, JSON.stringify(insert));
  await page.keyboard.press("Escape");

  // --- on a map: a drop on a topic sets its icon ---
  await page.evaluate(async () => {
    const board = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "- Centre\n  - Branch", name: "Sticker map" }) });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1500));
  });
  const branchSel = await page.evaluate(() => {
    const b = wbMapIndex().nodes.find((n) => /Branch/.test(n.data?.content || ""));
    return `.wb-object[data-id="${b.id}"]`;
  });
  await drop({ kind: "emoji", value: "\u{1F680}" }, 0, 0, branchSel);
  const topic = await page.evaluate(() => {
    const b = wbMapIndex().nodes.find((n) => /Branch/.test(n.data?.content || ""));
    return { icon: b.data.icon, stickers: wbState.objects.filter((o) => o.data?.sticker).length };
  });
  check("an emoji dropped on a topic is its icon, not a sticker", topic.icon === "\u{1F680}" && topic.stickers === 0, JSON.stringify(topic));
  await drop({ kind: "emoji", value: "⭐" }, 60, 60);
  const mapSticker = await page.evaluate(() => wbState.objects.filter((o) => o.data?.sticker).length);
  check("on a map's empty canvas it is a sticker", mapSticker === 1, `${mapSticker}`);

  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
