// INBOX 657: on a mind map, every left-rail tab opens its own panel, not
// only the Library. Clicks each visible tab and reads the panel title.
//   BASE=http://127.0.0.1:8790 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/maprail657.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1500);
  const map = await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    return apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Rail\n- Root\n  - A\n  - B", name: "Rail " + Date.now() }) });
  });
  // The reported path: a board open first, then the map picked from the
  // board picker (FROM=open goes straight in with openWhiteboardBoard).
  const board = await page.evaluate(async () => apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Rail board " + Date.now() }) }));
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, process.env.FROM === "open" ? map.id : board.id);
  await page.waitForTimeout(1200);
  if (process.env.FROM !== "open") {
    await page.evaluate(async (id) => {
      const sel = document.getElementById("wb-board-select");
      if (![...sel.options].some((o) => o.value === String(id))) sel.add(new Option("map", String(id)));
      sel.value = String(id);
      sel.dispatchEvent(new Event("change"));
    }, map.id);
    await page.waitForTimeout(1500);
  }
  await page.evaluate(() => wbCloseSidebar());
  await page.waitForTimeout(400);
  let fails = 0;
  const tabs = await page.$$eval(".wb-side-tab", (bs) => bs.map((b) => ({ id: b.id, hidden: b.hidden || getComputedStyle(b).display === "none" })));
  console.log("tabs", JSON.stringify(tabs));
  for (const t of tabs.filter((t) => !t.hidden)) {
    await page.click(`#${t.id}`).catch((e) => console.log("click failed", t.id, e.message.split("\n")[0]));
    await page.waitForTimeout(500);
    const st = await page.evaluate((id) => ({ sel: document.getElementById(id).getAttribute("aria-selected"), title: document.getElementById("wb-sidebar-title")?.textContent.trim(), open: !document.getElementById("wb-sidebar-panel").classList.contains("hidden") }), t.id);
    const ok = st.sel === "true" && st.open;
    if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${t.id} -> ${JSON.stringify(st)}`);
  }
  console.log(fails ? `FAIL ${fails}` : "PASS all");
  await browser.close();
})();
