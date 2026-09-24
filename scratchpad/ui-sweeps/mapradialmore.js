// **The ring's More opens its menu beside the More button** (INBOX 394 (d),
// the owner: "when I press the more button on a mind map node tool radial,
// the dropdown menu doesnt appear next to it but the bottom right").
//
// A small map, a right-click on a topic (the ring), a real click on More.
// Pass means the node menu is open, on top at its middle, and its nearest
// edge is within 8px of the More sector's box, at three window sizes and
// with the topic in three places on screen (left, centre, near the right).
//
// **The More sector, not the More button** (the pie menu, 2026-09-24, and
// the owner the same day: "I clicked the more button on a mind map node and
// it appeared ip the top left middle section"). Every sector is a button the
// size of the whole ring, clipped to its wedge, so the button's own rect is
// the ring's square: its centre is the hole, and a menu "beside" it is beside
// the ring. The click goes to the middle of the More wedge and the gap is
// measured to the wedge's own box (`wbMapRadialSectorRect`). The keyboard
// door is checked too: the focus on More, Enter, the same menu in the same
// place (Enter used to reach the board and add a topic instead).
//
//   BASE=http://127.0.0.1:8795 SCRATCH=/tmp/mm PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/mapradialmore.js
const { boot } = require("./lib.js");

const SIZES = (process.env.SIZES || "1440x900,1184x760,947x608").split(",").map((s) => s.split("x").map(Number));
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

// The gap between two boxes: 0 when they touch or overlap on one axis and
// are side by side on the other, otherwise the distance between nearest edges.
function gap(a, b) {
  const dx = Math.max(0, b.left - a.right, a.left - b.right);
  const dy = Math.max(0, b.top - a.bottom, a.top - b.bottom);
  return Math.round(Math.hypot(dx, dy));
}

(async () => {
  for (const [vw, vh] of SIZES) {
    const { browser, page } = await boot({ viewport: { width: vw, height: vh } });
    await page.click('[data-tab="library"]');
    await page.waitForTimeout(500);
    await page.click('[data-target="library-view-whiteboard"]');
    await page.waitForTimeout(700);
    await page.evaluate(async () => {
      const b = await apiJson("/whiteboard/boards/import", {
        method: "POST",
        body: JSON.stringify({ format: "markdown", name: "Ring more " + Date.now(), content: "# Ring\n- Root\n  - One\n  - Two\n  - Three" }),
      });
      await openWhiteboardBoard(b.id);
    });
    await page.waitForTimeout(1500);
    for (const where of ["left", "centre", "right"]) {
      // Put the root where it is asked for, by panning, not by moving it.
      const pt = await page.evaluate((where) => {
        const c = document.getElementById("whiteboard-container");
        const cb = c.getBoundingClientRect();
        const root = wbMapIndex().roots[0];
        const el = document.querySelector(`.wb-object[data-id="${root.id}"]`);
        const r = el.getBoundingClientRect();
        const wantX = where === "left" ? cb.left + 120 : where === "right" ? cb.right - 160 : cb.left + cb.width / 2;
        const wantY = cb.top + cb.height / 2;
        const t = d3.zoomTransform(c);
        d3.select(c).call(wbZoom.transform, t.translate((wantX - (r.left + r.width / 2)) / t.k, (wantY - (r.top + r.height / 2)) / t.k));
        const r2 = el.getBoundingClientRect();
        return { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
      }, where);
      await page.waitForTimeout(300);
      await page.mouse.click(pt.x, pt.y, { button: "right" });
      await page.waitForTimeout(400);
      const more = await page.evaluate(() => {
        const b = document.getElementById("wb-radial-more");
        const s = b?._sector;
        const o = b?.closest(".wb-map-radial")?.getBoundingClientRect();
        if (!s || !o) return null;
        const m = (s.inner + s.outer) / 2;
        return { x: o.left + m * Math.cos(s.at), y: o.top + m * Math.sin(s.at) };
      });
      const tag = `${vw}x${vh} topic ${where}`;
      if (!more) { check(`${tag}: the ring opened with More`, false); continue; }
      await page.mouse.click(more.x, more.y);
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => {
        const menu = document.querySelector(".wb-ctx-menu");
        const btn = wbMapRadialSectorRect(document.getElementById("wb-radial-more"));
        if (!menu) return { none: true };
        const r = menu.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(20, r.height / 2));
        const box = (x) => ({ left: x.left, right: x.right, top: x.top, bottom: x.bottom });
        return { open: !menu.classList.contains("hidden") && r.height > 0, onTop: Boolean(at && menu.contains(at)), menu: box(r), btn: box(btn),
          fits: r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight };
      });
      if (m.none) { check(`${tag}: a menu exists`, false); continue; }
      const g = gap(m.menu, m.btn);
      const fmt = (b) => `${Math.round(b.left)},${Math.round(b.top)} to ${Math.round(b.right)},${Math.round(b.bottom)}`;
      check(`${tag}: More opens the menu on top`, m.open && m.onTop, `open ${m.open}, on top ${m.onTop}`);
      check(`${tag}: the menu is beside More`, m.open && g <= 8 && m.fits, `gap ${g}px; menu ${fmt(m.menu)}, More ${fmt(m.btn)}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      if (where !== "centre") continue;
      // The keyboard door: the ring again, the focus on More, Enter.
      await page.mouse.click(pt.x, pt.y, { button: "right" });
      await page.waitForTimeout(400);
      await page.evaluate(() => document.getElementById("wb-radial-more").focus());
      await page.keyboard.press("Enter");
      await page.waitForTimeout(400);
      const k = await page.evaluate(() => {
        const menu = document.querySelector(".wb-ctx-menu");
        const r = menu?.getBoundingClientRect();
        const s = wbMapRadialSectorRect(document.getElementById("wb-radial-more"));
        return { open: Boolean(menu && !menu.classList.contains("hidden") && r.height), menu: r && { left: r.left, right: r.right, top: r.top, bottom: r.bottom }, btn: s,
          topics: wbMapIndex().nodes.length };
      });
      check(`${tag}: Enter on More opens the same menu beside it`, k.open && gap(k.menu, k.btn) <= 8 && k.topics === 4,
        `open ${k.open}, gap ${k.open ? gap(k.menu, k.btn) : "-"}px, topics ${k.topics} (4 means Enter added none)`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      // The corner: More pressed with nothing measurable left to hang from
      // (the ring's box gone, a click at 0,0, as a keyboard click carries).
      // This is the route that clamped to 8,8, over the tab bar.
      await page.mouse.click(pt.x, pt.y, { button: "right" });
      await page.waitForTimeout(400);
      const c = await page.evaluate(() => {
        const ring = document.getElementById("wb-map-radial");
        ring.classList.add("hidden");
        document.getElementById("wb-radial-more").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        const menu = document.querySelector(".wb-ctx-menu");
        const r = menu.getBoundingClientRect();
        const id = wbMapIndex().roots[0].id;
        const n = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
        ring.classList.remove("hidden");
        return { open: !menu.classList.contains("hidden"), menu: { left: r.left, right: r.right, top: r.top, bottom: r.bottom }, node: { left: n.left, right: n.right, top: n.top, bottom: n.bottom } };
      });
      check(`${tag}: More with no box to hang from opens by its topic, not in the corner`,
        c.open && !(c.menu.left <= 8.5 && c.menu.top <= 8.5) && gap(c.menu, c.node) <= 8,
        `menu at ${Math.round(c.menu.left)},${Math.round(c.menu.top)}, gap to the topic ${gap(c.menu, c.node)}px`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
    await browser.close();
  }
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
