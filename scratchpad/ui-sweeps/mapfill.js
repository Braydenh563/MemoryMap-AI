// A map topic's fill: "Fill this topic" and "Fill with its branch", driven
// through the strip's own select, measured as computed backgrounds and the
// label's contrast on them, then read back from the server.
//
//   BASE=http://127.0.0.1:8877 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   [THEME=dark] timeout 110 node scratchpad/ui-sweeps/mapfill.js
const { boot } = require("./lib.js");

let failed = 0;
function check(label, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

(async () => {
  const { page, browser } = await boot({ viewport: { width: 1440, height: 900 } });
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1500);

  const out = await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    const board = await apiJson("/whiteboard/boards", {
      method: "POST", body: JSON.stringify({ name: `fill ${Date.now()}`, type: "map" }),
    });
    window.currentBoardId = board.id;
    wbShowCanvasView();
    await fetchWhiteboardState(board.id);
    const mk = async (x, y, text, parent) => {
      const made = await apiJson("/whiteboard/objects", {
        method: "POST",
        body: JSON.stringify({ board_id: board.id, kind: "topic", x, y, width: 170, height: 52, data: { content: text } }),
      });
      if (parent) {
        await apiJson(`/whiteboard/boards/${board.id}/nodes/${made.id}/move`, {
          method: "PUT", body: JSON.stringify({ parent_id: parent }),
        });
      }
      return made;
    };
    const root = await mk(180, 360, "Root");
    const a = await mk(460, 200, "Branch filled", root.id);
    const a1 = await mk(740, 160, "Under the branch", a.id);
    const a11 = await mk(1000, 160, "Two down", a1.id);
    const b = await mk(460, 480, "Filled alone", root.id);
    const b1 = await mk(740, 480, "Under the lone one", b.id);
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 700));

    const lum = (rgb) => {
      const c = rgb.match(/[\d.]+/g).slice(0, 3).map((n) => {
        const v = +n / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    // `color-mix` computes to `color(srgb r g b)` in Chromium, 0..1 channels.
    const toRgb = (value) => {
      const srgb = value.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
      if (srgb) return `rgb(${srgb.slice(1, 4).map((n) => Math.round(+n * 255)).join(", ")})`;
      return value;
    };
    const read = (id) => {
      const node = document.querySelector(`.wb-object[data-id="${id}"]`);
      const cs = getComputedStyle(node);
      const bg = toRgb(cs.backgroundColor);
      const ink = toRgb(getComputedStyle(node.querySelector(".wb-map-text")).color);
      const [hi, lo] = [lum(bg), lum(ink)].sort((x, y) => y - x);
      return { filled: node.classList.contains("wb-map-filled"), bg, contrast: +((hi + 0.05) / (lo + 0.05)).toFixed(2) };
    };
    const choose = async (id, value) => {
      selectWbItem("object", id);
      await new Promise((r) => setTimeout(r, 200));
      const select = document.getElementById("wb-map-fill");
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 900));
    };
    const before = read(a1.id);
    await choose(a.id, "branch");
    await choose(b.id, "self");
    const after = Object.fromEntries([root, a, a1, a11, b, b1].map((n) => [n.content || n.data.content, read(n.id)]));
    selectWbItem("object", a1.id);
    await new Promise((r) => setTimeout(r, 200));
    const fillSelect = document.getElementById("wb-map-fill");
    const blankUnder = fillSelect.querySelector('option[value=""]').textContent;
    const hasNone = Boolean(fillSelect.querySelector('option[value="none"]'));
    await choose(a1.id, "none");
    const opted = { a1: read(a1.id).filled, a11: read(a11.id).filled };
    // Back from the server, as a reload would see it.
    await fetchWhiteboardState(board.id);
    renderWhiteboardNow();
    await new Promise((r) => setTimeout(r, 700));
    const reloaded = [a, a1, a11, b, b1].map((n) => read(n.id).filled);
    const tree = await apiJson(`/whiteboard/boards/${board.id}/tree`);
    // The extremes the colour picker can reach, on the lone filled topic.
    const extremes = {};
    for (const colour of ["#ffffff", "#000000", "#edc949"]) {
      const obj = wbState.objects.find((o) => o.id === b.id);
      obj.data = { ...obj.data, color: colour };
      renderWhiteboardNow();
      await new Promise((r) => setTimeout(r, 300));
      extremes[colour] = read(b.id).contrast;
    }
    return { before, after, blankUnder, hasNone, opted, reloaded, extremes, rootStyle: tree.roots[0].children.map((c) => c.style.fill) };
  });

  console.log(JSON.stringify(out, null, 1));
  const after = out.after;
  check("root stays unfilled", !after["Root"].filled);
  check("branch fill: the topic", after["Branch filled"].filled);
  check("branch fill: its child", after["Under the branch"].filled);
  check("branch fill: its grandchild", after["Two down"].filled);
  check("topic fill: the topic", after["Filled alone"].filled);
  check("topic fill: not its child", !after["Under the lone one"].filled);
  check("a filled background differs from an unfilled one", after["Under the branch"].bg !== out.before.bg, `${out.before.bg} -> ${after["Under the branch"].bg}`);
  for (const [name, r] of Object.entries(after)) check(`label contrast on "${name}" >= 4.5`, r.contrast >= 4.5, String(r.contrast));
  check("strip names the inherited fill", out.blankUnder === "Filled by its branch", out.blankUnder);
  check("strip offers No fill inside a filled branch", out.hasNone);
  check("No fill unfills the one topic, not its child", !out.opted.a1 && out.opted.a11);
  check("survives a refetch", JSON.stringify(out.reloaded) === JSON.stringify([true, false, true, true, false]), JSON.stringify(out.reloaded));
  for (const [colour, ratio] of Object.entries(out.extremes)) check(`label contrast on a ${colour} fill >= 4.5`, ratio >= 4.5, String(ratio));
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
