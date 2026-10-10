// **The graph stays framed when its card changes size** (INBOX 613). Pass: offX near 0 at every step (the dots' middle; since 2026-10-10 a fit centres the drawing, names included, `gcBalanceFit`, so the names' overhang leaves offX within about 20; graphfitmargins.js measures the drawing itself); base -200 after the card widened back.
const { boot } = require("/home/user/MemoryMap-AI/scratchpad/ui-sweeps/lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate(async () => {
    for (let i = 0; i < 12; i++) await api("/entries", { method: "POST", body: JSON.stringify({ content: `fit note ${i} about topic ${i % 3}` }) });
  });
  await page.evaluate(() => switchTab("graph"));
  await page.waitForTimeout(5000);
  const centre = () => page.evaluate(() => {
    const s = gcTab, t = s.transform, xs = s.nodes.map((n) => t.applyX(n.x)), ys = s.nodes.map((n) => t.applyY(n.y));
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    return { offX: Math.round(cx - s.dims.w / 2), offY: Math.round(cy - s.dims.h / 2), w: s.dims.w };
  });
  const a = await centre();
  await page.evaluate(() => { const box = document.getElementById(gcTab.boxId); box.style.width = `${box.clientWidth - 400}px`; });
  await page.waitForTimeout(1500);
  const b = await centre();
  await page.evaluate(() => { const box = document.getElementById(gcTab.boxId); box.style.width = ""; });
  await page.waitForTimeout(1500);
  const c = await centre();
  console.log(JSON.stringify({ start: a, narrower: b, back: c }));
  await browser.close();
})();
