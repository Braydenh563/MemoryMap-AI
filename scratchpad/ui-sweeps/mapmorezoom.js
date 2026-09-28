// **The ring's More menu under the owner's scale** (INBOX 421 a, the third
// report from the desktop window: the topic menu at the window's top-left,
// with large text on screen). mapradialmore.js only ever ran at zoom 100 and
// device scale 1; this runs the same click at the app's own zoom (Settings >
// Appearance, which scales the root font-size) crossed with a device scale
// (Windows display scaling in WebView2), in two window sizes, and asserts the
// menu is beside the More sector: within 16px of it horizontally, sharing
// some of its height, inside the window, and never in its top-left 40px.
//
//   BASE=http://127.0.0.1:8801 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     ZOOMS=100,115,130 DPRS=1,1.25,1.5 SIZES=1440x900,2000x1366 \
//     node scratchpad/ui-sweeps/mapmorezoom.js
const { boot } = require("./lib.js");

const SIZES = (process.env.SIZES || "1440x900,2000x1366").split(",").map((s) => s.split("x").map(Number));
const ZOOMS = (process.env.ZOOMS || "100,115,130").split(",").map(Number);
const DPRS = (process.env.DPRS || "1,1.25,1.5").split(",").map(Number);
const WHERE = (process.env.WHERE || "left,centre,right,low").split(",");
const results = [];
function check(label, ok, detail) {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}
const fmt = (b) => `${Math.round(b.left)},${Math.round(b.top)} to ${Math.round(b.right)},${Math.round(b.bottom)}`;

(async () => {
  for (const dpr of DPRS) {
    for (const [vw, vh] of SIZES) {
      //: SIZES are the window in *device* pixels, as Windows reports it; the
      //: page sees that divided by the display scale, which is what makes a
      //: 1440x900 window at 150% a 960x600 page. A deviceScaleFactor alone
      //: over an unchanged CSS viewport only sharpens the same layout.
      const cw = Math.round(vw / dpr), ch = Math.round(vh / dpr);
      const { browser, page } = await boot({ viewport: { width: cw, height: ch }, deviceScaleFactor: dpr });
      page.on("console", (m) => { if (m.type() === "warning" && m.text().includes("[whiteboard]")) console.log("  WARN", m.text()); });
      await page.click('[data-tab="library"]');
      await page.waitForTimeout(500);
      await page.click('[data-target="library-view-whiteboard"]');
      await page.waitForTimeout(700);
      await page.evaluate(async () => {
        const b = await apiJson("/whiteboard/boards/import", {
          method: "POST",
          body: JSON.stringify({ format: "markdown", name: "Ring zoom " + Date.now(), content: "# Ring\n- Root\n  - One\n  - Two\n  - Three" }),
        });
        await openWhiteboardBoard(b.id);
      });
      await page.waitForTimeout(1500);
      for (const zoom of ZOOMS) {
        await page.evaluate((z) => setZoom(z), zoom);
        await page.waitForTimeout(500);
        for (const where of WHERE) {
          const tag = `dpr ${dpr} ${vw}x${vh} (page ${cw}x${ch}) zoom ${zoom} topic ${where}`;
          const pt = await page.evaluate((where) => {
            const c = document.getElementById("whiteboard-container");
            const cb = c.getBoundingClientRect();
            const root = wbMapIndex().roots[0];
            const el = document.querySelector(`.wb-object[data-id="${root.id}"]`);
            const r = el.getBoundingClientRect();
            const wantX = where === "left" ? cb.left + 120 : where === "right" ? cb.right - 160 : cb.left + cb.width / 2;
            const wantY = where === "low" ? cb.bottom - 140 : cb.top + cb.height / 2;
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
            const sector = wbMapRadialSectorRect(b);
            //: What the browser hit-tests as More, found by asking it point
            //: by point, so the sector box the menu hangs from is checked
            //: against the drawn wedge rather than against itself.
            let hit = null;
            for (let y = sector.top - 30; y <= sector.bottom + 30; y += 2) {
              for (let x = sector.left - 30; x <= sector.right + 30; x += 2) {
                if (!document.elementFromPoint(x, y)?.closest("#wb-radial-more")) continue;
                hit = hit || { left: x, top: y, right: x, bottom: y };
                hit.left = Math.min(hit.left, x); hit.right = Math.max(hit.right, x);
                hit.top = Math.min(hit.top, y); hit.bottom = Math.max(hit.bottom, y);
              }
            }
            return { x: o.left + m * Math.cos(s.at), y: o.top + m * Math.sin(s.at), sector, hit, ring: { left: o.left, top: o.top, right: o.right, bottom: o.bottom } };
          });
          if (!more) { check(`${tag}: the ring opened with More`, false); continue; }
          const drift = more.hit ? Math.max(...["left", "top", "right", "bottom"].map((k) => Math.abs(more.hit[k] - more.sector[k]))) : Infinity;
          check(`${tag}: the More box is the drawn wedge`, drift <= 6, `computed ${fmt(more.sector)}, hit-tested ${more.hit ? fmt(more.hit) : "none"}, worst edge ${Math.round(drift)}px`);
          await page.mouse.click(more.x, more.y);
          await page.waitForTimeout(400);
          const m = await page.evaluate(() => {
            const menu = document.querySelector(".wb-ctx-menu");
            if (!menu || menu.classList.contains("hidden")) return null;
            const r = menu.getBoundingClientRect();
            return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, sh: menu.scrollHeight, ch: menu.clientHeight, ih: innerHeight, iw: innerWidth, zoom: localStorage.getItem("zoom") };
          });
          if (!m) { check(`${tag}: the menu opened`, false, `sector ${fmt(more.sector)}`); continue; }
          const s = more.sector;
          const dx = Math.max(0, s.left - m.right, m.left - s.right);
          const vOver = Math.min(m.bottom, s.bottom) - Math.max(m.top, s.top);
          const cornered = m.left < 40 && m.top < 40;
          const hOver = Math.min(m.right, s.right) - Math.max(m.left, s.left);
          const covers = hOver > 1 && vOver > 1;
          const fits = m.top >= 0 && m.bottom <= m.ih && m.left >= 0 && m.right <= m.iw;
          //: Beside means touching More on one axis (within 16px) and sharing
          //: some of it on the other: on its left or right sharing some of
          //: its height, or, where neither side of it has room (a narrow
          //: page), above or below it sharing some of its width.
          const dy = Math.max(0, s.top - m.bottom, m.top - s.bottom);
          const beside = (dx <= 16 && vOver > 0) || (dy <= 16 && hOver > 0);
          const rel = dx <= 16 && vOver > 0 ? "side" : dy <= 16 && hOver > 0 ? (m.top >= s.bottom ? "below" : "above") : "apart";
          check(`${tag}: menu beside More`, beside && !covers && !cornered && fits,
            `${rel}, dx ${Math.round(dx)} dy ${Math.round(dy)}${covers ? " COVERS More" : ""}, zoom now ${m.zoom}, menu ${fmt(m)} (h ${Math.round(m.bottom - m.top)}, scroll ${m.sh}/${m.ch}), More ${fmt(s)}, window ${m.iw}x${m.ih}`);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(150);
          await page.keyboard.press("Escape");
          await page.waitForTimeout(200);
        }
        //: The flat menu (a right-click on a multi-selection) opens at the
        //: pointer: the other placement a map uses, checked under the same
        //: scale for the same corner.
        const kidPts = await page.evaluate(() => {
          const idx = wbMapIndex();
          wbCloseMapRadial?.();
          //: The two children brought to the canvas's middle first: with the
          //: root centred they are off the right of a narrow page.
          const kids = idx.nodes.filter((n) => n.id !== idx.roots[0].id).slice(0, 2);
          const c = document.getElementById("whiteboard-container");
          const cb = c.getBoundingClientRect();
          const a = document.querySelector(`.wb-object[data-id="${kids[0].id}"]`).getBoundingClientRect();
          const b = document.querySelector(`.wb-object[data-id="${kids[1].id}"]`).getBoundingClientRect();
          const t = d3.zoomTransform(c);
          const mx = (a.left + b.right) / 2, my = (a.top + b.bottom) / 2;
          d3.select(c).call(wbZoom.transform, t.translate((cb.left + cb.width / 2 - mx) / t.k, (cb.top + cb.height / 2 - my) / t.k));
          return idx.nodes.filter((n) => n.id !== idx.roots[0].id).slice(0, 2).map((n) => {
            const r = document.querySelector(`.wb-object[data-id="${n.id}"]`).getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          });
        });
        //: Two topics selected, then the menu opened through the route a
        //: right-click takes (`wbOpenContextMenuFor`) at two points: a topic's
        //: middle, and the page's far corner, where it has to flip. The
        //: panels over a small page cover the topics, so the gesture itself
        //: is not what is measured here; the placement is.
        for (const at of ["topic", "corner"]) {
          const fm = await page.evaluate(({ at, p }) => {
            const idx = wbMapIndex();
            const kids = idx.nodes.filter((n) => n.id !== idx.roots[0].id).slice(0, 2);
            wbHandleItemClick("object", kids[0].id, { shiftKey: false });
            wbHandleItemClick("object", kids[1].id, { shiftKey: true });
            const pt = at === "topic" ? p : { x: innerWidth - 12, y: innerHeight - 12 };
            wbOpenContextMenuFor("object", kids[1].id, pt.x, pt.y);
            const menu = document.querySelector(".wb-ctx-menu");
            if (!menu || menu.classList.contains("hidden")) return { pt, selected: wbMultiSelection.size };
            const r = menu.getBoundingClientRect();
            return { pt, left: r.left, top: r.top, right: r.right, bottom: r.bottom, iw: innerWidth, ih: innerHeight, selected: wbMultiSelection.size };
          }, { at, p: kidPts[1] });
          const ftag = `dpr ${dpr} ${vw}x${vh} (page ${cw}x${ch}) zoom ${zoom} flat menu at the ${at}`;
          if (fm.left === undefined) check(`${ftag}: opened`, false, `selected ${fm.selected}`);
          else {
            const far = Math.hypot(Math.max(0, fm.left - fm.pt.x, fm.pt.x - fm.right), Math.max(0, fm.top - fm.pt.y, fm.pt.y - fm.bottom));
            const inside = fm.left >= 0 && fm.top >= 0 && fm.right <= fm.iw && fm.bottom <= fm.ih;
            check(`${ftag}: at the pointer, in the window`, far <= 16 && inside && !(fm.left < 40 && fm.top < 40),
              `pointer ${Math.round(fm.pt.x)},${Math.round(fm.pt.y)}, menu ${fmt(fm)}, ${Math.round(far)}px from it, ${fm.selected} selected`);
          }
          await page.evaluate(() => wbCloseContextMenu());
        }
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(200);
      }
      await page.evaluate(() => setZoom(100));
      await browser.close();
    }
  }
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
