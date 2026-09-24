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
    // The ring is a pie menu (ccd1b48): every slot's own box is the whole
    // ring's square (clip-path only clips the paint, not the layout box), so
    // hovering a slot's own centre would put the pointer on the hole, over
    // every slot at once. Hover the middle of each slot's wedge instead,
    // from `_sector` (set by wbFitMapRadialBand) and the ring's own rect,
    // which is width:0 height:0 positioned at the ring's centre.
    const o = ring.getBoundingClientRect();
    const cs = getComputedStyle(ring, '::before');
    const outer = parseFloat(cs.width) / 2;
    const inner = outer - parseFloat(cs.borderTopWidth);
    const mid = (inner + outer) / 2;
    return {
      open: !ring.classList.contains('hidden'),
      slots: [...ring.querySelectorAll('.wb-map-radial-slot')].filter((b) => b._sector).map((b) => {
        const s = b._sector;
        return { id: b.id, x: Math.round(o.left + mid * Math.cos(s.at)), y: Math.round(o.top + mid * Math.sin(s.at)) };
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
