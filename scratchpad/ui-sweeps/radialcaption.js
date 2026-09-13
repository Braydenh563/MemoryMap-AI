// INBOX 180: the ring's slots say what they do. Opens the node ring on a map,
// hovers every slot, and reads the caption back.
const { boot, OUT } = require('./lib.js');
(async () => {
  const { page, browser } = await boot({ viewport: { width: 1280, height: 820 } });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const setup = await page.evaluate(async () => {
    const v = document.getElementById('library-view-whiteboard');
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle('hidden', s !== v);
    await initWhiteboard();
    const board = await apiJson('/whiteboard/boards', { method: 'POST', body: JSON.stringify({ name: `ring ${Date.now()}`, type: 'map' }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    const root = await apiJson('/whiteboard/objects', {
      method: 'POST',
      body: JSON.stringify({ board_id: board.id, kind: 'topic', x: 420, y: 320, width: 200, height: 56, data: { content: 'Root topic' } }),
    });
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 500));
    wbOpenMapRadial(wbState.objects.find((o) => o.id === root.id));
    await new Promise((r) => setTimeout(r, 300));
    const ring = document.getElementById('wb-map-radial');
    return {
      open: !ring.classList.contains('hidden'),
      slots: [...ring.querySelectorAll('.wb-map-radial-slot')].map((b) => {
        const r = b.getBoundingClientRect();
        return { id: b.id, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      }),
      captionAtRest: document.querySelector('#wb-map-radial .wb-map-radial-caption')?.textContent || '',
    };
  });
  console.log(`ring open ${setup.open}, slots ${setup.slots.length}, caption at rest "${setup.captionAtRest}"`);
  let named = 0;
  for (const slot of setup.slots) {
    await page.mouse.move(slot.x, slot.y);
    await page.waitForTimeout(120);
    const said = await page.evaluate(() => {
      const cap = document.querySelector('#wb-map-radial .wb-map-radial-caption');
      const r = cap.getBoundingClientRect();
      const slots = [...document.querySelectorAll('#wb-map-radial .wb-map-radial-slot')];
      const lowest = Math.max(...slots.map((b) => b.getBoundingClientRect().bottom));
      return {
        text: cap.textContent, w: Math.round(r.width), h: Math.round(r.height),
        clearOfSlots: Math.round(r.top - lowest),
        clipped: cap.scrollWidth > cap.clientWidth + 1,
        visible: cap.checkVisibility(),
      };
    });
    if (said.text) named += 1;
    if (said.clipped || said.clearOfSlots < 0) named -= 1;
    console.log(`  ${slot.id}: "${said.text}" (${said.w}x${said.h}, clear of the slots by ${said.clearOfSlots}px, clipped ${said.clipped})`);
  }
  await page.mouse.move(setup.slots[0].x, setup.slots[0].y);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/radialcaption-${process.env.THEME || 'light'}.png` });
  console.log(`${named}/${setup.slots.length} slots named; ${OUT}/radialcaption-${process.env.THEME || 'light'}.png`);
  await browser.close();
  process.exit(named === setup.slots.length ? 0 : 1);
})();
