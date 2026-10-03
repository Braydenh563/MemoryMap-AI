// INBOX 440 (2): on a phone the card's ⋯ is the action sheet (DESIGN.md, a
// menu behind a button: "below 600 it is an action sheet"). Prints its rows
// and their heights, and shoots it.
//
//   BASE=http://127.0.0.1:8789 THEME=dark node scratchpad/ui-sweeps/attachphone.js
const path = require("path");
const { boot } = require("./lib");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.evaluate(() => { switchTab("notes"); window.showNotesSection && showNotesSection("browse"); notesViewMode = "cards"; loadEntries(); });
  await page.waitForTimeout(2000);
  await page.tap("#entry-list .att-cards .att-card[data-kind='image'] .att-card-more");
  await page.waitForTimeout(800);
  console.log(JSON.stringify(await page.evaluate(() => {
    const sheet = [...document.querySelectorAll(".sheet-card")].find((s) => s.getClientRects().length);
    if (!sheet) return null;
    return [...sheet.querySelectorAll('[role="menuitem"]')].map((r) => `${r.textContent.trim()} ${Math.round(r.getBoundingClientRect().height)}`);
  })));
  await page.screenshot({ path: path.join(__dirname, "out", `attach-after-${process.env.THEME || "light"}-390-menu.png`) });
  await browser.close();
})();
