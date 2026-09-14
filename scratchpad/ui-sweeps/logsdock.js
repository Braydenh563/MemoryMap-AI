const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => openSettingsModal("logs"));
  await page.waitForTimeout(800);
  const out = await page.evaluate(() => {
    const bar = document.querySelector("#logs-bundle").closest(".dock, .doc-dock, .row") || document.querySelector("#logs-bundle").parentElement.parentElement;
    const r = bar.getBoundingClientRect();
    const tops = new Set([...bar.querySelectorAll("button, input, select, summary")].filter((e) => e.offsetParent).map((e) => Math.round(e.getBoundingClientRect().top)));
    const menu = document.getElementById("logs-more-menu"); menu.open = true;
    const row = document.getElementById("logs-email-bundle").getBoundingClientRect();
    return { bar: bar.className, height: Math.round(r.height), controlRows: [...tops].length, emailRow: [Math.round(row.width), Math.round(row.height)], inMenu: Boolean(document.getElementById("logs-email-bundle").closest("#logs-more-menu")) };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
