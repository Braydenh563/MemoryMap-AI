// INBOX 904 B27: in the packaged app Settings, Packages offers no Remove on
// "Desktop window (pywebview)" (and the selection bar does not count it for
// removal). The sandbox is not a frozen build, so GET /extras is answered with
// the frozen reading (`removable: false`, `installed: true` on desktop); the
// server side is tests/test_extras_desktop_locked.py.
// Usage: BASE=http://127.0.0.1:8783 node extraslock904.js
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, ctx, page } = await boot();
  await ctx.route(/\/extras$/, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    for (const e of body.extras) {
      if (e.id === "desktop") { e.installed = true; e.removable = false; e.locked = "The desktop window is how the packaged app opens, so it stays."; }
      if (e.id === "voice") { e.installed = true; e.removable = true; e.locked = ""; }
    }
    await route.fulfill({ response: res, json: body });
  });
  await page.evaluate(() => openSettingsModal("extras"));
  await page.waitForSelector("#extra-row-desktop, #extras-list li", { timeout: 15000 });
  await page.waitForTimeout(1500);
  const menu = async (id) => {
    await page.evaluate((i) => { const row = document.querySelector(`#extra-row-${i}`); row.scrollIntoView({ block: "center" }); row.querySelector(".kebab-opener").click(); }, id);
    await page.waitForTimeout(400);
    const rows = await page.evaluate((i) => [...document.querySelectorAll(`#extra-row-${i} .action-menu button, .action-menu:not(.hidden) button`)].map((b) => b.textContent.trim()), id);
    await page.keyboard.press("Escape");
    return [...new Set(rows)];
  };
  const desktop = await menu("desktop");
  const voice = await menu("voice");
  console.log("desktop menu", JSON.stringify(desktop), "voice menu", JSON.stringify(voice));
  ok("desktop window: Reinstall only", desktop.some((r) => /Reinstall/.test(r)) && !desktop.some((r) => /Remove/.test(r)), JSON.stringify(desktop));
  ok("voice notes: Reinstall and Remove", voice.some((r) => /Reinstall/.test(r)) && voice.some((r) => /Remove/.test(r)), JSON.stringify(voice));
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
