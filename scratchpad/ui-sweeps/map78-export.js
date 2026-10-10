// Brief 78 row 8 (MINDMAP_PLAN 15): a topic's effect and its Phosphor icon
// reach the exported picture. Four topics side by side (plain, shadow, glow,
// a star icon); the SVG is built (wbBuildExportSvg) and rasterised
// (wbRasterizeSvg), the PNG written to OUT, and the sample points printed in
// PNG pixels for scratchpad/pngpixel.py to read.
// Usage: BASE=http://127.0.0.1:8828 OUT=/tmp/x node map78-export.js
const { boot } = require("./lib.js");
const fs = require("fs");
const OUT = process.env.OUT || ".";
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(() => { const d = document.getElementById("recovery-key-dialog"); if (d && d.open) d.close(); });
  await page.evaluate(async () => { await switchTab("library"); await ensureModule("library"); document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click(); });
  await page.waitForTimeout(1200);
  await page.evaluate(() => wbShowBoardsLanding()); await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById("wb-boards-new-map").click());
  await page.waitForTimeout(2500);
  const r = await page.evaluate(async () => {
    document.activeElement?.blur();
    await wbMapSetLayout("free");
    const root = wbMapIndex().roots[0];
    const made = [];
    for (let i = 0; i < 4; i++) made.push(await wbMapAddChild(root.id));
    document.activeElement?.blur();
    const looks = [{}, { effect: "shadow" }, { effect: "glow" }, { icon: "star" }];
    made.forEach((o, i) => { o.x = 0 + i * 300; o.y = 400; o.data = { ...o.data, content: `Topic ${i}`, ...looks[i] }; wbSaveObject(o); });
    root.x = 0; root.y = 0; wbSaveObject(root);
    renderWhiteboardNow();
    await new Promise((res) => setTimeout(res, 800));
    const { svg, width, height } = wbBuildExportSvg("board", { transparent: false });
    const vb = (svg.match(/viewBox="([^"]+)"/) || [])[1].split(/\s+/).map(Number);
    const blob = await wbRasterizeSvg(svg, width, height, "image/png");
    const b64 = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(",")[1]); fr.readAsDataURL(blob); });
    const k = width / vb[2];
    const px = (x, y) => [Math.round((x - vb[0]) * k), Math.round((y - vb[1]) * k)];
    const pts = made.map((o) => { const s = wbMapNodeSize(o); return { below: px(o.x + s.w / 2, o.y + s.h + 4), left: px(o.x - 6, o.y + s.h / 2), icon: px(o.x + 22, o.y + 12), effect: o.data.effect || null, icon_: o.data.icon || null, drawnEffect: document.querySelector(`.wb-object[data-id="${o.id}"]`)?.dataset.effect || null }; });
    return { b64, pts, filters: (svg.match(/filter="url\(#[^)]+\)"/g) || []).length, images: (svg.match(/<image href="data:image\/png/g) || []).length, width, height };
  });
  fs.writeFileSync(`${OUT}/map-export.png`, Buffer.from(r.b64, "base64"));
  delete r.b64;
  console.log(JSON.stringify(r));
  await browser.close();
})();
