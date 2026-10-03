// INBOX 445 (2): the tool bar shows only what the held tool reads, the
// shape Fill switch means filled when it is on, and a text box's grip does
// not cover its first line.
//
// Per tool: which of the bar's settings are visible (by their
// `data-wb-tool-setting`), and whether the bar shows at all. Then a rect is
// drawn with the switch on and with it off, and the saved sketch's `fill`
// is read back. Then the grip's box against the first glyph's box.
//
//   BASE=http://127.0.0.1:8798 SCRATCH=/tmp/mm-wb-a08 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbtoolbar.js
const { boot } = require("./lib.js");

let pass = 0;
let fail = 0;
function ok(label, good, detail) {
  if (good) pass += 1;
  else fail += 1;
  console.log(`${good ? "OK  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
}

const WANT = {
  p: ["draw", "size,dash"],
  m: ["highlighter", "size"],
  l: ["line", "size,ends,dash"],
  a: ["arrow", "size,ends,dash"],
  r: ["rect", "size,dash,fill"],
  o: ["circle", "size,dash,fill"],
  e: ["eraser", ""],
  n: ["sticky", ""],
  t: ["text", ""],
  c: ["link-straight", ""],
  b: ["bucket", ""],
};

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", "Toolbar sweep");
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
  // Not empty: an empty board shows its own help panel over the canvas.
  await page.evaluate(async () => {
    const o = await apiJson("/whiteboard/objects", {
      method: "POST",
      body: JSON.stringify({ kind: "text", board_id: window.currentBoardId, x: 900, y: 60, width: 160, height: 80, data: { content: "Seed" } }),
    });
    wbState.objects.push(o);
    renderWhiteboardNow();
  });
  const box = await page.evaluate(() => {
    const r = document.getElementById("whiteboard-container").getBoundingClientRect();
    return { x: r.left, y: r.top };
  });
  await page.evaluate(() => document.getElementById("whiteboard-container").focus());

  for (const [key, [tool, want]] of Object.entries(WANT)) {
    await page.keyboard.press("Escape");
    await page.keyboard.press(key);
    await page.waitForTimeout(150);
    const seen = await page.evaluate(() => {
      const bar = document.getElementById("wb-context");
      const barShown = bar && !bar.classList.contains("hidden") && bar.getClientRects().length > 0;
      const shown = [...document.querySelectorAll("#wb-context [data-wb-tool-setting]")]
        .filter((el) => (el.closest(".select-shell") || el).getClientRects().length > 0)
        .map((el) => el.dataset.wbToolSetting);
      return { tool: window.currentTool, barShown, shown: barShown ? shown.join(",") : "" };
    });
    ok(`${tool}: the bar shows ${want || "nothing"}`, seen.tool === tool && seen.shown === want, `${seen.tool}: ${seen.shown || "(no bar)"}`);
  }

  // With a tool held and nothing selected, nothing on the bar acts on a
  // selection; with something selected, those come back.
  const actions = () => page.evaluate(() => {
    const vis = (el) => Boolean(el && el.getClientRects().length);
    return {
      duplicate: vis(document.getElementById("wb-selbar-duplicate")),
      remove: vis(document.getElementById("wb-selbar-delete")),
      more: vis(document.querySelector("#wb-context [data-wb-menu-toggle]")),
    };
  });
  await page.keyboard.press("Escape");
  await page.keyboard.press("p");
  const pen = await actions();
  ok("pen held: no duplicate, delete or More on the bar", !pen.duplicate && !pen.remove && !pen.more, JSON.stringify(pen));
  await page.keyboard.press("r");
  const rect = await actions();
  ok("rect held: More kept for fill opacity, no duplicate or delete", !rect.duplicate && !rect.remove && rect.more, JSON.stringify(rect));
  await page.keyboard.press("v");
  await page.evaluate(() => selectWbItem("object", wbState.objects[0].id));
  await page.waitForTimeout(300);
  const sel = await actions();
  ok("a selection gets duplicate, delete and More back", sel.duplicate && sel.remove && sel.more, JSON.stringify(sel));
  await page.keyboard.press("Escape");

  // The Fill switch: on means filled.
  async function drawRect(fillOn, dx) {
    await page.keyboard.press("Escape");
    await page.keyboard.press("r");
    await page.evaluate((on) => {
      const el = document.getElementById("wb-fill-on");
      if (el.checked !== on) el.click();
    }, fillOn);
    const x = box.x + 200 + dx;
    const y = box.y + 200;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y + 80, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    return page.evaluate(() => {
      const s = wbState.sketches[wbState.sketches.length - 1];
      return JSON.parse(s.data).fill || null;
    });
  }
  const filled = await drawRect(true, 0);
  const hollow = await drawRect(false, 220);
  ok("Fill switch on draws a filled rect", Boolean(filled), String(filled));
  ok("Fill switch off draws a hollow rect", hollow === null, String(hollow));
  const name = await page.evaluate(() => {
    const el = document.getElementById("wb-fill-on");
    return (el.labels && el.labels[0] && el.labels[0].textContent.trim()) || el.getAttribute("aria-label");
  });
  ok("the switch is named Fill", name === "Fill", name);

  // The grip against the first line of a text box.
  await page.evaluate(async () => {
    const o = await apiJson("/whiteboard/objects", {
      method: "POST",
      body: JSON.stringify({ kind: "text", board_id: window.currentBoardId, x: 300, y: 420, width: 200, height: 100, data: { content: "hello there", bg: "#fff3a8" } }),
    });
    wbState.objects.push(o);
    renderWhiteboardNow();
  });
  await page.waitForTimeout(400);
  const overlap = await page.evaluate(() => {
    const el = [...document.querySelectorAll("#wb-html-layer .wb-object-text")].pop();
    const g = el.querySelector(".wb-object-grip").getBoundingClientRect();
    const node = [...el.querySelector(".wb-text-content").childNodes].find((n) => n.nodeType === 3);
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 1);
    const b = range.getBoundingClientRect();
    return Math.max(0, Math.min(g.right, b.right) - Math.max(g.left, b.left)) * Math.max(0, Math.min(g.bottom, b.bottom) - Math.max(g.top, b.top));
  });
  ok("the grip covers none of the first glyph", overlap === 0, `${Math.round(overlap)} square px`);
  console.log(`${pass} ok, ${fail} failed`);
  await browser.close();
})();
