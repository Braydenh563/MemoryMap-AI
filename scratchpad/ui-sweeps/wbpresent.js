// WHITEBOARD_PLAN decision 16: presenting a board's frames.
//
// A board with no frame: View, Present frames says how to make one. Three
// frames (two side by side, one below): Present frames hides the chrome, shows
// one bar, and fits the first frame to the screen; the arrows, Space, Home,
// End and the bar's buttons walk them in reading order; a tool letter and an
// arrow change nothing on the board; Escape ends it and puts the camera, the
// chrome and the window back. A map offers no Present row. The bar stays in
// the window and its text reads (4.5:1).
//
//   BASE=http://127.0.0.1:8800 SCRATCH=/tmp/x THEME=light VW=1440 VH=900 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbpresent.js
const { boot } = require("./lib.js");

let pass = 0;
let fail = 0;
function ok(label, good, detail) {
  if (good) pass += 1;
  else fail += 1;
  console.log(`${good ? "OK  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
}
function lum([r, g, b]) {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const VW = Number(process.env.VW || 1440);
const VH = Number(process.env.VH || 900);

(async () => {
  const phone = VW < 600;
  const { browser, page } = await boot({
    viewport: { width: VW, height: VH },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluate(() => document.querySelector('[data-tab="library"]').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-target="library-view-whiteboard"]').click());
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById("wb-boards-new").click());
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", `Present sweep ${Date.now()}`);
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");

  const present = () => page.evaluate(() => document.querySelector('.wb-board-menu [data-wb-fn="present"][data-wb-surface="board"]').click());

  // 1. No frame yet.
  await present();
  await page.waitForTimeout(500);
  const empty = await page.evaluate(() => ({
    presenting: document.getElementById("library-view-whiteboard").classList.contains("wb-presenting"),
    toast: [...document.querySelectorAll(".toast")].map((t) => t.textContent).join(" | "),
  }));
  ok("with no frame, Present says how to make one", !empty.presenting && /Add a frame first/.test(empty.toast), JSON.stringify(empty));

  // 2. Three frames and something in each.
  await page.evaluate(async () => {
    await wbCreateObject("frame", { content: "Second" }, 700, 40, 500, 320, -1);
    await wbCreateObject("frame", { content: "First" }, 100, 60, 500, 320, -1);
    await wbCreateObject("frame", { content: "Third" }, 300, 600, 600, 400, -1);
    await wbCreateObject("text", { content: "In the first" }, 160, 140, 200, 80);
    await fetchWhiteboardState();
    renderWhiteboardNow();
  });
  const before = await page.evaluate(() => {
    const t = d3.zoomTransform(document.getElementById("whiteboard-container"));
    return { k: t.k, x: t.x, y: t.y, tool: window.currentTool, sticky: wbState.objects.find((o) => o.kind === "text").x };
  });
  await present();
  await page.waitForTimeout(900);
  const state = () =>
    page.evaluate(() => {
      const host = document.getElementById("library-view-whiteboard");
      const bar = document.getElementById("wb-present-bar");
      const br = bar.getBoundingClientRect();
      const c = document.getElementById("whiteboard-container").getBoundingClientRect();
      const shown = (sel) => {
        const el = document.querySelector(sel);
        return Boolean(el && getComputedStyle(el).display !== "none" && el.getBoundingClientRect().width > 0);
      };
      const title = document.getElementById("wb-present-count").textContent;
      const name = title.split(": ")[1];
      const frame = wbState.objects.find((o) => o.kind === "frame" && o.data.content === name);
      const fr = frame ? document.querySelector(`.wb-object[data-id="${frame.id}"]`).getBoundingClientRect() : null;
      return {
        presenting: host.classList.contains("wb-presenting"),
        full: host.classList.contains("wb-fullscreen"),
        topbar: shown(".wb-topbar"), rail: shown("#wb-tools-panel"), zoom: shown('[data-panel-id="zoom"]'),
        bar: !bar.classList.contains("hidden") && br.width > 0,
        barInside: br.left >= c.left - 0.5 && br.right <= c.right + 0.5 && br.bottom <= c.bottom + 0.5,
        title,
        fill: fr ? Math.max(fr.width / c.width, fr.height / c.height) : 0,
        frameInside: fr ? fr.left >= c.left - 1 && fr.right <= c.right + 1 && fr.top >= c.top - 1 && fr.bottom <= c.bottom + 1 : false,
        clearOfBar: fr ? fr.bottom <= br.top + 0.5 : false,
        prevDisabled: document.getElementById("wb-present-prev").disabled,
        nextDisabled: document.getElementById("wb-present-next").disabled,
      };
    });
  const s1 = await state();
  ok("Present frames hides the chrome and shows one bar, full screen", s1.presenting && s1.full && !s1.topbar && !s1.rail && !s1.zoom && s1.bar, JSON.stringify(s1));
  ok("it opens on the first frame in reading order, fitted to the screen", s1.title === "1 of 3: First" && s1.fill >= 0.7 && s1.frameInside, `${s1.title} fill ${s1.fill.toFixed(2)}`);
  ok("the bar sits inside the board, below the frame", s1.barInside && s1.clearOfBar);
  ok("Previous is off on the first frame", s1.prevDisabled && !s1.nextDisabled);

  // 3. Walking.
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(600);
  const s2 = await state();
  ok("the right arrow goes to the frame beside it", s2.title === "2 of 3: Second" && s2.fill >= 0.7 && s2.frameInside, `${s2.title} fill ${s2.fill.toFixed(2)}`);
  await page.keyboard.press(" ");
  await page.waitForTimeout(600);
  const s3 = await state();
  ok("Space goes to the next row", s3.title === "3 of 3: Third" && s3.frameInside && s3.nextDisabled, s3.title);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  ok("past the last frame it stays on the last", (await state()).title === "3 of 3: Third");
  await page.keyboard.press("Home");
  await page.waitForTimeout(600);
  ok("Home goes back to the first", (await state()).title === "1 of 3: First");
  await page.keyboard.press("End");
  await page.waitForTimeout(600);
  ok("End goes to the last", (await state()).title === "3 of 3: Third");
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(600);
  ok("the left arrow goes back one", (await state()).title === "2 of 3: Second");
  await page.evaluate(() => document.getElementById("wb-present-prev").click());
  await page.waitForTimeout(600);
  ok("the bar's Previous button walks too", (await state()).title === "1 of 3: First");

  // 4. A view: letters and arrows change nothing on the board.
  await page.keyboard.press("r");
  await page.keyboard.press("Delete");
  const still = await page.evaluate(() => ({ tool: window.currentTool, sticky: wbState.objects.find((o) => o.kind === "text")?.x, frames: wbState.objects.filter((o) => o.kind === "frame").length }));
  ok("a tool letter and Delete do nothing while presenting", still.tool === before.tool && still.sticky === before.sticky && still.frames === 3, JSON.stringify(still));

  // 5. The bar's text reads.
  const ink = await page.evaluate(() => {
    const bar = document.getElementById("wb-present-bar");
    const count = document.getElementById("wb-present-count");
    const probe = document.createElement("canvas").getContext("2d");
    const flat = (c, under) => {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = under; probe.fillRect(0, 0, 1, 1);
      probe.fillStyle = c; probe.fillRect(0, 0, 1, 1);
      return [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3);
    };
    const board = getComputedStyle(document.getElementById("whiteboard-container")).backgroundColor;
    const bg = flat(getComputedStyle(bar).backgroundColor, board);
    return { text: flat(getComputedStyle(count).color, `rgb(${bg.join(",")})`), bg };
  });
  const r = ratio(ink.text, ink.bg);
  ok("the bar's count reads (4.5:1)", r >= 4.5, r.toFixed(2));
  await page.screenshot({ path: `${process.env.SCRATCH || "."}/wbpresent-${VW}-${process.env.THEME || "light"}.png` });

  // 6. Escape ends it and puts everything back.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => {
    const host = document.getElementById("library-view-whiteboard");
    const t = d3.zoomTransform(document.getElementById("whiteboard-container"));
    return {
      presenting: host.classList.contains("wb-presenting"), full: host.classList.contains("wb-fullscreen"),
      bar: !document.getElementById("wb-present-bar").classList.contains("hidden"),
      topbar: getComputedStyle(document.querySelector(".wb-topbar")).display !== "none",
      k: t.k, x: t.x, y: t.y,
    };
  });
  ok("Escape ends it: chrome back, bar gone, window as it was", !after.presenting && !after.full && !after.bar && after.topbar, JSON.stringify(after));
  ok("and the camera where it was", Math.abs(after.k - before.k) < 1e-6 && Math.abs(after.x - before.x) < 0.5 && Math.abs(after.y - before.y) < 0.5, JSON.stringify({ before, after }));

  // 7. A map has no Present frames row (it has its own, mappresent.js).
  const mapRow = await page.evaluate(async () => {
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `Present map ${Date.now()}`, type: "map", layout: "tree-right" }) });
    window.currentBoardId = board.id;
    await fetchWhiteboardState();
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 600));
    const row = document.querySelector('.wb-board-menu [data-wb-fn="present"][data-wb-surface="board"]');
    const frameRow = document.querySelector('.wb-board-menu [data-wb-insert="frame"]');
    return { isMap: wbIsMap(), present: row.hidden, frame: frameRow.hidden };
  });
  if (mapRow.isMap) ok("a map offers neither Present frames nor Frame", mapRow.present && mapRow.frame, JSON.stringify(mapRow));
  else console.log("SKIP map row check: could not open a map from the sweep", JSON.stringify(mapRow));

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
