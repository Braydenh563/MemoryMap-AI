// INBOX 573: "these anchor points appeared and wont go away". On a map, the
// cross-link tool's hover draws a topic's eight anchor dots; select a topic,
// deselect five ways (Escape, a press on empty canvas, Undo and Redo, a tab
// switch and back, the Shape menu opened and closed), and count every handle
// or anchor element left on screen. Expect 0 each time.
//
//   BASE=http://127.0.0.1:8844 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmdoc1005-handlesleft.js   (THEME=dark)
const { boot } = require("./lib.js");

(async () => {
  const { page, browser } = await boot();
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Handles\n\n- Centre\n  - New topic\n  - Other" }) });
    await openWhiteboardBoard(b.id);
    await wbMapTidyFresh();
  });
  await page.waitForTimeout(800);
  //: Every handle-like thing a selection or a link gesture can leave.
  const left = () => page.evaluate(() => {
    const shown = (el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity) > 0 && r.width > 0;
    };
    return {
      anchors: document.querySelectorAll("#wb-anchor-hints circle").length,
      resize: [...document.querySelectorAll(".wb-resize-handle, .wb-rotate-handle")].filter(shown).length,
      sketch: document.querySelectorAll(".wb-sketch-resize-handle, .wb-multi-handle-group").length,
      selected: document.querySelectorAll(".wb-selected").length,
    };
  });
  const centreOf = (text) => page.evaluate((text) => {
    const o = wbState.objects.find((x) => x.data.content === text);
    const r = document.querySelector(`.wb-object[data-id="${o.id}"]`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, id: o.id };
  }, text);
  const topic = await centreOf("New topic");
  const empty = await page.evaluate(() => {
    const r = document.getElementById("whiteboard-container").getBoundingClientRect();
    return { x: r.right - 60, y: r.bottom - 120 };
  });

  // Show the dots the way a person does: the cross-link tool over a topic.
  const showDots = async () => {
    await page.mouse.move(empty.x, empty.y);
    await page.evaluate(() => document.getElementById("whiteboard-container").focus());
    await page.keyboard.press("c");
    await page.waitForTimeout(200);
    await page.mouse.move(topic.x - 30, topic.y);
    await page.mouse.move(topic.x, topic.y, { steps: 4 });
    await page.waitForTimeout(200);
    const shown = await left();
    await page.keyboard.press("v");
    await page.waitForTimeout(150);
    await page.mouse.click(topic.x, topic.y);
    await page.waitForTimeout(300);
    return shown;
  };

  const ways = [
    ["Escape", async () => { await page.keyboard.press("Escape"); }],
    ["a press on empty canvas", async () => { await page.mouse.click(empty.x, empty.y); }],
    ["Undo and Redo", async () => {
      await page.mouse.click(empty.x, empty.y);
      await page.keyboard.press("Control+z");
      await page.waitForTimeout(500);
      await page.keyboard.press("Control+Shift+z");
    }],
    ["a tab switch and back", async () => {
      await page.mouse.click(empty.x, empty.y);
      await page.evaluate(() => switchTab("notes"));
      await page.waitForTimeout(400);
      await page.evaluate(() => switchTab("library"));
    }],
    ["the Shape menu opened and closed", async () => {
      await page.evaluate(() => document.getElementById("wb-map-shape")?.closest("details")?.setAttribute("open", ""));
      await page.waitForTimeout(150);
      await page.evaluate(() => document.getElementById("wb-map-shape")?.closest("details")?.removeAttribute("open"));
      await page.mouse.click(empty.x, empty.y);
    }],
  ];
  for (const [name, deselect] of ways) {
    const shown = await showDots();
    await deselect();
    await page.mouse.move(empty.x, empty.y);
    await page.waitForTimeout(500);
    const rest = await left();
    check(`after ${name}, nothing is left`, rest.anchors === 0 && rest.resize === 0 && rest.sketch === 0 && rest.selected === 0,
      `dots shown ${shown.anchors}; left ${JSON.stringify(rest)}`);
  }
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  await browser.close();
})();
