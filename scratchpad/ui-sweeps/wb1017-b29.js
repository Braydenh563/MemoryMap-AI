// B29 (INBOX 904): ungroup button state, grouped one-axis resize, live x/y/w/h.
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
(async () => {
  const { browser, page, errors, board } = await openBoard();
  const ids = await page.evaluate(async (bid) => {
    const box = async (x, y, words) => (await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({
      kind: "text", data: { content: words }, board_id: bid, x, y, z: 1, width: 160, height: 80 }) })).id;
    const a = await box(200, 200, "Alpha");
    const b = await box(450, 260, "Beta");
    await fetchWhiteboardState(); renderWhiteboardNow();
    return { a, b };
  }, board.id);
  await page.waitForTimeout(600);
  const state = () => page.evaluate(() => {
    const vis = (id) => { const e = document.getElementById(id); if (!e) return "none"; const r = e.getBoundingClientRect(); return `${e.classList.contains("hidden") || !!e.closest(".hidden") || r.width === 0 ? "hidden" : "shown"}${e.disabled ? ",disabled" : ""}${e.hidden ? ",hidden-attr" : ""}`; };
    return { group: vis("wb-multi-group"), ungroup: vis("wb-multi-ungroup"), gl: document.getElementById("wb-multi-group")?.getAttribute("aria-label"), ul: document.getElementById("wb-multi-ungroup")?.getAttribute("aria-label"), ctx: [...document.querySelectorAll("#wb-context [data-wb-ctx]:not(.hidden)")].map((e) => e.dataset.wbCtx) };
  });
  await page.evaluate((i) => { wbMultiSelection.clear(); wbMultiSelection.add(wbMultiKey("object", i.a)); wbMultiSelection.add(wbMultiKey("object", i.b)); wbApplySelectionHighlight(); wbUpdateContextBar(); }, ids);
  await page.waitForTimeout(400);
  console.log("ungrouped multi", JSON.stringify(await state()));
  await page.evaluate(() => wbGroupSelection());
  await page.waitForTimeout(800);
  console.log("after group", JSON.stringify(await state()));
  await page.evaluate(() => { wbMultiSelection.clear(); wbSelectedItem = null; wbUpdateContextBar(); });
  const r = await page.evaluate((i) => { const e = document.querySelector(`.wb-object[data-id="${i.a}"]`); const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }, ids);
  await page.mouse.click(r.x, r.y);
  await page.waitForTimeout(500);
  console.log("click member", JSON.stringify(await state()), await page.evaluate(() => [...wbMultiSelection]));
  console.log("bar", JSON.stringify(await page.evaluate(() => { const b = document.getElementById("wb-context"); const r = b.getBoundingClientRect(); const kids = [...b.querySelectorAll("button,input,select,label")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const q = e.getBoundingClientRect(); return [e.id || e.className.slice(0, 20), Math.round(q.left - r.left), Math.round(q.top - r.top), Math.round(q.width)]; }); return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), left: Math.round(r.left), tops: [...new Set(kids.map((k) => k[2]))], kids }; })));
  await page.keyboard.press("Control+Shift+P");
  await page.waitForTimeout(500);
  await page.click("#wb-format-tab-arrange");
  await page.waitForTimeout(400);
  const fmt = () => page.evaluate(() => Object.fromEntries(["x", "y", "w", "h"].map((k) => { const e = document.getElementById("wb-fmt-" + k); return [k, e ? e.value + (e.disabled ? "(dis)" : "") : null]; })));
  console.log("fmt grouped", JSON.stringify(await fmt()));
  const hs = await page.evaluate(() => [...document.querySelectorAll(".wb-multi-handle-group .wb-sketch-resize-handle")].map((h) => { const b = h.getBoundingClientRect(); return [h.dataset.handle, Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2)]; }));
  console.log("handles", JSON.stringify(hs));
  const geo = () => page.evaluate((i) => ["a", "b"].map((k) => { const o = wbState.objects.find((o) => o.id === i[k]); return [Math.round(o.x), Math.round(o.y), Math.round(o.width), Math.round(o.height)]; }), ids);
  console.log("geo0", JSON.stringify(await geo()));
  const e = hs.find((h) => h[0] === "e");
  if (e) {
    await page.mouse.move(e[1], e[2]);
    await page.mouse.down();
    await page.mouse.move(e[1] + 60, e[2], { steps: 6 });
    await page.waitForTimeout(150);
    console.log("fmt mid-drag e", JSON.stringify(await fmt()), "geo", JSON.stringify(await geo()));
    await page.mouse.up();
    await page.waitForTimeout(900);
    console.log("fmt after e", JSON.stringify(await fmt()), "geo", JSON.stringify(await geo()));
  }
  // move the group by dragging member
  const m = await page.evaluate((i) => { const el = document.querySelector(`.wb-object[data-id="${i.a}"]`).getBoundingClientRect(); return { x: el.left + el.width / 2, y: el.top + el.height / 2 }; }, ids);
  await page.mouse.move(m.x, m.y);
  await page.mouse.down();
  await page.mouse.move(m.x + 80, m.y + 40, { steps: 6 });
  await page.waitForTimeout(200);
  console.log("fmt mid-move", JSON.stringify(await fmt()), "geo", JSON.stringify(await geo()));
  await page.mouse.up();
  await page.waitForTimeout(900);
  console.log("fmt after move", JSON.stringify(await fmt()));
  await page.evaluate(() => { const w = document.getElementById("wb-fmt-w"); w.value = "300"; w.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1000);
  console.log("after panel W=300", JSON.stringify(await fmt()), "geo", JSON.stringify(await geo()));
  await page.evaluate(() => wbUngroupSelection());
  await page.waitForTimeout(800);
  console.log("after ungroup", JSON.stringify(await state()));
  await page.screenshot({ path: (process.env.SCRATCH || ".") + "/b29a.png" });
  await browser.close();
  console.log(errors);
})();
