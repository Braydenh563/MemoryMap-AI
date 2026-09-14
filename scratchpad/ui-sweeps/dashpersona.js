const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(async () => { await apiJson("/preferences", { method: "PUT", body: JSON.stringify({ dashboard_persona: "Librarian" }) }); prefsCache = await apiJson("/preferences"); openSettingsModal("personas"); });
  await page.waitForTimeout(900);
  const out = await page.evaluate(() => {
    const s = document.getElementById("dashboard-persona-select");
    const shell = s?.closest(".select-shell");
    const opener = shell?.querySelector(".select-opener");
    const r = (opener || s)?.getBoundingClientRect();
    return { options: [...(s?.options || [])].map((o) => o.textContent), value: s?.value, openerText: opener?.textContent.trim(), width: r && Math.round(r.width), shell: Boolean(shell), hidden: s ? getComputedStyle(s).display : null, parent: s?.parentElement?.className };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
