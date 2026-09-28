// The whiteboard by touch (INBOX 430: "the whiteboard doesn't pan by touch
// drag"). With real touch events (CDP Input.dispatchTouchEvent) on a board:
// one finger dragged over empty canvas with each tool, and a two-finger
// pinch, reading the zoom transform before and after.
//   TAG=before node scratchpad/ui-sweeps/wbtouchpan.js
const { boot } = require("./lib.js");
const SIZES = (process.env.SIZES || "390x844,768x1024").split(",").map((s) => s.split("x").map(Number));
(async () => {
  let fails = 0;
  const check = (name, ok, detail) => {
    if (!ok) fails += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail !== undefined ? ": " + detail : ""}`);
  };
  for (const [w, h] of SIZES) {
    const { page, browser } = await boot({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true });
    const cdp = await page.context().newCDPSession(page);
    await page.evaluate(async () => {
      switchTab("library");
      await new Promise((r) => setTimeout(r, 800));
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" };
      const b = await (await fetch("/whiteboard/boards", { method: "POST", headers, body: JSON.stringify({ title: "Touch probe" }) })).json();
      window.__probeBoard = b.id;
      await openWhiteboardBoard(b.id);
      await new Promise((r) => setTimeout(r, 2500));
    });
    const state = () => page.evaluate(() => {
      const t = d3.zoomTransform(document.getElementById("whiteboard-container"));
      return { k: Number(t.k.toFixed(3)), x: Math.round(t.x), y: Math.round(t.y), tool: window.currentTool, marquee: Boolean(document.querySelector(".wb-marquee")) };
    });
    //: An empty point of the canvas: the middle of the board's container,
    //: asked of elementFromPoint so a card or a control is never the target.
    const spot = await page.evaluate(() => {
      const c = document.getElementById("whiteboard-container");
      const r = c.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), el: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.tagName };
    });
    const touch = async (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
    const drag = async () => {
      await touch("touchStart", [[spot.x, spot.y]]);
      for (let i = 1; i <= 8; i += 1) {
        await touch("touchMove", [[spot.x + i * 10, spot.y + i * 6]]);
        await page.waitForTimeout(16);
      }
      await touch("touchEnd", []);
      await page.waitForTimeout(250);
    };
    for (const tool of ["select", "pan"]) {
      await page.evaluate((t) => document.querySelector(`#wb-toolbar button[data-tool="${t}"], button[data-tool="${t}"]`)?.click(), tool);
      await page.waitForTimeout(200);
      const a = await state();
      await drag();
      const b = await state();
      check(`${w}: one finger over empty canvas pans (${a.tool})`, b.x - a.x >= 60 && b.y - a.y >= 30 && !b.marquee, `${a.x},${a.y} -> ${b.x},${b.y}${b.marquee ? " (a marquee drawn)" : ""}`);
    }
    const a = await state();
    await touch("touchStart", [[spot.x - 40, spot.y], [spot.x + 40, spot.y]]);
    for (let i = 1; i <= 8; i += 1) {
      await touch("touchMove", [[spot.x - 40 - i * 12, spot.y], [spot.x + 40 + i * 12, spot.y]]);
      await page.waitForTimeout(16);
    }
    await touch("touchEnd", []);
    await page.waitForTimeout(250);
    const b = await state();
    check(`${w}: two fingers pinch to zoom`, b.k > a.k * 1.5, `${a.k} -> ${b.k}`);
    await page.evaluate(async () => {
      const headers = { "X-Auth-Token": localStorage.getItem("token") || "" };
      await fetch(`/whiteboard/boards/${window.__probeBoard}`, { method: "DELETE", headers });
    });
    await browser.close();
  }
  console.log(fails ? `${fails} FAILED` : "the board moves by touch");
  process.exit(fails ? 1 : 0);
})();
