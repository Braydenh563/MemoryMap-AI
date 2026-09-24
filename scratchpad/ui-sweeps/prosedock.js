// The suggestions panel, docked at the bottom or on the right (INBOX 410).
// The owner, 2026-09-24: "allow the suggestions panel to be docked on the
// right instead if the user wishes."
//
// Measures, at 1440x900: the panel under the editor by default; the head's
// toggle moving it to a column beside the editor (the editor gives up width,
// not height); the grip resizing it by drag, by the arrow keys and back with a
// double click; the side and the width surviving a reload; and at 390 wide
// the panel under the editor whatever was chosen, with no toggle offered.
//
// Usage: BASE=http://127.0.0.1:8792 [THEME=dark] node prosedock.js
const { boot } = require("./lib.js");

let bad = 0;
let good = 0;
const ok = (n, c, d) => {
  if (c) good += 1;
  else bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};
const J = JSON.stringify;
const DOC = "# Dock\n\nThis sentance has a typo. It it repeats a word.\n\n" + "A line of text to fill the page.\n".repeat(40);

const geom = (page) =>
  page.evaluate(() => {
    const r = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) };
    };
    const panel = document.getElementById("doc-prose-panel");
    const dock = panel.querySelector(".doc-prose-dock");
    return {
      editor: r(document.getElementById("doc-source-wrap")),
      panes: r(document.getElementById("doc-panes")),
      panel: r(panel),
      inPanes: panel.parentElement.id === "doc-panes",
      handle: r(document.querySelector(".doc-prose-resize")),
      dock: dock ? { label: dock.getAttribute("aria-label"), shown: getComputedStyle(dock).display !== "none" } : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });

async function openDoc(page) {
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(1500);
  await page.evaluate(async (c) => {
    const list = await apiJson("/documents");
    const found = (Array.isArray(list) ? list : list.items || []).find((d) => d.title === "Dock");
    const id = found ? found.id : (await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Dock", content: c, file_type: "md" }) })).id;
    await loadDocuments(id);
  }, DOC);
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const p = document.getElementById("doc-prose-panel");
    if (p.classList.contains("hidden")) document.getElementById("doc-prose").click();
  });
  await page.waitForTimeout(400);
}

(async () => {
  let { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => { localStorage.removeItem("docProseDock"); localStorage.removeItem("docProseWidth"); });
  await openDoc(page);

  let g = await geom(page);
  ok("by default the panel is under the editor", !g.inPanes && g.panel.y >= g.editor.b, J({ editor: g.editor, panel: g.panel }));
  ok("with a toggle in its head offering the right", g.dock?.shown && g.dock.label === "Dock the suggestions on the right", J(g.dock));
  const before = g;
  await page.click(".doc-prose-dock");
  await page.waitForTimeout(400);
  g = await geom(page);
  ok("the toggle moves it to a column beside the editor", g.inPanes && g.panel.x >= g.editor.r && Math.abs(g.panel.y - g.editor.y) <= 2, J({ editor: g.editor, panel: g.panel }));
  ok("the editor gives up width, not height", g.editor.h > before.editor.h && g.editor.w < before.editor.w, J({ before: before.editor, after: g.editor }));
  ok("the column is the default width and the pane's height", Math.abs(g.panel.w - 320) <= 1 && Math.abs(g.panel.h - g.panes.h) <= 2, J({ panel: g.panel, panes: g.panes }));
  ok("the toggle now offers the bottom, and keeps focus", g.dock.label === "Dock the suggestions at the bottom" && (await page.evaluate(() => document.activeElement?.classList.contains("doc-prose-dock"))), J(g.dock));
  ok("the grip sits between them", !!g.handle && g.handle.x >= g.editor.r - 1 && g.handle.r <= g.panel.x + 1, J(g.handle));
  ok("nothing scrolls sideways", !g.overflowX);

  // Drag the grip 100px left: 100px wider.
  const hx = g.handle.x + g.handle.w / 2;
  const hy = g.handle.y + 200;
  await page.mouse.move(hx, hy);
  await page.mouse.down();
  await page.mouse.move(hx - 50, hy, { steps: 4 });
  await page.mouse.move(hx - 100, hy, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  g = await geom(page);
  ok("dragging the grip left widens the column", Math.abs(g.panel.w - 420) <= 2, J(g.panel.w));
  await page.focus(".doc-prose-resize");
  await page.keyboard.press("ArrowRight");
  g = await geom(page);
  ok("ArrowRight on the grip narrows it by a step", Math.abs(g.panel.w - 408) <= 2, J(g.panel.w));
  await page.mouse.move(-1, -1);
  // Past half the row is refused.
  await page.evaluate(() => docProseApplyWidth(5000));
  g = await geom(page);
  ok("never more than half the row", g.panel.w <= Math.round(g.panes.w / 2) + 1, J({ panel: g.panel.w, panes: g.panes.w }));
  await page.dblclick(".doc-prose-resize");
  await page.waitForTimeout(150);
  g = await geom(page);
  ok("a double click resets it", Math.abs(g.panel.w - 320) <= 1, J(g.panel.w));
  await page.evaluate(() => docProseApplyWidth(380));

  // A row opened in the right dock opens in place.
  await page.evaluate(() => document.querySelector("#doc-prose-panel .doc-prose-jump")?.click());
  await page.waitForTimeout(300);
  const open = await page.evaluate(() => {
    const a = document.querySelector("#doc-prose-panel .doc-prose-answers:not(.hidden)");
    const p = document.getElementById("doc-prose-panel");
    return { answers: !!a, fits: a ? a.getBoundingClientRect().right <= p.getBoundingClientRect().right + 1 : false };
  });
  ok("a row's answers open inside the column", open.answers && open.fits, J(open));
  const shotDir = (process.env.SCRATCH || ".") + "/shots";
  await page.screenshot({ path: `${shotDir}/prosedock-right-${process.env.THEME || "light"}.png` });

  // Reload: the side and the width are remembered.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#lock-password", { state: "visible", timeout: 20000 }).catch(() => {});
  if (await page.$("#lock-password:visible")) {
    await page.fill("#lock-password", "testpassword123");
    await page.click("#lock-submit");
  }
  await page.waitForTimeout(2500);
  await openDoc(page);
  g = await geom(page);
  ok("after a reload it is still on the right, at its width", g.inPanes && Math.abs(g.panel.w - 380) <= 1, J({ inPanes: g.inPanes, w: g.panel.w }));

  // Back to the bottom.
  await page.click(".doc-prose-dock");
  await page.waitForTimeout(300);
  g = await geom(page);
  ok("the toggle puts it back under the editor", !g.inPanes && g.panel.y >= g.editor.b && !g.handle, J({ panel: g.panel, handle: g.handle }));
  await page.click(".doc-prose-dock");
  await page.waitForTimeout(200);
  await browser.close();

  // A phone: always under the editor, and no toggle.
  ({ browser, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => localStorage.setItem("docProseDock", "right"));
  await openDoc(page);
  g = await geom(page);
  ok("on a phone it is under the editor even when right was chosen", !g.inPanes && !(g.dock && g.dock.shown), J({ inPanes: g.inPanes, dock: g.dock }));
  ok("and nothing scrolls sideways", !g.overflowX);

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
