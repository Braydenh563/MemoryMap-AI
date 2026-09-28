// The companion's menu, extended (the owner: "sub-sections ... a quick link
// to the profile/personas/appearences tab, toggling ... masculine/feminine,
// which companion is displayed"). Opens it by a right-click, lists its rows,
// opens each flyout and checks it sits inside the window beside its row,
// then picks Atlas look > Feminine, Companion > You and Settings >
// Personas and checks each took. Shoots the menu with the Companion flyout
// open to $SCRATCH/shots/companion-menu-<TAG>.png. Exits 1 on a miss.
const { boot } = require("./lib.js");

(async () => {
  const W = Number(process.env.W || 1440);
  const { browser, page, OUT } = await boot({ viewport: { width: W, height: 900 } });
  await page.evaluate(() => { localStorage.setItem("atlas-look", "masculine"); const b = document.getElementById("avatar-buddy"); b.value = "atlas"; b.dispatchEvent(new Event("change", { bubbles: true })); });
  await page.waitForTimeout(1500);
  const open = async () => {
    await page.keyboard.press("Escape");
    await page.evaluate(() => { clearTimeout(nmb.timer); nameMarkBuddyMoveTo(document.getElementById("nm-buddy"), { kind: "air", pose: "float", x: innerWidth - 300, y: 300 }, true); nmb.placeTimer = 1; });
    await page.waitForTimeout(200);
    const f = await page.evaluate(() => { const r = document.querySelector("#nm-buddy .nm-buddy-face").getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.click(f[0], f[1], { button: "right" });
    await page.waitForTimeout(300);
  };
  let bad = false;
  await open();
  const rows = await page.evaluate(() => [...nmb.menu.querySelectorAll(":scope > .menu-item, :scope > .menu-group > .menu-item")].map((b) => b.textContent.trim()));
  console.log("rows:", rows.join(" | "));
  for (const want of ["Companion", "Atlas look", "Size", "Settings", "Hide"]) if (!rows.some((r) => r.startsWith(want))) { bad = true; console.log("missing row", want); }
  for (const group of ["Companion", "Atlas look", "Size", "Settings"]) {
    await open();
    const trigger = page.locator(".menu-item.has-submenu", { hasText: group }).first();
    await trigger.click();
    await page.waitForTimeout(250);
    const r = await page.evaluate((group) => {
      const t = [...document.querySelectorAll(".menu-item.has-submenu")].find((b) => b.textContent.includes(group));
      const sub = [...document.querySelectorAll(".action-menu.submenu")].find((m) => !m.classList.contains("hidden"));
      if (!sub) return null;
      const a = t.getBoundingClientRect();
      const b = sub.getBoundingClientRect();
      return { items: [...sub.querySelectorAll(".menu-item")].map((i) => i.textContent.trim()), inside: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight, beside: Math.abs(b.top - a.top) < 40 && (Math.abs(b.left - a.right) < 20 || Math.abs(a.left - b.right) < 20) };
    }, group);
    console.log(group, JSON.stringify(r));
    if (!r || !r.inside || !r.beside || r.items.length < 3) bad = true;
    if (group === "Companion") await page.screenshot({ path: `${OUT}/companion-menu-${process.env.TAG || "now"}.png`, clip: { x: W - 760, y: 200, width: 760, height: 520 } });
  }
  const pick = async (group, item) => {
    await open();
    await page.locator(".menu-item.has-submenu", { hasText: group }).first().click();
    await page.waitForTimeout(200);
    await page.locator(".action-menu.submenu:not(.hidden) .menu-item", { hasText: item }).first().click();
    await page.waitForTimeout(600);
  };
  await pick("Atlas look", "Feminine");
  const look = await page.evaluate(() => document.querySelector("#nm-buddy svg.atl-layer")?.dataset.atlasLook || "none");
  console.log("look after Feminine:", look);
  if (look !== "feminine") bad = true;
  await pick("Companion", "You");
  const who = await page.evaluate(() => localStorage.getItem("avatar-buddy"));
  console.log("companion after You:", who);
  if (who !== "me") bad = true;
  await pick("Settings", "Personas");
  const pane = await page.evaluate(() => !document.getElementById("settings-modal").classList.contains("hidden") && !document.getElementById("settings-personas").classList.contains("hidden"));
  console.log("Personas open:", pane);
  if (!pane) bad = true;
  console.log(bad ? "FAIL" : "PASS");
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
