// INBOX 904 B09: clicking the underline of an autocorrected word must not put
// the word back at once; it opens a small menu at the word (keep, put back,
// edit), and only "Put back" reverts. Types "teh " into the Capture box.
// Usage: BASE=http://127.0.0.1:8783 node autocorrectmenu.js
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(1500);
  const value = () => page.evaluate(() => document.getElementById("chat-input").value);
  const type = async (word = "teh") => {
    await page.fill("#chat-input", "");
    await page.click("#chat-input");
    await page.keyboard.type(`${word} `, { delay: 40 });
    await page.waitForTimeout(500);
  };
  await type();
  console.log("typed:", JSON.stringify(await value()));
  const mark = await page.evaluate(() => {
    const m = document.querySelector(".autocorrect-mark");
    const r = m?.getBoundingClientRect();
    return r ? { x: r.left, y: r.top, w: Math.round(r.width), h: Math.round(r.height) } : null;
  });
  console.log("mark", JSON.stringify(mark));
  ok("the corrected word is underlined", !!mark && mark.w > 5);
  await page.click(".autocorrect-mark");
  await page.waitForTimeout(500);
  const afterClick = await value();
  const menu = await page.evaluate(() => {
    const m = document.querySelector(".action-menu:not(.hidden):not(.select-menu)");
    if (!m) return null;
    const r = m.getBoundingClientRect();
    return { rows: [...m.querySelectorAll("button")].map((b) => b.textContent.trim()), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log("after click:", JSON.stringify(afterClick), JSON.stringify(menu));
  ok("a click leaves the corrected word in place", afterClick.startsWith("the "), JSON.stringify(afterClick));
  const clear = !!menu && (menu.y + menu.h <= mark.y + 1 || menu.y >= mark.y + mark.h - 1 || menu.x + menu.w <= mark.x || menu.x >= mark.x + mark.w);
  ok("a menu opens at the word, not covering it", !!menu && menu.rows.length >= 3 && Math.abs(menu.x + menu.w / 2 - mark.x) < 260 && Math.abs(menu.y - mark.y) < 260 && clear, JSON.stringify({ menu, mark }));
  if (menu) {
    const put = menu.rows.findIndex((r) => /put back/i.test(r));
    ok("the menu offers Keep, Put back and Edit", menu.rows.some((r) => /keep/i.test(r)) && put >= 0 && menu.rows.some((r) => /edit/i.test(r)), JSON.stringify(menu.rows));
    await page.evaluate(() => [...document.querySelectorAll(".action-menu:not(.hidden):not(.select-menu) button")].find((b) => /put back/i.test(b.textContent)).click());
    await page.waitForTimeout(400);
    ok("Put back restores what was typed", (await value()).startsWith("teh "), JSON.stringify(await value()));
  }
  await type("adn");
  await page.click(".autocorrect-mark");
  await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll(".action-menu:not(.hidden):not(.select-menu) button")].find((b) => /keep/i.test(b.textContent))?.click());
  await page.waitForTimeout(400);
  ok("Keep leaves the word and drops the underline", (await value()).startsWith("and ") && !(await page.$(".autocorrect-mark")), JSON.stringify(await value()));
  await type("taht");
  await page.click(".autocorrect-mark");
  await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll(".action-menu:not(.hidden):not(.select-menu) button")].find((b) => /edit/i.test(b.textContent))?.click());
  await page.waitForTimeout(400);
  const sel = await page.evaluate(() => { const e = document.getElementById("chat-input"); return { s: e.selectionStart, e: e.selectionEnd, focus: document.activeElement === e }; });
  ok("Edit selects the word in the box for typing over", sel.focus && sel.s === 0 && sel.e === 4, JSON.stringify(sel));
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
