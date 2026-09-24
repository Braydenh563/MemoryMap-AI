// INBOX 410: "is there a way to make these mind map item radial options fit
// better in the radials??" The pills overhung the ring's band and the three
// slot line ring put two pills side by side on one edge.
//
// Measured, per ring and per width: every slot's four corners against the
// band's inner and outer circle (read off the ring's own ::before), the
// pairwise overlap of the slots, the angle of each slot centre (evenly
// spaced means equal steps), and the caption under the ring against the
// band's outer edge.
//
//   BASE=http://127.0.0.1:8785 SCRATCH=/tmp/mm-mapfix THEME=light \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapradialfit.js
const { boot } = require("./lib.js");

const WIDTHS = [[1440, 900], [1184, 800], [390, 844]];
let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

async function newMap(page, name) {
  await page.evaluate(() => {
    const btn = document.querySelector('[data-tab="library"]');
    btn && btn.click();
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById("wb-boards-new")?.click());
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForFunction(() => wbIsMap() && wbMapIndex().roots.length > 0, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
}

function measureRing(id) {
  const ring = document.getElementById(id);
  const o = ring.getBoundingClientRect();
  const cs = getComputedStyle(ring, "::before");
  const outer = parseFloat(cs.width) / 2;
  const inner = outer - parseFloat(cs.borderTopWidth);
  const slots = [...ring.querySelectorAll(".wb-map-radial-slot")].map((s) => {
    const r = s.getBoundingClientRect();
    const corners = [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]]
      .map(([x, y]) => Math.hypot(x - o.left, y - o.top));
    // The nearest point of the box to the centre (0 when the box holds it).
    const nx = Math.max(r.left - o.left, 0, o.left - r.right);
    const ny = Math.max(r.top - o.top, 0, o.top - r.bottom);
    const cx = r.left + r.width / 2 - o.left, cy = r.top + r.height / 2 - o.top;
    return {
      name: s.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height),
      far: Math.max(...corners), near: Math.hypot(nx, ny),
      angle: (Math.atan2(cx, -cy) * 180 / Math.PI + 360) % 360,
      rect: { l: r.left, t: r.top, r: r.right, b: r.bottom },
    };
  });
  let overlap = 0;
  for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
    const a = slots[i].rect, b = slots[j].rect;
    const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (w > 0 && h > 0) overlap = Math.max(overlap, w * h);
  }
  const angles = slots.map((s) => s.angle).sort((a, b) => a - b);
  const steps = angles.map((a, i) => ((angles[(i + 1) % angles.length] - a) + 360) % 360 || 360);
  const cap = ring.querySelector(".wb-map-radial-caption");
  cap.textContent = cap.dataset.rest || "";
  const cr = cap.getBoundingClientRect();
  const capGap = cr.top - (o.top + outer);
  const capStyle = getComputedStyle(cap);
  return { outer, inner, slots, overlap, steps, capGap, capW: cr.width,
    capFont: parseFloat(capStyle.fontSize), vw: innerWidth,
    capInView: cr.left >= 0 && cr.right <= innerWidth && cr.bottom <= innerHeight };
}

function report(label, m) {
  const over = Math.max(...m.slots.map((s) => s.far - m.outer));
  const under = Math.max(...m.slots.map((s) => m.inner - s.near));
  const spread = Math.max(...m.steps) - Math.min(...m.steps);
  console.log(`  ${label}: band ${m.inner.toFixed(0)}..${m.outer.toFixed(0)}  slots ${m.slots.map((s) => `${s.name}@${s.angle.toFixed(0)}(${s.w}x${s.h})`).join(" ")}`);
  check(`${label}: no slot past the band's outer edge`, over <= 0.5, `worst overhang ${over.toFixed(1)}px`);
  check(`${label}: no slot inside the band's hole`, under <= 0.5, `worst ${under.toFixed(1)}px`);
  check(`${label}: no two slots overlap`, m.overlap === 0, `largest overlap ${m.overlap.toFixed(0)}px2`);
  check(`${label}: evenly spaced by angle`, spread <= 2, `steps ${m.steps.map((s) => s.toFixed(0)).join("/")}`);
  check(`${label}: caption clear of the ring and readable`, m.capGap >= 0 && m.capFont >= 11 && m.capInView,
    `gap ${m.capGap.toFixed(0)}px, ${m.capFont}px, width ${m.capW.toFixed(0)}`);
}

(async () => {
  for (const [w, h] of WIDTHS) {
    const { browser, page } = await boot({ viewport: { width: w, height: h } });
    await newMap(page, `Radial fit ${w}`);
    const ids = await page.evaluate(async () => {
      const root = wbMapIndex().roots[0];
      const kid = await wbMapAddChild(root.id);
      return { root: root.id, kid: kid?.id };
    });
    await page.waitForTimeout(1200);
    await page.mouse.click(Math.round(w / 2), Math.round(h - 60));
    await page.waitForTimeout(300);
    // Centre the view on the root so the ring is not slid by an edge.
    const opened = await page.evaluate((id) => {
      const node = wbState.objects.find((o) => o.id === id);
      const host = document.getElementById("library-view-whiteboard").getBoundingClientRect();
      return { ok: wbOpenMapRadial(node), host: [host.width, host.height], hidden: document.getElementById("wb-map-radial").className };
    }, ids.root);
    console.log(`  ${w}: opened ${JSON.stringify(opened)}`);
    await page.waitForTimeout(400);
    report(`${w} node ring`, await page.evaluate(measureRing, "wb-map-radial"));
    await page.evaluate(() => wbCloseMapRadial());
    await page.evaluate((kid) => {
      const host = document.getElementById("library-view-whiteboard").getBoundingClientRect();
      wbOpenMapLinkRadial(kid, host.left + host.width / 2, host.top + host.height / 2);
    }, ids.kid);
    await page.waitForTimeout(400);
    report(`${w} line ring`, await page.evaluate(measureRing, "wb-map-link-radial"));
    await page.screenshot({ path: `${process.env.SCRATCH || "."}/shots/mapradialfit-${w}-${process.env.THEME || "light"}.png` });
    await browser.close();
  }
  console.log(failures ? `${failures} failed` : "all passed");
  process.exit(failures ? 1 : 0);
})();
