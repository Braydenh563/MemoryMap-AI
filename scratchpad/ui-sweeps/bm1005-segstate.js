// Prints each strip segment row's pressed buttons against its select's value,
// for one selected topic: a row with two pressed, or a pressed one that is
// not the select's value, is a mirror out of step.
const { boot, openBoardsTab } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({});
  // The Boards sub-tab, picked and waited for (lib.js `openBoardsTab`): the Library
  // reopens on its last sub-tab, and `wbFormatSyncSoon` is not loaded at open any more.
  await openBoardsTab(page, ['initWhiteboard', 'wbMapTidyFresh', 'wbWireMapChoices']);
  const kid = await page.evaluate(async () => {
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `seg ${Date.now()}`, type: 'map', layout: 'tree-right' }) });
    const root = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'Centre' }) });
    const kid = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'A branch', parent_id: root.id }) });
    await openWhiteboardBoard(board.id);
    await wbMapTidyFresh();
    return kid.id;
  });
  const b = await (await page.$(`.wb-object[data-id="${kid}"]`)).boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(400);
  const report = () => page.evaluate(() => [...document.querySelectorAll('.wb-map-choices')].map((seg) => {
    const select = seg.parentElement.querySelector('select');
    const pressed = [...seg.querySelectorAll('button')].filter((x) => x.getAttribute('aria-pressed') === 'true').map((x) => x.title);
    const shown = [...seg.querySelectorAll('button')].filter((x) => getComputedStyle(x).backgroundColor !== 'rgba(0, 0, 0, 0)').map((x) => x.title);
    return `${select.id}="${select.value}" pressed [${pressed}] filled [${shown}]`;
  }).join('\n'));
  console.log(await report());
  await page.evaluate(() => [...document.querySelectorAll('.wb-map-choices button')].find((x) => x.title === 'Pill').click());
  await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll('.wb-map-choices button')].find((x) => x.title === 'Box').click());
  await page.waitForTimeout(400);
  await page.evaluate(() => [...document.querySelectorAll('#wb-map-strip [data-wb-menu-toggle]')].find((x) => x.textContent.trim() === 'Shape').click());
  await page.waitForTimeout(400);
  console.log(await page.evaluate(() => [...document.querySelectorAll('#wb-map-shape-menu .wb-map-choices button')].map((x) => { const c = getComputedStyle(x); return `${x.title}: bg ${c.backgroundColor} shadow ${c.boxShadow} border ${c.borderTopWidth} ${c.borderTopColor} pressed ${x.getAttribute('aria-pressed')} focus ${x.matches(':focus')} hover ${x.matches(':hover')}`; }).join('\n')));
  console.log('--- after Pill then Box');
  console.log(await report());
  await browser.close();
})();
