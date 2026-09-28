// A board card with a dark fill and no ink of its own: its text colour must
// read on the fill (light theme by default; THEME=dark for dark).
const {boot} = require("./lib");
(async () => {
  const {browser, page} = await boot({});
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);
  const out = await page.evaluate(async () => {
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `ink ${Date.now()}` }) });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    const res = [];
    for (const bg of ["#1e3a5f", "#2f3e1f", "#fff3a0"]) {
      await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ board_id: board.id, kind: "text", x: 100 + res.length * 260, y: 100, width: 220, height: 100, data: { content: "Rewrite the landing copy", bg } }) });
      res.push(bg);
    }
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 500));
    const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    return [...document.querySelectorAll(".wb-object .wb-text-content")].map((t) => {
      const obj = t.closest(".wb-object");
      const bg = getComputedStyle(obj).backgroundColor, ink = getComputedStyle(t).color;
      const [a, b] = [lum(bg), lum(ink)].sort((x, y) => y - x);
      return { bg, ink, contrast: +((a + 0.05) / (b + 0.05)).toFixed(2) };
    });
  });
  console.log(JSON.stringify(out));
  await browser.close();
})();
