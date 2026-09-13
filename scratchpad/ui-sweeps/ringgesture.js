// A probe, not a gate: why does a right-click on a map topic not open the node
// ring? `mapring.js` has reported "opened by: direct" (its fallback) since the
// eighth run, which means the gesture the ring is *for* does not reach it.
//
//   BASE=http://127.0.0.1:8802 SCRATCH=/tmp/mm-mapux \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/ringgesture.js
const { boot } = require("./lib.js");

async function newBoard(page, name) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

(async () => {
  const { browser, page } = await boot({});
  await newBoard(page, `Ring gesture ${Date.now()}`);
  const kidId = await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    const kid = await wbMapAddChild(root.id);
    return kid?.id ?? wbMapIndex().roots[0].id;
  });
  await page.waitForTimeout(1500);

  // What the page sees of the gesture: which element it lands on, whether the
  // contextmenu listener runs at all, and what the ring does after it.
  await page.evaluate(() => {
    window.__ring = { events: [] };
    document.addEventListener("contextmenu", (e) => {
      window.__ring.events.push({
        phase: "document",
        target: e.target.className?.baseVal ?? e.target.className ?? e.target.tagName,
        defaultPrevented: e.defaultPrevented,
      });
    }, true);
    const open = window.wbOpenMapRadial;
    window.wbOpenMapRadial = function (node) {
      const out = open.apply(this, arguments);
      window.__ring.events.push({ phase: "wbOpenMapRadial", node: node?.id ?? null, out });
      return out;
    };
  });

  const box = await page.evaluate((id) => {
    const r = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }, kidId);
  await page.mouse.click(box.x, box.y, { button: "right" });
  await page.waitForTimeout(700);

  const after = await page.evaluate(() => ({
    events: window.__ring.events,
    ringHidden: document.getElementById("wb-map-radial").classList.contains("hidden"),
    menuHidden: document.querySelector(".wb-ctx-menu")?.classList.contains("hidden") ?? null,
    editingTargetAtCentre: (() => {
      const el = document.elementFromPoint(
        Math.round(window.__lastX || 0), Math.round(window.__lastY || 0));
      return el ? el.className?.baseVal ?? el.className : null;
    })(),
  }));
  console.log(JSON.stringify({ box, after }, null, 1));
  await browser.close();
})();
