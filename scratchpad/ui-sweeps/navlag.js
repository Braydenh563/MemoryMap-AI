// The board overview's redraw cost per pan frame on a 60-topic map: the pan
// path (boxes reused) against a fresh measure (what every pan did before).
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `nav ${Date.now()}`, type: "map" }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    for (let i = 0; i < 60; i++) {
      await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ board_id: board.id, kind: "topic", x: (i % 10) * 220, y: Math.floor(i / 10) * 90, width: 170, height: 52, data: { content: `Topic ${i}` } }) });
    }
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    wbToggleNavigator(true);
    const container = document.getElementById("whiteboard-container");
    const time = (pan) => {
      const t0 = performance.now();
      for (let i = 0; i < 60; i++) {
        container.style.transform = `translateX(${i % 2}px)`; // dirty layout, as a pan does
        wbRenderNavigator({ pan });
      }
      container.style.transform = "";
      return Math.round((performance.now() - t0) / 60 * 100) / 100;
    };
    return { items: wbNavContent().items.length, freshMs: time(false), panMs: time(true) };
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
