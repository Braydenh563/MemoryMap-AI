// Capture's formatting strip (`#note-toolbar`) holds one row from its first
// paint, with or without the Library bundle that mounts its More button
// (`mountDocToolbarControlsFor`, documents.js) and fits it to one row
// (`fitDocToolbarRow`).
//
//   WIDTH=390 BASE=http://127.0.0.1:8802 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/capturestrip.js        (HOLD=4000 ms, WIDTH=390)
//
// The bundle's scripts are held for HOLD ms, Capture is opened, and the strip
// is read every 250 ms until the bundle has landed and the fit has run: the
// rows are counted from the bottoms of the visible children (a row is a band
// of centres within half a button), and the strip's own box height is read
// beside them. It passes when the strip is one row at every sample, before
// and after, and the box does not change height when the bundle lands (a late
// part that moves what is drawn is the cause this exists to catch).
const { boot } = require("./lib.js");

const HOLD = Number(process.env.HOLD || 4000);
const WIDTH = Number(process.env.WIDTH || 390);
const BUNDLE = /\/js\/(documents|documents-code|documents-prose|library|margin-reader)\.js/;

(async () => {
  const phone = WIDTH < 600;
  const { browser, page } = await boot({
    viewport: { width: WIDTH, height: phone ? 844 : 900 },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  let hold = false;
  await page.route("**/*", async (route) => {
    if (hold && BUNDLE.test(route.request().url())) await new Promise((r) => setTimeout(r, HOLD));
    return route.continue().catch(() => {});
  });
  hold = true;
  await page.goto(page.url(), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.evaluate(() => { switchTab("notes"); showNotesSection("capture", { focus: true }); });
  const samples = [];
  const read = () => page.evaluate(() => {
    const bar = document.getElementById("note-toolbar");
    if (!bar || !bar.getClientRects().length) return { shown: false };
    const kids = [...bar.children].filter((el) => el.getClientRects().length && getComputedStyle(el).visibility !== "hidden");
    const mids = kids.map((el) => { const r = el.getBoundingClientRect(); return (r.top + r.bottom) / 2; }).sort((a, b) => a - b);
    let rows = 0;
    let edge = -Infinity;
    for (const mid of mids) if (mid > edge + 14) { rows += 1; edge = mid; }
    const more = bar.querySelector(".doc-toolbar-more");
    return {
      shown: true,
      rows,
      height: Math.round(bar.getBoundingClientRect().height * 10) / 10,
      bundle: typeof docToolbarMode === "function",
      more: Boolean(more) && !more.hidden,
      overflowX: bar.scrollWidth > bar.clientWidth + 1,
    };
  });
  const start = Date.now();
  let pressed = false;
  while (Date.now() - start < HOLD + 3500) {
    // What brings the bundle in is the first use of the box (the strip's own
    // controls are mounted by it), so the box is pressed once the strip has
    // been read for two seconds without it.
    if (!pressed && Date.now() - start > 2000) {
      pressed = true;
      await page.click("#entry-content").catch(() => {});
    }
    const s = await read();
    samples.push({ t: Date.now() - start, ...s });
    await page.waitForTimeout(250);
  }
  const before = samples.filter((s) => s.shown && !s.bundle);
  const after = samples.filter((s) => s.shown && s.bundle);
  const line = (s) => `t=${s.t} rows=${s.rows} height=${s.height} bundle=${s.bundle} more=${s.more} overflowX=${s.overflowX}`;
  console.log(`before the bundle: ${before.length} samples; after: ${after.length}`);
  if (before.length) console.log("first before:", line(before[0]), "\nlast before: ", line(before[before.length - 1]));
  if (after.length) console.log("last after:  ", line(after[after.length - 1]));
  let failures = 0;
  const check = (label, ok, detail = "") => {
    if (!ok) failures += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok || !detail ? "" : "  " + detail}`);
  };
  check("the strip was read before the bundle landed", before.length >= 3, `${before.length} samples`);
  check("one row at every sample before the bundle", before.every((s) => s.rows === 1),
    before.filter((s) => s.rows !== 1).slice(0, 2).map(line).join(" | "));
  check("one row at every sample after the bundle", after.length > 0 && after.every((s) => s.rows === 1),
    after.filter((s) => s.rows !== 1).slice(0, 2).map(line).join(" | "));
  const heights = new Set([...before, ...after].map((s) => s.height));
  check("the strip's box does not change height when the bundle lands", heights.size === 1, [...heights].join(", "));
  check("no sideways scroll inside the strip", [...before, ...after].every((s) => !s.overflowX));
  await browser.close();
  console.log(failures ? `${failures} FAILED` : "all ok");
  process.exit(failures ? 1 : 0);
})();
