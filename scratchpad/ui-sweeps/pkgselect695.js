// INBOX 695: "Select its packages" in a bundle's ⋯ menu takes you to the
// packages: the first one centred in view and its tick focused.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluate(() => openSettingsModal("extras"));
  await page.waitForTimeout(3500);
  const kebab = page.locator(".extras-bundle .menu-wrap > button").first();
  const has = await kebab.count();
  if (!has) { console.log(JSON.stringify({ bundles: 0 })); await browser.close(); return; }
  await kebab.click();
  await page.waitForTimeout(300);
  await page.locator(".action-menu:not(.hidden)").getByText("Select its packages").click();
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const focused = document.activeElement;
    const row = focused?.closest(".extras-row");
    const box = row?.getBoundingClientRect();
    return { focusedPick: !!focused?.classList.contains("extras-pick"), checked: !!focused?.checked, rowId: row?.id, rowTop: box && Math.round(box.top), inView: !!box && box.top >= 0 && box.bottom <= innerHeight };
  });
  console.log(JSON.stringify({ ...r, errors }));
  await browser.close();
})();
