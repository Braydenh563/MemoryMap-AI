// INBOX 608: "when I drag select off the screen on the whiteboard and mind
// map ... it doesnt scroll down or up or the way I am dragging". On a board
// and on a map: (1) a marquee dragged into the bottom edge band and held for
// a second; (2) an item dragged into the right edge band and held. Measures
// how far the board panned (screen px) and, for the item, whether it stayed
// under the pointer (its screen box before and after the hold).
// Pass: both pan at least 200px in the hold, item drift under 3px.
const { boot } = require('./lib.js');
(async () => {
  const W = +(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  for (const type of ['board', 'map']) {
    const ids = await page.evaluate(async (type) => {
      await initWhiteboard();
      const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `edgepan ${type} ${Date.now()}`, type }) });
      const kind = type === 'map' ? 'topic' : 'text';
      const made = await apiJson('/whiteboard/objects', { method: 'POST', body: JSON.stringify({ board_id: board.id, kind, x: 0, y: 0, width: 160, height: 60, data: { content: 'Drag me', text: 'Drag me' } }) });
      await openWhiteboardBoard(board.id);
      await new Promise((r) => setTimeout(r, 600));
      const c = document.getElementById('whiteboard-container');
      d3.select(c).call(wbZoom.transform, d3.zoomIdentity.translate(c.clientWidth / 2 - 80, c.clientHeight / 2 - 30));
      await new Promise((r) => setTimeout(r, 300));
      return { board: board.id, obj: made.id };
    }, type);
    const box = await page.evaluate(() => {
      const r = document.getElementById('whiteboard-container').getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
    });
    const tf = () => page.evaluate(() => { const t = d3.zoomTransform(document.getElementById('whiteboard-container')); return { x: t.x, y: t.y }; });
    // (1) marquee, from bare canvas left of centre, into the bottom band.
    const sx = box.l + box.w * 0.25, sy = box.t + box.h * 0.4;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 10; i += 1) await page.mouse.move(sx + i * 4, sy + ((box.b - 6) - sy) * i / 10);
    const t0 = await tf();
    await page.waitForTimeout(1000);
    const t1 = await tf();
    const rectAlive = await page.evaluate(() => !!document.querySelector('.wb-marquee'));
    await page.mouse.up();
    await page.waitForTimeout(300);
    const marqueePan = Math.round(t0.y - t1.y);
    console.log(`${type} W${W}: marquee held in bottom band 1s: panned ${marqueePan}px, marquee drawn ${rectAlive} ${marqueePan >= 200 ? 'PASS' : 'FAIL'}`);
    // (2) item drag into the right band, from the same starting view.
    await page.keyboard.press('Escape');
    await page.evaluate(() => {
      const c = document.getElementById('whiteboard-container');
      d3.select(c).call(wbZoom.transform, d3.zoomIdentity.translate(c.clientWidth / 2 - 80, c.clientHeight / 2 - 30));
    });
    await page.waitForTimeout(300);
    const el = await page.$(`.wb-object[data-id="${ids.obj}"]`);
    const ib = await el.boundingBox();
    const px = ib.x + ib.width / 2, py = ib.y + ib.height / 2;
    await page.mouse.move(px, py);
    await page.mouse.down();
    for (let i = 1; i <= 12; i += 1) await page.mouse.move(px + ((box.r - 6) - px) * i / 12, py);
    await page.waitForTimeout(100);
    const before = await el.boundingBox();
    const u0 = await tf();
    await page.waitForTimeout(1000);
    const u1 = await tf();
    const after = await el.boundingBox();
    await page.mouse.up();
    await page.waitForTimeout(600);
    const itemPan = Math.round(u0.x - u1.x);
    const drift = Math.round(Math.hypot((after.x - before.x), (after.y - before.y)));
    const saved = await page.evaluate((id) => {
      const o = (wbState.objects || []).find((x) => x.id === id);
      return o ? Math.round(o.x) : null;
    }, ids.obj);
    console.log(`${type} W${W}: item held in right band 1s: panned ${itemPan}px, item drift under pointer ${drift}px, x now ${saved} ${itemPan >= 200 && drift < 3 ? 'PASS' : 'FAIL'}`);
  }
  await browser.close();
})();
