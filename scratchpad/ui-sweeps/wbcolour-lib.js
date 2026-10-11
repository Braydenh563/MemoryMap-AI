// wbcolour sweeps: boot, load the Library bundle, open a fresh board.
//   BASE=http://127.0.0.1:8800 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbcolour-*.js
const { boot } = require("./lib.js");

async function openBoard(opts = {}) {
  const b = await boot({ viewport: opts.viewport || { width: 1440, height: 900 } });
  const { page } = b;
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  await page.evaluate(() => document.querySelectorAll("dialog[open]").forEach((d) => d.close()));
  await page.click('[data-tab="library"]');
  await page.waitForFunction(() => typeof ensureModule === "function");
  await page.evaluate(() => ensureModule("library"));
  await page.waitForFunction(() => typeof initWhiteboard === "function", null, { timeout: 30000 });
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(800);
  await page.evaluate(async () => {
    window.confirmDialog = async () => true;
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
  });
  const board = await page.evaluate(async () => apiJson("/whiteboard/boards", {
    method: "POST", body: JSON.stringify({ name: "wbcolour " + Date.now(), type: "board" }),
  }));
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, board.id);
  await page.waitForTimeout(1000);
  return { ...b, errors, board };
}

async function sketch(page, bid, data) {
  return page.evaluate(async ([b, d]) => {
    const s = await apiJson("/whiteboard/sketches", { method: "POST", body: JSON.stringify({ data: JSON.stringify(d), x: 0, y: 0, z: 1, board_id: b }) });
    await fetchWhiteboardState(); renderWhiteboardNow();
    return s.id;
  }, [bid, data]);
}

module.exports = { openBoard, sketch };
