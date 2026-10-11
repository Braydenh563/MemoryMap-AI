// INBOX 823: a tool's kind popover (Shapes: line or arrow, ...) never sits
// under, or across, its own options bar (#wb-context, tool group).
const { boot, openBoardsTab } = require("./lib.js");
(async () => {
  let fails = 0;
  for (const [W, H] of [[1440, 900], [390, 844]]) {
    const { browser, page } = await boot({ viewport: { width: W, height: H } });
    await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
    await openBoardsTab(page);
    await page.evaluate(async () => {
      const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Tools " + Date.now() }) });
      await openWhiteboardBoard(b.id); await new Promise((r) => setTimeout(r, 1500));
    });
    const R = (e) => e && (({ left, top, right, bottom }) => ({ left, top, right, bottom }))(e.getBoundingClientRect());
    for (const tool of ["line", "rect"]) {
      const open = async () => { if (!(await page.isVisible("#wb-shape-toggle"))) { await page.click("#wb-tools-opener"); await page.waitForTimeout(500); } };
      await open();
      await page.click("#wb-shape-toggle", { button: "right" }); await page.waitForTimeout(300);
      await page.click(`#wb-shape-menu [data-tool="${tool}"]`); await page.waitForTimeout(500);
      await open();
      await page.click("#wb-shape-toggle", { button: "right" }); await page.waitForTimeout(400);
      const r = await page.evaluate(async (tool) => {
        const wait = (ms) => new Promise((r) => setTimeout(r, ms));
        const bar = document.getElementById("wb-context");
        const menu = document.getElementById("wb-shape-menu");
        const box = (e) => { const b = e.getBoundingClientRect(); return { left: b.left, top: b.top, right: b.right, bottom: b.bottom, w: b.width, h: b.height }; };
        const m = box(menu), c = box(bar);
        const visible = !bar.classList.contains("hidden") && c.w > 0;
        const inter = Math.max(0, Math.min(m.right, c.right) - Math.max(m.left, c.left)) * Math.max(0, Math.min(m.bottom, c.bottom) - Math.max(m.top, c.top));
        const cx = (Math.max(m.left, c.left) + Math.min(m.right, c.right)) / 2, cy = (Math.max(m.top, c.top) + Math.min(m.bottom, c.bottom)) / 2;
        const topEl = inter ? document.elementFromPoint(cx, cy) : null;
        const zMenu = getComputedStyle(menu).zIndex, zBar = getComputedStyle(bar).zIndex;
        return { tool, barVisible: visible, menuOpen: !menu.classList.contains("hidden"), inter: Math.round(inter), menu: [m.left, m.top, m.right, m.bottom].map(Math.round), bar: [c.left, c.top, c.right, c.bottom].map(Math.round), onTop: topEl ? (menu.contains(topEl) ? "menu" : bar.contains(topEl) ? "bar" : topEl.className) : null, zMenu, zBar };
      }, tool);
      console.log(W, JSON.stringify(r));
      if (r.menuOpen && r.barVisible && r.inter > 0) fails++;
      await page.keyboard.press("Escape"); await page.waitForTimeout(200);
    }
    await browser.close();
  }
  console.log(fails ? `FAIL: ${fails}` : "PASS");
  process.exit(fails ? 1 : 0);
})();
