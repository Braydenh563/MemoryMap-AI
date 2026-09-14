const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => openSettingsModal("help"));
  await page.waitForTimeout(800);
  const out = await page.evaluate(() => {
    const acc = document.querySelector("#settings-help .help-accordion");
    const row = document.querySelector("#settings-help .atlas-row");
    const a = acc.getBoundingClientRect(), r = row.getBoundingClientRect();
    return { accBottom: a.bottom, rowTop: r.top, gap: r.top - a.bottom, marginTop: getComputedStyle(row).marginTop, accMarginBottom: getComputedStyle(acc).marginBottom,
      between: [...document.querySelectorAll("#settings-help > *")].map((e) => e.className || e.tagName).slice(0, 8) };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
