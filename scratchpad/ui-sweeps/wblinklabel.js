// WHITEBOARD_PLAN decision 13: a label on a connector.
//
// Two stickies joined by a straight connector. Enter on the selected
// connector opens a one-line editor; "Yes" and Enter saves it on the link and
// draws it at the middle of the line. Then the label is followed through
// what a connector goes through: an end dragged (mid-drag and after), a bend,
// undo, the right-click menu's words, the export (with its halo) and the
// contrast on the board. A double-click on the line still bends it.
//
//   BASE=http://127.0.0.1:8850 SCRATCH=/tmp/x THEME=light \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wblinklabel.js
const { boot } = require("./lib.js");

let pass = 0;
let fail = 0;
function ok(label, good, detail) {
  if (good) pass += 1;
  else fail += 1;
  console.log(`${good ? "OK  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
}
function lum([r, g, b]) {
  const f = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
const rgb = (s) => (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById("wb-boards-new").click());
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", "Link label sweep");
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");

  const ids = await page.evaluate(async () => {
    const board = window.currentBoardId;
    const post = async (path, body) => apiJson(path, { method: "POST", body: JSON.stringify(body) });
    const a = await post("/whiteboard/objects", { kind: "text", board_id: board, x: 200, y: 200, width: 160, height: 90, data: { content: "Ready?", bg: "#fff3a8" } });
    const b = await post("/whiteboard/objects", { kind: "text", board_id: board, x: 640, y: 220, width: 160, height: 90, data: { content: "Ship it", bg: "#fff3a8" } });
    const link = await post("/whiteboard/sketches", {
      board_id: board, x: 0, y: 0, z: 1,
      data: JSON.stringify({ type: "link-straight", sourceId: a.id, targetId: b.id, sourceKind: "object", targetKind: "object", color: "#335577" }),
    });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    clearWbSelection();
    return { a: a.id, b: b.id, link: link.id };
  });
  await page.waitForTimeout(500);

  const state = () =>
    page.evaluate((id) => {
      const s = wbState.sketches.find((x) => x.id === id);
      const g = document.querySelector(`.sketch-group[data-id="${id}"]`);
      const path = g.querySelector(".sketch-path");
      const shaft = path.getAttribute("d").split(/\s(?=M)/)[0];
      const m = document.createElementNS("http://www.w3.org/2000/svg", "path");
      m.setAttribute("d", shaft);
      document.getElementById("wb-svg-layer").appendChild(m);
      const mid = m.getPointAtLength(m.getTotalLength() / 2);
      m.remove();
      // The middle in screen pixels, to compare with the label's box.
      const ctm = path.getScreenCTM();
      const sm = { x: ctm.a * mid.x + ctm.c * mid.y + ctm.e, y: ctm.b * mid.x + ctm.d * mid.y + ctm.f };
      const label = g.querySelector(".wb-link-label");
      const r = label ? label.getBoundingClientRect() : null;
      return {
        label: JSON.parse(s.data).label || null,
        drawn: label ? label.textContent : null,
        gap: r ? Math.max(Math.abs(r.left + r.width / 2 - sm.x), Math.abs(r.top + r.height / 2 - sm.y)) : Infinity,
        ink: label ? getComputedStyle(label).fill : null,
        chordMid: (() => {
          const all = path.getAttribute("d").match(/-?\d+(\.\d+)?/g).map(Number);
          return { x: (all[0] + all[all.length - 2]) / 2, y: (all[1] + all[all.length - 1]) / 2 };
        })(),
        mid: { x: mid.x, y: mid.y },
      };
    }, ids.link);

  // 1. Enter on the selected connector opens a one-line editor.
  await page.evaluate((id) => {
    selectWbItem("sketch", id);
    document.getElementById("whiteboard-container").focus();
  }, ids.link);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(250);
  const editor = await page.evaluate(() => {
    const el = document.querySelector(".wb-shape-label-editor.wb-link-label-editor");
    return el ? { focused: document.activeElement === el, multi: el.getAttribute("aria-multiline") } : null;
  });
  ok("Enter on a selected connector opens its label editor", Boolean(editor && editor.focused && editor.multi === "false"), JSON.stringify(editor));

  // 2. Typed, Shift+Enter is not a line break, Enter saves.
  await page.keyboard.type("Yes");
  await page.keyboard.press("Shift+Enter");
  await page.waitForTimeout(500);
  let st = await state();
  ok("Enter (Shift or not) saves one line on the link and draws it", st.label === "Yes" && st.drawn === "Yes", `${st.label} / ${st.drawn}`);
  ok("at the middle of the line (within 2px)", st.gap <= 2, `gap ${st.gap.toFixed(1)}px`);

  // 3. An end dragged: the label follows mid-drag and after.
  const b = await page.evaluate((id) => {
    const r = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + 12 };
  }, ids.b);
  await page.evaluate(() => wbSelectToolRef("select"));
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await page.mouse.move(b.x + 40, b.y + 160, { steps: 10 });
  await page.waitForTimeout(120);
  const mid = await state();
  await page.mouse.up();
  await page.waitForTimeout(700);
  const after = await state();
  ok("dragging an end carries the label with the line, mid-drag", mid.gap <= 2 && Math.abs(mid.mid.y - st.mid.y) > 40, `gap ${mid.gap.toFixed(1)}px, middle moved ${(mid.mid.y - st.mid.y).toFixed(0)}`);
  ok("and after it lands", after.gap <= 2, `gap ${after.gap.toFixed(1)}px`);

  // 4. A bent line keeps its label on the curve, not on the chord.
  await page.evaluate(async (id) => {
    const s = wbState.sketches.find((x) => x.id === id);
    await wbSaveSketchProps(s, { bend: { x: 0, y: -200 } });
    renderWhiteboardNow();
  }, ids.link);
  await page.waitForTimeout(400);
  const bent = await state();
  const offChord = Math.hypot(bent.mid.x - bent.chordMid.x, bent.mid.y - bent.chordMid.y);
  ok("on a bent line the label sits on the curve", bent.gap <= 2 && offChord > 40, `gap ${bent.gap.toFixed(1)}px, ${offChord.toFixed(0)} off the chord`);

  // 5. The menu, and undo.
  await page.evaluate((id) => selectWbItem("sketch", id), ids.link);
  const pt = await page.evaluate((id) => {
    const p = document.querySelector(`.sketch-group[data-id="${id}"] .sketch-path`);
    const len = p.getTotalLength();
    const q = p.getPointAtLength(len * 0.3);
    const ctm = p.getScreenCTM();
    return { x: ctm.a * q.x + ctm.c * q.y + ctm.e, y: ctm.b * q.x + ctm.d * q.y + ctm.f };
  }, ids.link);
  await page.mouse.click(pt.x, pt.y, { button: "right" });
  await page.waitForTimeout(300);
  const words = await page.evaluate(() =>
    [...document.querySelectorAll(".wb-ctx-menu:not(.hidden) .menu-item")].map((x) => x.textContent.trim())
  );
  ok("the connector's right-click menu offers to edit its label", words.includes("Edit the label"), words.join(", "));
  await page.keyboard.press("Escape");

  // 6. The export carries it, haloed.
  const svg = await page.evaluate(() => wbBuildExportSvg("board").svg);
  const tag = (svg.match(/<text[^>]*>Yes<\/text>/) || [""])[0];
  ok("the export carries the label with its ink and halo", /fill="rgb/.test(tag) && /paint-order="stroke"/.test(tag) && !/var\(/.test(tag), tag.slice(0, 200));

  // 7. Contrast against the board.
  const ground = await page.evaluate(() => getComputedStyle(document.getElementById("whiteboard-container")).backgroundColor);
  const cr = ratio(rgb(bent.ink), rgb(ground));
  ok("the label reads on the board (4.5:1)", cr >= 4.5, `${cr.toFixed(2)}:1, ${bent.ink} on ${ground}`);

  // 8. Undo the bend, then the label.
  await page.evaluate(() => document.getElementById("whiteboard-container").focus());
  for (let i = 0; i < 3; i += 1) {
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(400);
  }
  const undone = await state();
  ok("undo takes the label back off", undone.label === null && undone.drawn === null, `${undone.label} / ${undone.drawn}`);

  // 9. A double-click on the line still bends it rather than opening the editor.
  const pt2 = await page.evaluate((id) => {
    const p = document.querySelector(`.sketch-group[data-id="${id}"] .sketch-path`);
    const q = p.getPointAtLength(p.getTotalLength() * 0.4);
    const ctm = p.getScreenCTM();
    return { x: ctm.a * q.x + ctm.c * q.y + ctm.e, y: ctm.b * q.x + ctm.d * q.y + ctm.f };
  }, ids.link);
  await page.mouse.dblclick(pt2.x, pt2.y);
  await page.waitForTimeout(500);
  const dbl = await page.evaluate((id) => ({
    editor: Boolean(document.querySelector(".wb-shape-label-editor")),
    bend: JSON.parse(wbState.sketches.find((x) => x.id === id).data).bend || null,
  }), ids.link);
  ok("a double-click on the line still bends it", !dbl.editor && Boolean(dbl.bend), JSON.stringify(dbl));

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`${pass} ok, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
