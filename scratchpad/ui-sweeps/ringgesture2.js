// Second probe: does the topic's own element still carry the d3 contextmenu
// listener, and does the event reach it?
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

  const wiring = await page.evaluate((id) => {
    const el = document.querySelector(`.wb-object[data-id="${id}"]`);
    const on = el.__on || [];
    return {
      listeners: on.map((o) => `${o.type}.${o.name || ""}`),
      contenteditable: el.querySelector(".wb-map-text")?.getAttribute("contenteditable"),
      isContentEditable: el.querySelector(".wb-map-text")?.isContentEditable,
      dataBound: Boolean(el.__data__),
    };
  }, kidId);

  await page.evaluate((id) => {
    window.__seen = [];
    const el = document.querySelector(`.wb-object[data-id="${id}"]`);
    el.addEventListener("contextmenu", () => window.__seen.push("reached the object"), false);
    document.addEventListener("contextmenu", (e) =>
      window.__seen.push(`document bubble, prevented ${e.defaultPrevented}`), false);
  }, kidId);
  // A new topic opens in its own editor, so the label still has focus and is
  // `contenteditable="true"`: click the empty canvas first, the way a person
  // who has finished typing does, and the blur handler ends the edit.
  await page.mouse.click(200, 700);
  await page.waitForTimeout(400);
  const box = await page.evaluate((id) => {
    const r = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, kidId);
  await page.mouse.click(box.x, box.y, { button: "right" });
  await page.waitForTimeout(600);
  const seen = await page.evaluate(() => ({
    seen: window.__seen,
    ringHidden: document.getElementById("wb-map-radial").classList.contains("hidden"),
  }));
  console.log(JSON.stringify({ wiring, seen }, null, 1));
  await browser.close();
})();
