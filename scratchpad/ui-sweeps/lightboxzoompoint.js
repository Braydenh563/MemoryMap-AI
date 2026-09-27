// The owner, 2026-09-27: "when viewing things like images in the lightbox, I
// cant zoom in on specific parts only the top left of the attachment or
// image". Opens a picture, then zooms with the wheel at a point 70% across
// and 70% down it, by double-click at 25%/75%, and by the button (centre).
// PASS when the fraction of the picture under the anchor stays within 2%.
//   BASE=... PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/lightboxzoompoint.js
const { boot } = require("./lib.js");
let failures = 0;
const check = (label, ok, detail) => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}  ${detail || ""}`); };
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1093, height: 614 } });
  const row = await page.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 1600; c.height = 1000;
    const g = c.getContext("2d"); g.fillStyle = "#468"; g.fillRect(0, 0, 1600, 1000);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const fd = new FormData(); fd.append("file", new File([blob], "zoompoint.png", { type: "image/png" }));
    const r = await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } });
    const out = await r.json();
    return (await apiJson("/media")).find((m) => m.id === out.id);
  });
  await page.evaluate(() => switchTab("library"));
  await page.waitForFunction(() => typeof libraryLightboxItems === "function", null, { timeout: 90000 });
  await page.evaluate((rw) => openLightbox(libraryLightboxItems([rw]), 0), row);
  await page.waitForTimeout(1200);
  const rect = () => page.evaluate(() => { const r = document.querySelector(".lightbox-stage img").getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height }; });
  const frac = (r, x, y) => [(x - r.l) / r.w, (y - r.t) / r.h];
  const reset = () => page.evaluate(() => [...document.querySelectorAll(".lightbox .lightbox-action")].find((b) => /fit|reset/i.test(b.title))?.click());
  // Wheel at 70% / 70%.
  let r0 = await rect(); let x = r0.l + r0.w * 0.7, y = r0.t + r0.h * 0.7;
  await page.mouse.move(x, y);
  for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(80); }
  let r1 = await rect(); let [fx, fy] = frac(r1, x, y);
  check("wheel keeps the point under the pointer", Math.abs(fx - 0.7) < 0.02 && Math.abs(fy - 0.7) < 0.02 && r1.w > r0.w * 1.5, `fraction ${fx.toFixed(3)},${fy.toFixed(3)} width ${Math.round(r0.w)}->${Math.round(r1.w)}`);
  await reset(); await page.waitForTimeout(300);
  // Double-click at 25% / 75%.
  r0 = await rect(); x = r0.l + r0.w * 0.25; y = r0.t + r0.h * 0.75;
  await page.mouse.dblclick(x, y); await page.waitForTimeout(300);
  r1 = await rect(); [fx, fy] = frac(r1, x, y);
  check("double-click zooms into the spot", Math.abs(fx - 0.25) < 0.02 && Math.abs(fy - 0.75) < 0.02 && r1.w > r0.w * 1.5, `fraction ${fx.toFixed(3)},${fy.toFixed(3)}`);
  await reset(); await page.waitForTimeout(300);
  // Button: the stage centre stays put.
  const c = await page.evaluate(() => { const b = document.querySelector(".lightbox-stage").getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; });
  r0 = await rect(); const [c0x, c0y] = frac(r0, c[0], c[1]);
  await page.evaluate(() => [...document.querySelectorAll(".lightbox .lightbox-action")].find((b) => b.title === "Zoom in").click());
  await page.waitForTimeout(300);
  r1 = await rect(); [fx, fy] = frac(r1, c[0], c[1]);
  check("the button zooms about the centre", Math.abs(fx - c0x) < 0.02 && Math.abs(fy - c0y) < 0.02, `before ${c0x.toFixed(3)},${c0y.toFixed(3)} after ${fx.toFixed(3)},${fy.toFixed(3)}`);
  await browser.close();
  console.log(failures ? `${failures} failed` : "all passed");
  process.exit(failures ? 1 : 0);
})();
