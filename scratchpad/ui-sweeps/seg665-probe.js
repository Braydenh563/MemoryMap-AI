// INBOX 665 probe: the map topic bar's rows, measured. Opens a themed map,
// selects a branch, opens each door and prints every row's height against
// one control's, so a wrapped row shows as a number, not a screenshot.
//   BASE=... THEME=dark W=1440 OUT=<dir> node scratchpad/ui-sweeps/seg665-probe.js
const { boot, openBoardsTab } = require('./lib.js');
const W = Number(process.env.W || 1440);
(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: 900 } });
  await openBoardsTab(page, ['initWhiteboard', 'wbMapTidyFresh', 'wbWireMapChoices']);
  const kid = await page.evaluate(async () => {
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `seg ${Date.now()}`, type: 'map', layout: 'tree-right' }) });
    const root = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'Centre' }) });
    const kid = await apiJson(`/whiteboard/boards/${board.id}/nodes`, { method: 'POST', body: JSON.stringify({ kind: 'topic', text: 'A branch', parent_id: root.id }) });
    await apiJson(`/whiteboard/boards/${board.id}`, { method: 'PUT', body: JSON.stringify({ theme: { shape: 'pill', spine: 'none', font_size: 19 } }) });
    await openWhiteboardBoard(board.id);
    await wbMapTidyFresh();
    return kid.id;
  });
  const b = await (await page.$(`.wb-object[data-id="${kid}"]`)).boundingBox();
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  await page.waitForTimeout(500);
  const out = process.env.OUT;
  console.log(await page.evaluate(() => {
    const r = document.getElementById('wb-map-strip').getBoundingClientRect();
    const kids = [...document.getElementById('wb-map-strip').children].filter((k) => k.offsetParent).map((k) => {
      const kr = k.getBoundingClientRect();
      return `${k.className || k.tagName}:${Math.round(kr.width)}x${Math.round(kr.height)}`;
    });
    return `bar ${Math.round(r.width)}x${Math.round(r.height)} [${kids.join(' ')}]`;
  }));
  if (out) await page.screenshot({ path: `${out}/bar-${W}.png` });
  for (const door of ['Text', 'Shape', 'Branch line']) {
    await page.evaluate((d) => [...document.querySelectorAll('#wb-map-strip [data-wb-menu-toggle]')].find((x) => x.textContent.trim() === d).click(), door);
    await page.waitForTimeout(400);
    console.log(await page.evaluate(() => {
      const menu = [...document.querySelectorAll('.wb-map-strip-menu')].find((m) => !m.classList.contains('hidden'));
      if (!menu) return 'no menu';
      const mr = menu.getBoundingClientRect();
      const rows = [...menu.querySelectorAll('.wb-menu-row')].filter((r) => r.offsetParent).map((r) => {
        const rr = r.getBoundingClientRect();
        const label = r.firstElementChild.textContent.trim();
        const ctl = r.lastElementChild.getBoundingClientRect();
        const btns = [...r.querySelectorAll('button')].filter((x) => x.offsetParent);
        const tops = new Set(btns.map((x) => Math.round(x.getBoundingClientRect().top)));
        return `  ${label}: row ${Math.round(rr.height)} control x${Math.round(ctl.left - mr.left)} ${Math.round(ctl.width)}x${Math.round(ctl.height)} lines ${tops.size} btnH ${btns.map((x) => Math.round(x.getBoundingClientRect().height)).join(',')}`;
      });
      return `${menu.id} ${Math.round(mr.width)}x${Math.round(mr.height)}\n${rows.join('\n')}`;
    }));
    if (out) await page.screenshot({ path: `${out}/${door.replace(' ', '')}-${W}.png` });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  }
  await browser.close();
})();
