// The owner, 2026-10-10: "Also I thought you added draggable emojis and an
// emoji and icon library?? Idk where it is or how to use it." It was only
// Insert, Emoji and icons…. The smiley is on the tool dock of a board (Add)
// and of a map (Map); it opens the picker beside itself, kept open, and a
// press places the emoji mid-view as a sticker.
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbstickerdock.js
const { boot } = require("./lib.js");
let fails = 0, passes = 0;
const check = (ok, what, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}${detail ? "  " + detail : ""}`); ok ? passes++ : fails++; };
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.VW || 1440), height: Number(process.env.VH || 900) } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1200);
  const b = await page.evaluate(async () => { await initWhiteboard(); return apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Stickers " + Date.now() }) }); });
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, b.id); await page.waitForTimeout(900);
  const seen = (id) => page.evaluate((id) => { const el = document.getElementById(id); if (!el) return null; const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { w: Math.round(r.width), h: Math.round(r.height), top: hit === el || el.contains(hit), label: el.getAttribute("aria-label") }; }, id);
  let s = await seen("wb-add-sticker");
  check(s && s.w >= 24 && s.top && s.label === "Emoji and icons", "a board's dock shows the emoji and icon button", JSON.stringify(s));
  await page.click("#wb-add-sticker");
  await page.waitForTimeout(500);
  const picker = await page.evaluate(() => { const p = document.querySelector('.help-popover.icon-picker'); if (!p) return null; const r = p.getBoundingClientRect(); const btn = document.getElementById("wb-add-sticker").getBoundingClientRect(); return { open: r.width > 0, near: Math.abs(r.bottom - btn.top) < 80 || Math.abs(r.top - btn.bottom) < 80, emoji: p.querySelectorAll("button").length }; });
  check(picker && picker.open && picker.near, "it opens the picker beside it", JSON.stringify(picker));
  const before = await page.evaluate(() => wbState.objects.length);
  await page.evaluate(() => { const p = document.querySelector('.help-popover.icon-picker'); const first = [...p.querySelectorAll(".icon-picker-tile")][0]; first?.click(); });
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => ({ n: wbState.objects.length, sticker: Boolean(wbState.objects.slice(-1)[0]?.data?.sticker || wbState.objects.slice(-1)[0]?.kind) }));
  check(after.n === before + 1, "a press places it on the board", JSON.stringify({ before, after }));
  await page.keyboard.press("Escape");
  const map = await page.evaluate(async () => apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Sticker map\n- Root", name: "Sticker map " + Date.now() }) }));
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id); await page.waitForTimeout(1500);
  s = await seen("wb-map-add-sticker");
  check(s && s.w >= 24 && s.top, "a map's dock shows it too", JSON.stringify(s));
  const boardOnes = await seen("wb-add-sticker");
  check(!boardOnes || boardOnes.w === 0, "and not the board's copy", JSON.stringify(boardOnes));
  check(!errors.length, "no page errors", errors.join(" | ").slice(0, 300));
  console.log(`${passes}/${passes + fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
