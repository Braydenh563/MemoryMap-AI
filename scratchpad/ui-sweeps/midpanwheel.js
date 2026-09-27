// **A middle-button pan follows the hand, even when the wheel talks too**
// (the owner, 2026-09-24, from the desktop window: middle-button panning
// "jerks repeatedly to the left side of the screen until i let go").
//
// A wheel pressed down is still a wheel. On a lot of Windows mice a press
// hard enough to click it also rocks it, and a rocked wheel is a horizontal
// wheel event (tilt), repeated for as long as it is held; some drivers send a
// stray vertical notch as the button goes down. The board treats a plain wheel
// as a pan (`wheel` listener in initWhiteboard), so every one of those moved
// the board sideways, and d3-zoom's own drag, which keeps the point that was
// pressed under the pointer, put it back on the next mousemove: a jerk, then a
// snap, repeated until the button was let go.
//
// This drives a real middle-button drag of 300px in each of four directions,
// with a tilt-left wheel event (buttons: 4, deltaX -120) dispatched between
// every move, and measures the board's translation after every move against
// the pointer's own travel from the press. Pass: the largest deviation over
// the whole drag is at most 1px, and the end offset equals the travel. A
// plain wheel with no button held must still pan (the other half of the
// contract), checked last.
//
//   BASE=http://127.0.0.1:8788 SCRATCH=/tmp/mm PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/midpanwheel.js
const { boot } = require("./lib.js");

const results = [];
const check = (label, ok, detail) => {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
};

(async () => {
  const [vw, vh] = (process.env.SIZE || "1440x900").split("x").map(Number);
  const { browser, page } = await boot({ viewport: { width: vw, height: vh } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards/import", {
      method: "POST",
      body: JSON.stringify({ format: "markdown", name: "Mid wheel " + Date.now(), content: "# Pan\n- Root\n  - One\n  - Two" }),
    });
    await openWhiteboardBoard(b.id);
  });
  await page.waitForTimeout(1500);
  const c = await page.evaluate(() => {
    const r = document.getElementById("whiteboard-container").getBoundingClientRect();
    //: A press on empty canvas, clear of the map (it opens in the middle)
    //: and with 300px of room on every side for the four drags.
    return { x: r.left + 330, y: r.top + r.height - 330 };
  });
  const read = () => page.evaluate(() => {
    const t = d3.zoomTransform(document.getElementById("whiteboard-container"));
    return { x: t.x, y: t.y };
  });
  const tilt = (x, y) => page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    el.dispatchEvent(new WheelEvent("wheel", { deltaX: -120, deltaMode: 0, buttons: 4, clientX: x, clientY: y, bubbles: true, cancelable: true }));
  }, [x, y]);
  for (const [name, ux, uy] of [["right", 1, 0], ["left", -1, 0], ["down", 0, 1], ["up", 0, -1]]) {
    const start = await read();
    await page.mouse.move(c.x, c.y);
    await page.mouse.down({ button: "middle" });
    let worst = 0;
    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      const tx = (300 * ux * i) / steps, ty = (300 * uy * i) / steps;
      await tilt(c.x + tx, c.y + ty);
      await page.mouse.move(c.x + tx, c.y + ty);
      await tilt(c.x + tx, c.y + ty);
      const now = await read();
      worst = Math.max(worst, Math.hypot(now.x - start.x - tx, now.y - start.y - ty));
    }
    await page.mouse.up({ button: "middle" });
    await page.waitForTimeout(150);
    const end = await read();
    const off = { x: Math.round(end.x - start.x), y: Math.round(end.y - start.y) };
    check(`middle drag ${name}: the board follows the pointer`, worst <= 1 && Math.abs(off.x - 300 * ux) <= 1 && Math.abs(off.y - 300 * uy) <= 1,
      `pointer travel ${300 * ux},${300 * uy}; board moved ${off.x},${off.y}; worst deviation mid-drag ${worst.toFixed(1)}px`);
  }
  //: **From a topic too** (the owner presses where he is looking, which on
  //: a map is usually a topic): the same drag, started on the root.
  const onNode = await page.evaluate(() => {
    const root = wbMapIndex().roots[0];
    const r = document.querySelector(`.wb-object[data-id="${root.id}"]`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  {
    const start = await read();
    await page.mouse.move(onNode.x, onNode.y);
    await page.mouse.down({ button: "middle" });
    for (let i = 1; i <= 10; i++) await page.mouse.move(onNode.x, onNode.y + 20 * i);
    await page.mouse.up({ button: "middle" });
    await page.waitForTimeout(150);
    const end = await read();
    check("middle drag started on a topic pans the board", Math.abs(end.y - start.y - 200) <= 1 && Math.abs(end.x - start.x) <= 1,
      `pointer travel 0,200; board moved ${Math.round(end.x - start.x)},${Math.round(end.y - start.y)}`);
  }
  const before = await read();
  await page.mouse.move(c.x, c.y);
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(200);
  const after = await read();
  check("a plain wheel with no button held still pans", Math.abs(after.y - before.y) > 50, `moved ${Math.round(after.y - before.y)}px for a 100px wheel`);
  await browser.close();
  const failed = results.filter((ok) => !ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
