const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => { localStorage.setItem("graph-curved", "0"); localStorage.setItem("graph-labels", "0"); });
  await page.evaluate(() => document.querySelector('[data-tab="graph"]')?.click());
  await page.waitForTimeout(4500);
  const out = await page.evaluate(() => {
    const box = document.getElementById("graph-curved");
    const canvas = document.getElementById("graph-canvas");
    const ctx = canvas.getContext("2d");
    const s = (typeof gcTab !== "undefined" ? gcTab : null);
    const t = s?.transform || { x: 0, y: 0, k: 1 };
    const dpr = s?.dpr || 1;
    const edges = (s?.edges || []).filter((e) => e.source?.x != null && Math.hypot(e.target.x - e.source.x, e.target.y - e.source.y) > 150).slice(0, 6);
    const res = [];
    for (const e of edges) {
      const a = e.source, b = e.target;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const px = (mx * t.k + t.x) * dpr, py = (my * t.k + t.y) * dpr;
      const d = ctx.getImageData(Math.round(px) - 2, Math.round(py) - 2, 5, 5).data;
      let maxA = 0; for (let i = 3; i < d.length; i += 4) maxA = Math.max(maxA, d[i]);
      // also the bowed midpoint
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const side = String(a.id) < String(b.id) ? 1 : -1; const bow = Math.min(len * 0.14, 48) * side;
      const cx = mx - (dy / len) * bow * 0.5, cy = my + (dx / len) * bow * 0.5;
      const qx = (cx * t.k + t.x) * dpr, qy = (cy * t.k + t.y) * dpr;
      const d2 = ctx.getImageData(Math.round(qx) - 2, Math.round(qy) - 2, 5, 5).data;
      let maxB = 0; for (let i = 3; i < d2.length; i += 4) maxB = Math.max(maxB, d2[i]);
      res.push({ kind: e.kind, len: Math.round(len), straightMidAlpha: maxA, bowedMidAlpha: maxB });
    }
    return { checked: box?.checked, stored: localStorage.getItem("graph-curved"), hasState: Boolean(s), n: (s?.edges || []).length, res };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
