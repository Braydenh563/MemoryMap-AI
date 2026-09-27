// Round 7 (INBOX 430): the planets on Atlas's rings go round, on the
// compositor. For the companion's figure: each planet's centre against the
// ring's ellipse (off it by at most 0.6px, in the figure's own units),
// that it moved over MS ms, that every animation on it is `rotate` or
// `opacity`, and that the planets are round (width and height within 10%).
// Exits 1 on any miss. Env: BASE, MS (3000), LOOK (masculine).
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.evaluate((look) => {
    localStorage.setItem("atlas-look", look);
    const b = document.getElementById("avatar-buddy");
    b.value = "atlas";
    b.dispatchEvent(new Event("change", { bubbles: true }));
  }, process.env.LOOK || "masculine");
  await page.waitForTimeout(1500);
  const read = () => page.evaluate(() => {
    const box = document.querySelector("#nm-buddy .atl-figure-box");
    if (!box) return null;
    const b = box.getBoundingClientRect();
    const sx = b.width / 64;
    const { cx, cy, flat, tilt } = ATLAS_GEO.ringFrame;
    const a = (tilt * Math.PI) / 180;
    return [...box.querySelectorAll(".atl-orbiter")].map((el) => {
      const r = el.getBoundingClientRect();
      const x = (r.left + r.width / 2 - b.left) / sx - cx;
      const y = (r.top + r.height / 2 - b.top) / sx - cy;
      // Undo the tilt and the flattening: a point on the ring is at radius r.
      const u = x * Math.cos(a) + y * Math.sin(a);
      const v = (-x * Math.sin(a) + y * Math.cos(a)) / flat;
      const k = Number(el.closest(".atl-orbit").className.match(/atl-orbit-(\d)/)[1]);
      const ring = ATLAS_GEO.rings[k].r;
      const props = el.getAnimations().concat(el.parentElement.getAnimations()).flatMap((an) => an.effect.getKeyframes().flatMap((f) => Object.keys(f).filter((p) => !["offset", "easing", "composite", "computedOffset"].includes(p))));
      return { k, x: +x.toFixed(2), y: +y.toFixed(2), off: +Math.abs(Math.hypot(u, v) - ring).toFixed(2), round: +(r.width / r.height).toFixed(2), props: [...new Set(props)], running: el.getAnimations().every((an) => an.playState === "running") };
    });
  });
  const a = await read();
  await page.waitForTimeout(Number(process.env.MS || 3000));
  const b = await read();
  let bad = !a || !a.length;
  (a || []).forEach((p, i) => {
    const moved = Math.hypot(b[i].x - p.x, b[i].y - p.y);
    const ok = p.off <= 0.6 && moved > 0.05 && p.round > 0.9 && p.round < 1.1 && p.props.every((q) => q === "rotate" || q === "opacity") && p.running;
    if (!ok) bad = true;
    console.log(`ring ${p.k}: at ${p.x},${p.y} off the ellipse ${p.off}px, moved ${moved.toFixed(2)}px, w/h ${p.round}, animates ${p.props.join("+")}, running ${p.running}${ok ? "" : "  MISS"}`);
  });
  console.log(bad ? "FAIL" : "PASS");
  process.exitCode = bad ? 1 : 0;
  await browser.close();
})();
