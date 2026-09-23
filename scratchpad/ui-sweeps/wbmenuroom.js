// **A whiteboard menu is as tall as what it holds, up to the window**
// (INBOX 396, the owner: "the arrange topbar dropdown menu is very and overly
// short in height for how many items it contains", with a screenshot of
// Arrange at about 230px with a scrollbar and two rows showing).
//
// Every top-bar menu and the context bar's More menu, opened by a real click
// on a board with a text box selected, at three window sizes. Pass means:
//   - the menu is open and on top at its own middle;
//   - it scrolls only when the window cannot hold it: its visible height is
//     its content height, or it reaches to within 8px of the window's edge on
//     the side it opened toward (the room there is all used);
//   - its nearest edge is within 8px of the button that opened it.
//
//   BASE=http://127.0.0.1:8795 SCRATCH=/tmp/mm PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/wbmenuroom.js
const { boot } = require("./lib.js");

const SIZES = (process.env.SIZES || "1440x900,1184x760,947x608").split(",").map((s) => s.split("x").map(Number));
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

(async () => {
  for (const [vw, vh] of SIZES) {
    const { browser, page } = await boot({ viewport: { width: vw, height: vh } });
    await page.click('[data-tab="library"]');
    await page.waitForTimeout(500);
    await page.click('[data-target="library-view-whiteboard"]');
    await page.waitForTimeout(700);
    const id = await page.evaluate(async () => {
      const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Menu room " + Date.now() }) });
      await openWhiteboardBoard(b.id);
      const o = await apiJson("/whiteboard/objects", {
        method: "POST",
        body: JSON.stringify({ kind: "text", board_id: b.id, x: 200, y: 220, width: 220, height: 90, data: { content: "A text box" } }),
      });
      await fetchWhiteboardState();
      renderWhiteboardNow();
      return o.id;
    });
    await page.waitForTimeout(700);
    const box = await (await page.$(`.wb-object[data-id="${id}"]`)).boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(400);

    const toggles = await page.evaluate(() => [...document.querySelectorAll("[data-wb-menu-toggle]")]
      .map((t, i) => {
        const r = t.getBoundingClientRect();
        t.dataset.sweepIndex = String(i);
        return { i, label: (t.getAttribute("aria-label") || t.textContent).trim(), x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width };
      })
      .filter((t) => t.w > 0));
    for (const t of toggles) {
      await page.mouse.click(t.x, t.y);
      await page.waitForTimeout(350);
      const m = await page.evaluate((i) => {
        const toggle = document.querySelector(`[data-sweep-index="${i}"]`);
        const id = toggle.getAttribute("aria-controls");
        const menu = (id && document.getElementById(id)) || toggle.closest(".wb-board-menu-wrap")?.querySelector(".wb-board-menu");
        if (!menu) return { none: true };
        const r = menu.getBoundingClientRect();
        const b = toggle.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const below = r.top >= b.top;
        return {
          open: !menu.classList.contains("hidden") && r.height > 0,
          onTop: Boolean(at && menu.contains(at)),
          h: Math.round(r.height), content: menu.scrollHeight, client: menu.clientHeight,
          top: Math.round(r.top), bottom: Math.round(r.bottom),
          toWindow: Math.round(below ? window.innerHeight - r.bottom : r.top),
          gap: Math.round(below ? r.top - b.bottom : b.top - r.bottom),
          overlapsOpener: r.top < b.bottom && r.bottom > b.top,
        };
      }, t.i);
      const tag = `${vw}x${vh} ${t.label}`;
      if (m.none) { check(`${tag}: has a menu`, false); continue; }
      const scrolls = m.content > m.client + 1;
      check(`${tag}: opens on top`, m.open && m.onTop, `open ${m.open}, on top ${m.onTop}`);
      // 10 rather than the 8px margin itself: the menu is placed on whole
      // pixels, so a menu using all of its room reads 8 or 9 here.
      check(`${tag}: as tall as it needs, up to the window`, !scrolls || m.toWindow <= 10,
        `${m.h}px shown of ${m.content}, ${m.toWindow}px of window left on its side`);
      check(`${tag}: beside its button`, !m.overlapsOpener && m.gap >= -1 && m.gap <= 8, `gap ${m.gap}px, ${m.top}..${m.bottom}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
    await browser.close();
  }
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
