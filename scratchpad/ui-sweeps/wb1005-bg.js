// FEAT-06: a board's background is the board's, survives a reload in a fresh
// browser, migrates the old localStorage keys once, undoes, and its image is
// not an orphan.
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-bg.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

(async () => {
  const first = await openBoard();
  const { page, board } = first;
  // Pick a colour as the picker does: input then change.
  await page.evaluate(() => {
    const picker = document.getElementById("wb-bg-color-picker");
    picker.value = "#224466";
    picker.dispatchEvent(new Event("input"));
    picker.dispatchEvent(new Event("change"));
  });
  await page.waitForTimeout(600);
  const stored = await page.evaluate(async (id) => (await apiJson(`/whiteboard/?board_id=${id}`)).background, board.id);
  check("the colour is on the board", stored.color === "#224466", stored);
  const drawn = await page.evaluate(() => getComputedStyle(document.getElementById("whiteboard-container")).getPropertyValue("--wb-board-bg").trim());
  check("and drawn", drawn === "#224466", drawn);
  check("nothing written to localStorage", await page.evaluate(() => localStorage.getItem("wb-bg-color") === null));
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(600);
  const undone = await page.evaluate(async (id) => (await apiJson(`/whiteboard/?board_id=${id}`)).background, board.id);
  check("Undo takes the colour off the board", !undone.color, undone);
  await page.evaluate(() => wbRedo());
  await page.waitForTimeout(600);
  // An image, through the same route the button uses after its upload.
  const url = await page.evaluate(async () => {
    const form = new FormData();
    const png = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));
    form.append("file", new Blob([png], { type: "image/png" }), "bg.png");
    const up = await apiJson("/media/upload", { method: "POST", headers: { "X-Auth-Token": authToken() }, body: form });
    await wbSetBackground({ image: up.url });
    return up.url;
  });
  await page.waitForTimeout(400);
  const orphans = await page.evaluate(async () => (await apiJson("/media/orphans")).orphans.map((o) => o.url));
  check("the background image is not an orphan", !orphans.includes(url), orphans);
  await first.browser.close();

  // A fresh browser (no localStorage) draws the same board the same way.
  const second = await openBoard();
  await second.page.evaluate(async (id) => { await openWhiteboardBoard(id); }, board.id);
  await second.page.waitForTimeout(1000);
  const look = await second.page.evaluate(() => {
    const el = document.getElementById("whiteboard-container");
    return { color: getComputedStyle(el).getPropertyValue("--wb-board-bg").trim(), image: el.style.getPropertyValue("--wb-bg-image") };
  });
  check("another browser draws the board's colour", look.color === "#224466", look);
  check("and its image", look.image.includes("/media/"), look);

  // Migration: an old per-board image key moves onto a board with none.
  const fresh = second.board;
  const moved = await second.page.evaluate(async ([id, url]) => {
    localStorage.setItem(`wb-bg-image-${id}`, url);
    await openWhiteboardBoard(id);
    await new Promise((r) => setTimeout(r, 800));
    return { bg: (await apiJson(`/whiteboard/?board_id=${id}`)).background, key: localStorage.getItem(`wb-bg-image-${id}`) };
  }, [fresh.id, url]);
  check("an old per-browser image moves onto the board once", moved.bg.image === url && moved.key === null, moved);
  check("no console errors", first.errors.length === 0 && second.errors.length === 0, [...first.errors, ...second.errors]);
  await second.browser.close();
  summary();
})();
