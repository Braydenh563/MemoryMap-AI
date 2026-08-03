const { open } = require("./drive");
(async () => {
  const { browser, page } = await open({ width: 1440, height: 900 });
  await page.waitForTimeout(1800);
  for (const t of ["dashboard","notes","chat","graph","timeline","library","reminders"]) {
    await page.click(`#tab-btn-${t}`);
    await page.waitForTimeout(900);
    const bad = await page.evaluate(() => {
      const barTop = document.getElementById("status-bar").getBoundingClientRect().top;
      const out = [];
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        if (cs.position !== "fixed" && cs.position !== "sticky") continue;
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 || b.height === 0) continue;
        if (b.bottom > barTop + 1) {
          out.push({ el: el.tagName + (el.id ? "#"+el.id : "."+String(el.className).split(" ")[0]),
                     pos: cs.position, bottom: Math.round(b.bottom), over: Math.round(b.bottom - barTop), z: cs.zIndex });
        }
      }
      return out;
    });
    console.log(t.padEnd(10), bad.length ? JSON.stringify(bad) : "clean");
  }
  await browser.close();
})();
