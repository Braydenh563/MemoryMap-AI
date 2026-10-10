// Boards and mind maps from the Library's Create: made through the template
// gallery, edited the way a person edits them (paste onto a board; Tab for a
// branch on a map), and still there, drawn, after a reload.
const { test, expect } = require("@playwright/test");
const { watchErrors, openApp, openTab, api } = require("../helpers");

async function createFromLibrary(page, row) {
  await openTab(page, "library");
  await page.click("#library-new-doc");
  await page.locator(".rich-picker-row", { hasText: row }).first().click();
  // The gallery is the board's own New dialog: no gallery, nothing made.
  await expect(page.locator("#wb-template-dialog")).toBeVisible();
  const name = `${row.replace("New ", "")} ${Date.now() % 100000}`;
  await page.fill("#wb-template-name", name);
  await page.click("#wb-template-create");
  let board;
  await expect
    .poll(async () => {
      board = (await api(page, "/whiteboard/boards")).find((b) => (b.title || b.name) === name);
      return !!board;
    })
    .toBe(true);
  // And it is the board on screen: the header's board picker holds it.
  await expect(page.locator(`select:has(option[data-title="${name}"])`)).toHaveValue(String(board.id));
  return board;
}

async function boardTexts(page, id) {
  const state = await api(page, `/whiteboard/?board_id=${id}`);
  return (state.objects || []).map((o) => (o.data && o.data.content) || o.text || "");
}

test("New board: pasted text becomes a text box that is there after a reload", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  const board = await createFromLibrary(page, "New board");
  const line = "Call the plumber about the boiler";
  await page.evaluate((t) => navigator.clipboard.writeText(t), line);
  // A click on the canvas, clear of the empty board's hint card.
  const view = await page.locator("#library-view-whiteboard").boundingBox();
  await page.mouse.click(view.x + 200, view.y + 200);
  await page.keyboard.press("Control+v");
  await expect.poll(() => boardTexts(page, board.id)).toContain(line);

  await openApp(page, `/#/library/board/${board.id}`);
  await expect(page.locator("#wb-canvas-view")).toContainText(line);
  expect(errors).toEqual([]);
});

test("New mind map: Tab adds a branch, typed and kept across a reload", async ({ page }) => {
  await openApp(page);
  const map = await createFromLibrary(page, "New mind map");
  // A new map selects its central topic; Tab makes a child and edits it.
  // The topic is selected a moment after the board picker shows the map (the
  // canvas is revealed only once the dialog is answered, INBOX 733), so the
  // spec waits for what a person sees before pressing Tab: a Tab sent first
  // moved focus off the map and added nothing.
  await expect(page.locator("#wb-canvas-view .wb-selected")).toHaveCount(1);
  await page.keyboard.press("Tab");
  await expect(page.locator('.wb-map-text[contenteditable]')).toBeFocused();
  await page.keyboard.type("First branch");
  // Plain Enter is a new line in a topic's name (the owner, 2026-10-10);
  // Escape keeps the name and leaves the editor, which is what saves it.
  await page.keyboard.press("Escape");
  await expect
    .poll(async () => {
      const tree = await api(page, `/whiteboard/boards/${map.id}/tree`);
      return tree.roots[0].children.map((c) => c.text);
    })
    .toEqual(["First branch"]);

  await openApp(page, `/#/library/board/${map.id}`);
  await expect(page.locator("#wb-canvas-view")).toContainText("First branch");
});
