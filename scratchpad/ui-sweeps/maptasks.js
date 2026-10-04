// MINDMAP_PLAN.md decision 15: a topic can be a task.
//
// A map of a trunk and three branches. The topic menu's "Make this a task"
// gives a branch a box; pressing the box ticks it (and starts no drag and no
// rename); the trunk counts what is done under it, "1/2", then "2/2" in the
// success ink; undo unticks; resetting the topic's look keeps the task; the
// Markdown export writes it as a task-list item; the count reads on the board.
//
//   BASE=http://127.0.0.1:8850 SCRATCH=/tmp/x THEME=light \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/maptasks.js
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
const rgb = (s) => (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", "Task sweep");
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");

  const ids = await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    const out = [root.id];
    for (const text of ["Write the post", "Book the room", "Notes"]) {
      const made = await wbMapCreateNode({ parentId: root.id, text });
      out.push(made.id);
    }
    await wbMapTidy({ quiet: true });
    renderWhiteboardNow();
    return out;
  });
  await page.waitForTimeout(600);
  const [rootId, aId, bId] = ids;

  const node = (id) =>
    page.evaluate((nid) => {
      const o = wbState.objects.find((x) => x.id === nid);
      const el = document.querySelector(`.wb-object[data-id="${nid}"]`);
      const box = el.querySelector(".wb-map-task");
      const progress = el.querySelector(".wb-map-progress");
      const r = box && !box.hidden ? box.getBoundingClientRect() : null;
      return {
        task: o.data.task || null,
        x: o.x,
        boxShown: Boolean(box && !box.hidden && r && r.width > 0),
        checked: box ? box.getAttribute("aria-checked") : null,
        boxAt: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } : null,
        strike: getComputedStyle(el.querySelector(".wb-map-text")).textDecorationLine,
        progress: progress && !progress.hidden ? progress.textContent : null,
        progressInk: progress ? getComputedStyle(progress).color : null,
        editing: document.activeElement && document.activeElement.isContentEditable,
      };
    }, id);

  async function menuRow(id, words) {
    // The topic's own menu by its key (Shift+F10), the ring's More: a
    // right-click on a topic opens the ring instead.
    await page.evaluate((nid) => {
      selectWbItem("object", nid);
      document.getElementById("whiteboard-container").focus();
    }, id);
    await page.keyboard.press("Shift+F10");
    await page.waitForTimeout(250);
    const found = await page.evaluate((w) => {
      const row = [...document.querySelectorAll(".wb-ctx-menu .menu-item")].find((b) => b.textContent.trim() === w);
      if (row) row.click();
      return Boolean(row);
    }, words);
    await page.waitForTimeout(500);
    await page.keyboard.press("Escape");
    return found;
  }

  // 1. The menu makes a task.
  const made = await menuRow(aId, "Make this a task");
  let a = await node(aId);
  ok("the topic menu's Make this a task gives the topic a box", made && a.task === "open" && a.boxShown && a.checked === "false", JSON.stringify({ made, task: a.task, shown: a.boxShown, checked: a.checked }));
  ok("the box is a target the size of the label's glyph or more", a.boxAt && a.boxAt.w >= 14 && a.boxAt.h >= 14, a.boxAt ? `${a.boxAt.w.toFixed(0)}x${a.boxAt.h.toFixed(0)}` : "none");
  await menuRow(bId, "Make this a task");
  let root = await node(rootId);
  ok("the trunk counts the tasks under it", root.progress === "0/2", String(root.progress));

  // 2. Pressing the box ticks it, with no drag and no rename.
  await page.mouse.click(a.boxAt.x, a.boxAt.y);
  await page.waitForTimeout(600);
  const ticked = await node(aId);
  ok("pressing the box ticks it", ticked.task === "done" && ticked.checked === "true", `${ticked.task} ${ticked.checked}`);
  ok("and strikes the label through", ticked.strike.includes("line-through"), ticked.strike);
  ok("without moving the topic or opening its editor", ticked.x === a.x && !ticked.editing, `x ${a.x} to ${ticked.x}, editing ${ticked.editing}`);
  root = await node(rootId);
  ok("the trunk's count follows: 1/2", root.progress === "1/2", String(root.progress));

  // 3. Undo unticks.
  await page.evaluate(() => document.getElementById("whiteboard-container").focus());
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(700);
  a = await node(aId);
  root = await node(rootId);
  ok("undo unticks it and the count goes back", a.task === "open" && root.progress === "0/2", `${a.task} ${root.progress}`);

  // 4. Both done: complete, in the success ink, readable on the board.
  await page.evaluate(async (list) => {
    for (const id of list) {
      const o = wbState.objects.find((x) => x.id === id);
      await wbMapSetTask(o, "done");
    }
  }, [aId, bId]);
  await page.waitForTimeout(500);
  root = await node(rootId);
  const ground = await page.evaluate(() => getComputedStyle(document.getElementById("whiteboard-container")).backgroundColor);
  const cr = ratio(rgb(root.progressInk), rgb(ground));
  ok("all done reads 2/2 in the success ink", root.progress === "2/2" && root.progressInk !== (await page.evaluate(() => getComputedStyle(document.body).getPropertyValue("--muted"))), `${root.progress} ${root.progressInk}`);
  ok("the count reads on the board (4.5:1)", cr >= 4.5, `${cr.toFixed(2)}:1, ${root.progressInk} on ${ground}`);

  // 5. Resetting the topic's look keeps the task.
  await page.evaluate(async (id) => {
    const o = wbState.objects.find((x) => x.id === id);
    await wbMapSetNodeStyle(o, { bold: true });
    await wbMapResetToBranch(id);
  }, aId);
  await page.waitForTimeout(500);
  a = await node(aId);
  ok("resetting the topic's look keeps the task", a.task === "done", String(a.task));

  // 6. Stop being a task.
  const stopped = await menuRow(bId, "Stop being a task");
  const b = await node(bId);
  root = await node(rootId);
  ok("Stop being a task takes the box away and the count follows", stopped && b.task === null && !b.boxShown && root.progress === "1/1", `${b.task} ${b.boxShown} ${root.progress}`);

  // 7. The Markdown export.
  const md = await page.evaluate(async () => (await api(`/whiteboard/boards/${window.currentBoardId}/export?format=markdown`)).text());
  ok("the Markdown export writes the task as a task-list item", md.includes("- [x] Write the post") && md.includes("- Book the room"), md.split("\n").slice(0, 6).join(" | "));
  const svg = await page.evaluate(() => wbBuildExportSvg("board").svg);
  ok("the picture export carries the box as a glyph", svg.includes("☑ Write the post"), "");

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`${pass} ok, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
