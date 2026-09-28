// Back/Forward through Settings: section and scroll restored (the owner at
// release: "press back and instantly go back to that settings section").
const {boot} = require("./lib");
const state = (page) => page.evaluate(() => {
  const open = !document.getElementById("settings-modal").classList.contains("hidden");
  const box = document.getElementById(`settings-${currentSettingsSection}`);
  let sc = null;
  for (let el = box && box.parentElement; el; el = el.parentElement) {
    const o = getComputedStyle(el).overflowY;
    if (o === "auto" || o === "scroll") { sc = el; break; }
  }
  return { open, section: currentSettingsSection, scroll: sc ? Math.round(sc.scrollTop) : null,
    tab: localStorage.getItem("activeTab"), stack: tabHistory.stack.map((e) => `${e.tab}:${e.section}${e.scroll != null ? "@" + e.scroll : ""}`).join(" "), index: tabHistory.index, hash: location.hash };
});
(async () => {
  const {browser, page} = await boot({});
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(800);
  await page.evaluate(() => openSettingsModal("appearance"));
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const box = document.getElementById("settings-appearance");
    for (let el = box.parentElement; el; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if (o === "auto" || o === "scroll") { el.scrollTop = 700; break; }
    }
  });
  await page.waitForTimeout(300);
  console.log("in settings", JSON.stringify(await state(page)));
  await page.evaluate(() => closeSettingsModal());
  await page.waitForTimeout(400);
  await page.evaluate(() => switchTab("chat"));
  await page.waitForTimeout(800);
  console.log("on chat", JSON.stringify(await state(page)));
  for (const step of [-1, -1, 1]) {
    await page.evaluate((d) => stepTabHistory(d), step);
    await page.waitForTimeout(1500);
    console.log(`step ${step}`, JSON.stringify(await state(page)));
  }
  await browser.close();
})();
