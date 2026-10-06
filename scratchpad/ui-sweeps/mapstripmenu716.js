// INBOX 716 (3): a selected topic's floating bar must not draw over an open
// board menu (View, Edit, Insert...). Opens each top-bar menu with a topic
// selected and asks elementFromPoint, at every point where the menu and the
// bar overlap, which of the two answers.
//   BASE=http://127.0.0.1:8862 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapstripmenu716.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const skip = await page.$("#recovery-key-skip"); if (skip && await skip.isVisible()) { await skip.click(); await page.waitForTimeout(500); }
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1500);
  const map = await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    return apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Strip\n- Root\n  - Alpha\n  - Beta", name: "Strip " + Date.now() }) });
  });
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id);
  await page.waitForTimeout(1500);
  // Selected topic near the top of the canvas so its bar sits under the menus.
  const root = await page.evaluate((name) => wbMapIndex().nodes.find((n) => String(wbMapLabel(n)).trim() === name)?.id, process.env.NODE || "Root");
  let fails = 0;
  for (const menu of ["wb-view-menu", "wb-edit-menu", "wb-insert-menu", "wb-arrange-menu", "wb-board-menu"]) {
    await page.keyboard.press("Escape");
    await page.click(`.wb-object[data-id="${root}"]`); await page.waitForTimeout(500);
    const res = await page.evaluate(async ([menuId, process_debug]) => {
      const strip = document.getElementById("wb-map-strip");
      const toggle = document.querySelector(`[aria-controls="${menuId}"]`);
      if (!strip || strip.classList.contains("hidden") || !toggle) return { skip: "no strip or toggle" };
      toggle.click();
      await new Promise((r) => setTimeout(r, 400));
      const menu = document.getElementById(menuId);
      if (!menu || menu.classList.contains("hidden")) return { skip: "menu did not open" };
      const m = menu.getBoundingClientRect();
      const s = strip.getBoundingClientRect();
      const x0 = Math.max(m.left, s.left), x1 = Math.min(m.right, s.right);
      const y0 = Math.max(m.top, s.top), y1 = Math.min(m.bottom, s.bottom);
      if (x1 <= x0 || y1 <= y0) return { overlap: false, menu: [m.left, m.top, m.right, m.bottom].map(Math.round), strip: [s.left, s.top, s.right, s.bottom].map(Math.round) };
      let strips = 0, menus = 0, n = 0;
      for (let x = x0 + 2; x < x1; x += 6) for (let y = y0 + 2; y < y1; y += 6) {
        n++;
        const hit = document.elementFromPoint(x, y);
        if (hit && strip.contains(hit)) strips++;
        else if (hit && menu.contains(hit)) menus++;
      }
      const chain = (el) => { const out = []; for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const c = getComputedStyle(e); if (c.zIndex !== "auto" || c.position !== "static" && c.isolation === "isolate") out.push((e.id ? "#" + e.id : e.className ? "." + String(e.className).split(" ")[0] : e.tagName) + " z=" + c.zIndex + " " + c.position); } return out; };
      return { overlap: true, ...(process_debug ? { menuChain: chain(menu), stripChain: chain(strip) } : {}), points: n, stripWins: strips, menuWins: menus };
    }, [menu, !!process.env.DEBUG]);
    const bad = res.overlap && res.stripWins > 0;
    if (bad) fails++;
    console.log(menu, JSON.stringify(res), res.overlap ? (bad ? "FAIL strip over menu" : "PASS") : "(no overlap here)");
  }
  await page.screenshot({ path: (process.env.SCRATCH || ".") + "/shots/mapstripmenu716.png" });
  console.log(fails ? "FAIL" : "PASS");
  await browser.close();
})();
