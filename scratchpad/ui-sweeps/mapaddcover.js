// A topic's own `.wb-map-add` row must never cover the topic's centre, or the
// text you press to select it. mindmapcurve.js timed out at 390x844 with
// "<button class=wb-map-add> intercepts pointer events" (OPEN.md, backend-0926
// carry); this measures it directly so a probe fault and an app fault can be
// told apart: for each of three topics, with the pointer parked on it (the
// state in which the row is live), what `elementFromPoint` returns at the
// text's centre and at the click point the probe uses (8,8 into the text).
//
//   VIEWPORT=390x844 BASE=http://127.0.0.1:8803 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mapaddcover.js
const { boot } = require("./lib.js");

const VIEWPORT = (() => {
  const raw = process.env.VIEWPORT;
  if (!raw) return { width: 390, height: 844 };
  const [w, h] = raw.split("x").map(Number);
  return { width: w || 390, height: h || 844 };
})();

(async () => {
  //: TOUCH=0 keeps a phone-width viewport but a mouse pointer, which is how
  //: mindmapcurve.js boots at 390x844 (no hasTouch / isMobile).
  const phone = process.env.TOUCH === "0" ? false : VIEWPORT.width < 600;
  const { page, browser } = await boot({ viewport: VIEWPORT, hasTouch: phone, isMobile: phone });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const view = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== view);
    await initWhiteboard();
    const board = await apiJson("/whiteboard/boards", {
      method: "POST",
      body: JSON.stringify({ name: `cover ${Date.now()}`, type: "map" }),
    });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    const mk = async (x, y, text, parent) => {
      const made = await apiJson("/whiteboard/objects", {
        method: "POST",
        body: JSON.stringify({ board_id: board.id, kind: "topic", x, y, width: 170, height: 52, data: { content: text } }),
      });
      if (parent) {
        Object.assign(made, await apiJson(`/whiteboard/boards/${board.id}/nodes/${made.id}/move`, {
          method: "PUT", body: JSON.stringify({ parent_id: parent }),
        }));
      }
      return made;
    };
    const root = await mk(140, 380, "Trunk");
    await mk(600, 140, "Curved", root.id);
    await mk(520, 470, "Straight", root.id);
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 700));
  });

  const rows = [];
  for (const name of ["Trunk", "Curved", "Straight"]) {
    const node = page.locator(`.wb-map-node:has(.wb-map-text:text-is("${name}"))`).first();
    const box = await node.boundingBox();
    // Hover is the state that makes the row live (`pointer-events: auto`).
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(250);
    rows.push(await node.evaluate((el, label) => {
      const text = el.querySelector(".wb-map-text").getBoundingClientRect();
      const add = el.querySelector(".wb-map-add").getBoundingClientRect();
      const ref = el.querySelector(".wb-map-ref").getBoundingClientRect();
      const hit = (x, y) => {
        const top = document.elementFromPoint(x, y);
        return top ? (top.closest(".wb-map-add") ? "wb-map-add" : top.closest(".wb-map-ref") ? "wb-map-ref" : top.className || top.tagName) : null;
      };
      const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
        Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      return {
        label,
        text: [text.left, text.top, text.width, text.height].map(Math.round),
        add: [add.left, add.top, add.width, add.height].map(Math.round),
        centre: hit(text.left + text.width / 2, text.top + text.height / 2),
        probe: hit(text.left + 8, text.top + 8),
        addOverTextArea: Math.round(overlap(add, text) + overlap(ref, text)),
        zoom: Math.round((text.width / el.offsetWidth) * 100) / 100,
      };
    }, name));
  }
  let bad = 0;
  for (const r of rows) {
    const ok = r.centre !== "wb-map-add" && r.centre !== "wb-map-ref" && r.probe !== "wb-map-add" && r.probe !== "wb-map-ref" && r.addOverTextArea === 0;
    if (!ok) bad += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${r.label}: ${JSON.stringify(r)}`);
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
