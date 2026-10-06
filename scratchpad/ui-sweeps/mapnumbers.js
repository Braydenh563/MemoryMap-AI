// MINDMAP_PLAN.md decision 17: a map can number its branches.
//
// A map of a trunk, three branches and two twigs. The View menu's "Number the
// branches" switch turns it on; the trunk has no number, the branches read 1,
// 2, 3 and the twigs 1.1, 1.2, quiet text before the label on its line; a
// reorder renumbers; the number is not part of what a rename edits; the
// setting survives reopening the map; Markdown and the picture carry it; off
// takes every number away; a board has no switch.
//
//   BASE=http://127.0.0.1:8857 SCRATCH=/tmp/x THEME=light [WIDTH=390] \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapnumbers.js
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
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const phone = width < 600;
  const { browser, page } = await boot({
    viewport: { width, height: phone ? 844 : 900 },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluate(() => document.querySelector('[data-tab="library"]').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-target="library-view-whiteboard"]').click());
  await page.waitForTimeout(700);
  const [mapId, boardId] = await page.evaluate(async () => {
    const m = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Numbers sweep", type: "map", layout: "tree-right" }) });
    const b = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Numbers board" }) });
    return [m.id, b.id];
  });
  const open = async (id) => {
    await page.evaluate((bid) => openWhiteboardBoard(bid), id);
    await page.waitForTimeout(1500);
    await page.keyboard.press("Escape");
  };
  await open(mapId);
  const ids = await page.evaluate(async () => {
    const root = wbMapIndex().roots[0] || (await wbMapCreateNode({ parentId: null, text: "Plan" }));
    const out = { root: root.id };
    out.a = (await wbMapCreateNode({ parentId: root.id, text: "Research" })).id;
    out.b = (await wbMapCreateNode({ parentId: root.id, text: "Write" })).id;
    out.c = (await wbMapCreateNode({ parentId: root.id, text: "Ship" })).id;
    out.a1 = (await wbMapCreateNode({ parentId: out.a, text: "Read the papers" })).id;
    out.a2 = (await wbMapCreateNode({ parentId: out.a, text: "Interview" })).id;
    // The trunk as a core idea, so the number's ink is also read on a
    // topic with a filled ground (its children are numbered, it is not).
    await wbMapSetNodeStyle(wbState.objects.find((o) => o.id === root.id), { core: true });
    await wbMapTidy({ quiet: true });
    renderWhiteboardNow();
    return out;
  });
  await page.waitForTimeout(700);

  const numbers = () =>
    page.evaluate((all) => {
      const out = {};
      for (const [k, id] of Object.entries(all)) {
        const el = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-number`);
        out[k] = el && !el.hidden && el.getClientRects().length ? el.textContent : "";
      }
      return out;
    }, ids);

  // 1. The switch is in the View menu's Map group, off.
  const sw = await page.evaluate(() => {
    document.querySelector('.wb-topbar [aria-controls="wb-view-menu"]').click();
    const box = document.getElementById("wb-map-numbered");
    const row = box?.closest(".wb-menu-row");
    const r = row?.getBoundingClientRect();
    const inView = r && r.width > 0 && r.bottom <= innerHeight && r.top >= 0;
    const res = { exists: Boolean(box), shown: Boolean(row && !row.closest("[hidden]") && r.width > 0), inView, checked: box?.checked, words: row?.textContent.trim() };
    return res;
  });
  ok("the View menu has a Number the branches switch on a map, off", sw.exists && sw.shown && sw.checked === false && sw.words === "Number the branches", JSON.stringify(sw));
  await page.evaluate(() => document.getElementById("wb-map-numbered").click());
  await page.waitForTimeout(800);
  await page.keyboard.press("Escape");
  let n = await numbers();
  ok("on: the trunk has none, branches 1 2 3, twigs 1.1 1.2",
    n.root === "" && n.a === "1" && n.b === "2" && n.c === "3" && n.a1 === "1.1" && n.a2 === "1.2", JSON.stringify(n));

  // 2. Placement: before the label, on its line.
  const place = await page.evaluate((id) => {
    const el = document.querySelector(`.wb-object[data-id="${id}"]`);
    const num = el.querySelector(".wb-map-number").getBoundingClientRect();
    const text = el.querySelector(".wb-map-text").getBoundingClientRect();
    return { gap: text.left - num.right, dy: Math.abs((num.top + num.bottom) / 2 - (text.top + text.bottom) / 2), textHasNumber: el.querySelector(".wb-map-text").textContent.includes("1.1") };
  }, ids.a1);
  ok("the number sits before the label on its line", place.gap >= 0 && place.dy <= 4, JSON.stringify(place));
  ok("and is not part of the label's text", !place.textHasNumber, "");

  // 3. Contrast of the number against the topic's own ground: a plain topic,
  // a twig, and a topic filled with its branch colour (the tint every theme
  // and palette entry puts under the number).
  await page.evaluate(async (list) => {
    for (const id of list) await wbMapSetNodeStyle(wbState.objects.find((o) => o.id === id), { fill: "self" });
    renderWhiteboardNow();
  }, [ids.b, ids.c]);
  await page.waitForTimeout(600);
  const inks = await page.evaluate((list) => {
    const ground = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const bg = getComputedStyle(e).backgroundColor;
        const m = bg.match(/[\d.]+/g);
        if (m && (m.length < 4 || Number(m[3]) > 0.5)) return bg;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    return list.map((id) => {
      const num = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-number`);
      return { id, ink: getComputedStyle(num).color, ground: ground(num) };
    });
  }, [ids.a, ids.a1, ids.b, ids.c]);
  for (const ink of inks) {
    //: `color(srgb 1 1 1)` is how Chromium reports a colour that came out
    //: of `color-mix`: channels from 0 to 1, not 0 to 255.
    const rgb = (s) => {
      const parts = (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
      return String(s).startsWith("color(srgb") ? parts.map((v) => v * 255) : parts;
    };
    const cr = ratio(rgb(ink.ink), rgb(ink.ground));
    ok(`the number reads on its topic (4.5:1)${ink.id === ids.b || ink.id === ids.c ? ", filled" : ""}`, cr >= 4.5, `${cr.toFixed(2)}:1, ${ink.ink} on ${ink.ground}`);
  }

  // 4. A reorder renumbers.
  await page.evaluate(async (id) => {
    selectWbItem("object", id);
    document.getElementById("whiteboard-container").focus();
  }, ids.c);
  await page.keyboard.press("Control+Shift+ArrowUp");
  await page.waitForTimeout(900);
  n = await numbers();
  ok("moving Ship up a place renumbers it 2 and Write 3", n.c === "2" && n.b === "3", JSON.stringify(n));
  await page.keyboard.press("Escape");

  // 5. A rename edits the name only.
  const editing = await page.evaluate((id) => {
    const text = document.querySelector(`.wb-object[data-id="${id}"] .wb-map-text`);
    text.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    const was = text.isContentEditable ? text.textContent : null;
    text.blur();
    return was;
  }, ids.a1);
  ok("a rename opens on the name without its number", editing === "Read the papers", String(editing));

  // 6. Exports.
  const md = await page.evaluate(async () => (await api(`/whiteboard/boards/${window.currentBoardId}/export?format=markdown`)).text());
  ok("Markdown writes the numbers", md.includes("  - 1 Research") && md.includes("    - 1.1 Read the papers") && md.includes("  - 2 Ship"), md.split("\n").slice(2, 8).join(" | "));
  const svg = await page.evaluate(() => wbBuildExportSvg("board").svg);
  ok("the picture carries the number before the label", svg.includes("1.1 Read the papers"), "");

  // 7. It is the map's: reopening keeps it.
  await open(boardId);
  const boardRow = await page.evaluate(() => {
    const row = document.getElementById("wb-map-numbered")?.closest(".wb-menu-row");
    return Boolean(row && !row.hidden);
  });
  ok("a board has no numbering switch", !boardRow, "");
  await open(mapId);
  n = await numbers();
  const checked = await page.evaluate(() => document.getElementById("wb-map-numbered").checked);
  ok("reopening the map keeps it numbered and the switch on", n.a === "1" && n.a2 === "1.2" && checked, JSON.stringify({ n, checked }));

  // 8. Off.
  await page.evaluate(() => wbMapSetNumbered(false));
  await page.waitForTimeout(700);
  n = await numbers();
  ok("off takes every number away", Object.values(n).every((v) => v === ""), JSON.stringify(n));

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`${pass} ok, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
