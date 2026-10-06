// dropplace probe: what sits over the board's canvas (the chrome a "middle of
// the view" has to leave out), with the Library panel open and shut.
const { openBoard } = require("./wb1005-lib.js");
(async () => {
  for (const type of ["board", "map"]) {
    const { browser, page } = await openBoard({ type, title: "dp-probe" });
    for (const open of [false, true]) {
      if (open) await page.evaluate(() => wbOpenSidebar("library"));
      await page.waitForTimeout(1200);
      const info = await page.evaluate(() => {
        const c = document.getElementById("whiteboard-container");
        const cr = c.getBoundingClientRect();
        const canvasy = new Set([c, document.getElementById("wb-html-layer"), document.getElementById("wb-svg-layer"), document.getElementById("wb-overlay-layer")]);
        const found = new Map();
        for (let x = cr.left + 2; x < cr.right; x += 12) {
          for (let y = cr.top + 2; y < cr.bottom; y += 12) {
            let el = document.elementFromPoint(x, y);
            if (!el || canvasy.has(el) || el.closest("#wb-html-layer, #wb-svg-layer, #wb-overlay-layer")) continue;
            // The outermost positioned box under the container (or beside it).
            let top = el;
            while (top.parentElement && top.parentElement !== c && top.parentElement !== c.parentElement && top.parentElement !== document.body) top = top.parentElement;
            const key = top.id ? "#" + top.id : top.className?.baseVal ?? String(top.className).split(" ").slice(0, 2).join(".");
            if (!found.has(key)) {
              const r = top.getBoundingClientRect();
              found.set(key, [r.left, r.top, r.right, r.bottom].map(Math.round).join(","));
            }
          }
        }
        return { container: [cr.left, cr.top, cr.right, cr.bottom].map(Math.round).join(","), covers: Object.fromEntries(found) };
      });
      console.log(type, open ? "panel open" : "panel shut", JSON.stringify(info));
    }
    await browser.close();
  }
})();
