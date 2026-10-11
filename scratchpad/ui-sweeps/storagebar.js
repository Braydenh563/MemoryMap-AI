// Settings, About, Health: "Files on disk" is one bar and a legend (DESIGN.md,
// the recipe index). At 1440 and 390: the bar and legend sit inside the
// window, no sideways scroll, every segment is as wide as its share of the
// bar (within a pixel), the bar's accessible name carries the legend's words,
// and each segment's fill against the track is measured.
//
//   BASE=http://127.0.0.1:8814 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/storagebar.js     (THEME=dark for dark)
const { boot } = require("./lib.js");

async function run(viewport, phone) {
  const { browser, page } = await boot({ viewport, hasTouch: phone, isMobile: phone, args: ["--disable-dev-shm-usage"] });
  await page.evaluate(() => openSettingsModal("about"));
  await page.waitForSelector("#storage-bar .storage-seg", { state: "attached", timeout: 25000 });
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const bar = document.getElementById("storage-bar");
    bar.scrollIntoView({ block: "center" });
    const legend = document.getElementById("storage-legend");
    const rect = (el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: +r.width.toFixed(1), height: +r.height.toFixed(1) }; };
    const segs = [...bar.querySelectorAll(".storage-seg")].map((el) => ({ kind: el.dataset.kind, grow: el.style.flexGrow, width: +el.getBoundingClientRect().width.toFixed(1), fill: getComputedStyle(el).backgroundColor }));
    const grows = segs.reduce((n, s) => n + Number(s.grow), 0);
    const inner = bar.getBoundingClientRect().width - (segs.length - 1) * parseFloat(getComputedStyle(bar).columnGap || getComputedStyle(bar).gap || 0);
    const pane = bar.closest(".settings-pane, .modal-card, body");
    return {
      bar: rect(bar), legend: rect(legend), segs,
      // A sliver is held to a few pixels by min-width, so only segments wider than that are held to their share.
      shareErrors: segs.filter((s) => (Number(s.grow) / grows) * inner > 8).map((s) => +(s.width - (Number(s.grow) / grows) * inner).toFixed(1)),
      track: getComputedStyle(bar).backgroundColor,
      label: bar.getAttribute("aria-label"),
      items: [...legend.children].map((li) => li.textContent),
      insideViewport: bar.getBoundingClientRect().right <= document.documentElement.clientWidth && legend.getBoundingClientRect().right <= document.documentElement.clientWidth,
      sideways: pane.scrollWidth > pane.clientWidth + 1 || document.documentElement.scrollWidth > document.documentElement.clientWidth,
      swatchSize: rect(legend.querySelector(".storage-swatch")),
      // Each segment's colour composited over the track over the first opaque ground behind it,
      // against that ground: the bar is not read by colour alone (the legend names each kind),
      // but the number is reported.
      contrast: (() => {
        const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return c.startsWith("color(srgb") ? { r: m[0] * 255, g: m[1] * 255, b: m[2] * 255, a: m[3] ?? 1 } : { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
        const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
        let ground = { r: 255, g: 255, b: 255, a: 1 };
        const stack = []; for (let el = bar; el; el = el.parentElement) stack.push(parse(getComputedStyle(el).backgroundColor));
        for (const layer of stack.reverse()) if (layer.a > 0) ground = over(layer, ground);
        const lum = ({ r, g, b }) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
        const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return +((hi + 0.05) / (lo + 0.05)).toFixed(2); };
        return segs.map((seg) => [seg.kind.replace("_bytes", ""), ratio(over(parse(seg.fill), ground), ground)]);
      })(),
    };
  });
  console.log(phone ? "390" : "1440", JSON.stringify(out));
  await browser.close();
  return out;
}

(async () => {
  const a = await run({ width: 1440, height: 900 }, false);
  const b = await run({ width: 390, height: 844 }, true);
  const bad = [a, b].filter((o) => !o.insideViewport || o.sideways || o.segs.length < 2 || o.shareErrors.some((e) => Math.abs(e) > 2) || !/Notebook/.test(o.label));
  console.log(bad.length ? "FAIL" : "OK");
  process.exit(bad.length ? 1 : 0);
})();
