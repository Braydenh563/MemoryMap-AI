// What the selection rectangle looks like mid-drag, now that it is drawn on a
// canvas (INBOX 410): its edge in the accent, its inside a light wash of it
// over the canvas, over the cards it crosses, and gone after the release.
//
//   BASE=http://127.0.0.1:8785 SCRATCH=/tmp/mm-mapfix THEME=dark \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/marqueelook.js
const { boot } = require("./lib.js");
const { execFileSync } = require("child_process");
const path = require("path");

const OUT = (process.env.SCRATCH || ".") + "/shots";
const PY = process.env.PY || "/home/user/MemoryMap-AI/.venv/bin/python";
const THEME = process.env.THEME || "light";
let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}
function pixel(file, x, y) {
  const out = execFileSync(PY, [path.join("scratchpad", "pngpixel.py"), file, String(Math.round(x)), String(Math.round(y))], { encoding: "utf8" });
  const m = out.match(/\((\d+), (\d+), (\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

(async () => {
  const { browser, page } = await boot({});
  await page.evaluate(() => document.querySelector('[data-tab="library"]')?.click());
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('[data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  const id = await page.evaluate(async () => {
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Marquee look" }) });
    for (let i = 0; i < 4; i++) {
      await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({
        kind: "text", data: { content: `Item ${i}` }, board_id: board.id, x: 200 + i * 240, y: 200, z: 1, width: 180, height: 70,
      }) });
    }
    return board.id;
  });
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); wbSelectToolRef?.("select"); }, id);
  await page.waitForTimeout(2500);
  const accent = await page.evaluate(() => wbExportColour(getComputedStyle(document.getElementById("whiteboard-container")).getPropertyValue("--accent").trim()));
  await page.evaluate(() => wbZoomToFit({ animate: false }));
  await page.waitForTimeout(600);
  // From 40px above and left of the four boxes to 40px below and right.
  const r = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll("#wb-html-layer .wb-object")].map((e) => e.getBoundingClientRect());
    return {
      l: Math.min(...boxes.map((b) => b.left)), t: Math.min(...boxes.map((b) => b.top)),
      r: Math.max(...boxes.map((b) => b.right)), b: Math.max(...boxes.map((b) => b.bottom)),
    };
  });
  const x0 = r.l - 40, y0 = r.t - 40, x1 = r.r + 40, y1 = r.b + 40;
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  await page.mouse.move(x1, y1, { steps: 20 });
  await page.waitForTimeout(200);
  const shot = `${OUT}/marqueelook-${THEME}.png`;
  await page.screenshot({ path: shot });
  const drawn = await page.evaluate(() => document.querySelectorAll("canvas.wb-marquee").length);
  check(`${THEME}: one rectangle drawn mid-drag`, drawn === 1, `${drawn}`);
  // The left edge, on a dash: a few pixels down it, the brightest match.
  const want = accent.match(/\d+/g).slice(0, 3).map(Number);
  let best = 999;
  for (let dy = 0; dy < 8; dy++) {
    const p = pixel(shot, x0, y0 + 20 + dy);
    best = Math.min(best, Math.max(...p.map((v, i) => Math.abs(v - want[i]))));
  }
  check(`${THEME}: the edge is the accent`, best <= 24, `accent ${want}, closest edge pixel off by ${best}`);
  const inside = pixel(shot, x0 + 20, y0 + 30);
  const outside = pixel(shot, x0 - 20, y0 + 30);
  check(`${THEME}: the inside is washed`, inside.some((v, i) => Math.abs(v - outside[i]) >= 3),
    `inside ${inside} outside ${outside}`);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({ strays: document.querySelectorAll(".wb-marquee").length, selected: wbMultiSelection.size }));
  check(`${THEME}: the release removes it and selects the four`, after.strays === 0 && after.selected === 4, JSON.stringify(after));
  await browser.close();
  console.log(failures ? `${failures} failed` : "all passed");
  process.exit(failures ? 1 : 0);
})();
