// MINDMAP_PLAN.md decision 18: a note behind a topic.
//
// A map of a trunk and two branches. The topic menu's "Add a note…" opens the
// help popover's shell beside the topic with one text box in it; what is typed
// there is the note's (Tab and Enter add no topic); Escape closes and saves,
// and the topic wears a note mark; the mark opens the note again, anchored to
// it; a press elsewhere saves an edit; undo takes it back; emptying it removes
// it; a reset of the topic's look keeps it; Markdown writes it as a paragraph
// under the topic. Contrast of the mark and the popover's words, and the
// popover inside the window.
//
//   BASE=http://127.0.0.1:8857 SCRATCH=/tmp/x THEME=light [WIDTH=390] \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapnotes.js
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
//: `color(srgb 1 1 1)` is how Chromium reports a colour out of `color-mix`.
const rgb = (s) => {
  const parts = (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  return String(s).startsWith("color(srgb") ? parts.map((v) => v * 255) : parts;
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
  const mapId = await page.evaluate(async () =>
    (await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Notes sweep", type: "map", layout: "tree-right" }) })).id
  );
  await page.evaluate((bid) => openWhiteboardBoard(bid), mapId);
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  const ids = await page.evaluate(async () => {
    const root = wbMapIndex().roots[0] || (await wbMapCreateNode({ parentId: null, text: "Trip" }));
    const a = await wbMapCreateNode({ parentId: root.id, text: "Pack" });
    const b = await wbMapCreateNode({ parentId: root.id, text: "Go" });
    await wbMapTidy({ quiet: true });
    renderWhiteboardNow();
    if (typeof wbZoomToFit === "function") wbZoomToFit();
    return { root: root.id, a: a.id, b: b.id };
  });
  await page.waitForTimeout(800);

  const state = () =>
    page.evaluate((id) => {
      const o = wbState.objects.find((x) => x.id === id);
      const el = document.querySelector(`.wb-object[data-id="${id}"]`);
      const mark = el.querySelector(".wb-map-note");
      const r = mark && !mark.hidden ? mark.getBoundingClientRect() : null;
      const panel = document.getElementById("wb-map-note-peek");
      const pr = panel ? panel.getBoundingClientRect() : null;
      return {
        note: o.data.note || null,
        mark: r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, bottom: r.bottom, top: r.top } : null,
        panel: pr ? { left: pr.left, right: pr.right, top: pr.top, bottom: pr.bottom } : null,
        popover: panel ? panel.classList.contains("help-popover") && panel.getAttribute("role") === "dialog" : false,
        focusInBox: document.activeElement && document.activeElement.classList.contains("wb-map-note-text"),
        focusOnMark: document.activeElement === mark,
        objects: wbState.objects.length,
      };
    }, id);
  const id = ids.a;

  async function menuRow(nid, words) {
    await page.evaluate((x) => {
      selectWbItem("object", x);
      document.getElementById("whiteboard-container").focus();
    }, nid);
    await page.keyboard.press("Shift+F10");
    await page.waitForTimeout(250);
    const found = await page.evaluate((w) => {
      const row = [...document.querySelectorAll(".wb-ctx-menu .menu-item")].find((b) => b.textContent.trim() === w);
      if (row) row.click();
      return Boolean(row);
    }, words);
    await page.waitForTimeout(400);
    return found;
  }

  // 1. The menu opens the popover, the text box focused.
  const made = await menuRow(id, "Add a note…");
  let s = await state();
  ok("the topic menu's Add a note opens the help popover with the box focused", made && s.popover && s.focusInBox, JSON.stringify({ made, popover: s.popover, focus: s.focusInBox }));
  const inside = s.panel && s.panel.left >= 0 && s.panel.right <= width && s.panel.top >= 0 && s.panel.bottom <= (phone ? 844 : 900);
  ok("the popover is inside the window", inside, JSON.stringify(s.panel));

  // 2. Typing is the note's: Tab and Enter add no topic.
  const before = s.objects;
  await page.keyboard.type("Passport, charger.");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Tickets.");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(300);
  s = await state();
  ok("Tab and Enter in the note add no topic", s.objects === before, `${before} to ${s.objects}`);

  // 3. Escape closes and saves; the mark appears and takes the focus.
  await page.evaluate(() => document.querySelector(".wb-map-note-text").focus());
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  s = await state();
  ok("Escape closes and saves the note", !s.panel && s.note === "Passport, charger.\nTickets.", JSON.stringify(s.note));
  ok("the topic wears the note mark, and the focus is on it", Boolean(s.mark) && s.focusOnMark, JSON.stringify({ mark: s.mark, focus: s.focusOnMark }));
  //: In the map's own units: on a phone the map is zoomed to fit, and the
  //: canvas zoom scales every mark on it alike (the task box's rule).
  const zoom = await page.evaluate(() => d3.zoomTransform(document.getElementById("whiteboard-container")).k || 1);
  const mw = s.mark ? s.mark.w / zoom : 0;
  const mh = s.mark ? s.mark.h / zoom : 0;
  ok("the mark is a target of 14px or more at 100%", mw >= 14 && mh >= 14, `${mw.toFixed(0)}x${mh.toFixed(0)} (zoom ${zoom.toFixed(2)})`);

  // 4. The mark opens it again, anchored to the mark.
  await page.mouse.click(s.mark.x, s.mark.y);
  await page.waitForTimeout(500);
  s = await state();
  const value = await page.evaluate(() => document.querySelector(".wb-map-note-text")?.value);
  const near = s.panel && (Math.abs(s.panel.top - s.mark.bottom) <= 24 || Math.abs(s.mark.top - s.panel.bottom) <= 24);
  ok("the mark opens the note with its text, hung from the mark", value === "Passport, charger.\nTickets." && near, JSON.stringify({ value, panel: s.panel, mark: s.mark }));

  // 5. Contrast: the popover's words, the box's text, the mark at rest (the
  // pointer off it, so it is not the hover's accent being measured). Every
  // colour goes through a canvas pixel, so `oklch()` and `color(srgb)` are
  // read as what is painted rather than parsed as text.
  await page.mouse.move(2, 2);
  await page.waitForTimeout(200);
  const inks = await page.evaluate((nid) => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 1;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    const px = (c) => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = "#000";
      cx.fillStyle = c;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return `rgb(${d[0]}, ${d[1]}, ${d[2]})`;
    };
    const ground = (el) => {
      for (let e = el; e; e = e.parentElement) {
        const bg = getComputedStyle(e).backgroundColor;
        const m = bg.match(/[\d.]+/g);
        if (m && (m.length < 4 || Number(m[3]) > 0.5)) return bg;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const hint = document.querySelector(".wb-map-note-hint");
    const box = document.querySelector(".wb-map-note-text");
    const mark = document.querySelector(`.wb-object[data-id="${nid}"] .wb-map-note`);
    return {
      hint: [px(getComputedStyle(hint).color), px(ground(hint))],
      box: [px(getComputedStyle(box).color), px(ground(box))],
      mark: [px(getComputedStyle(mark).color), px(ground(mark))],
    };
  }, id);
  for (const [name, [ink, ground]] of Object.entries(inks)) {
    const need = name === "mark" ? 3 : 4.5;
    const cr = ratio(rgb(ink), rgb(ground));
    ok(`${name} reads (${need}:1)`, cr >= need, `${cr.toFixed(2)}:1, ${ink} on ${ground}`);
  }

  // 6. A press elsewhere saves an edit.
  await page.evaluate(() => {
    const box = document.querySelector(".wb-map-note-text");
    box.value = "Passport, charger, tickets.";
  });
  const blank = await page.evaluate(() => {
    //: Empty canvas, found rather than assumed: on a phone the corners
    //: hold the tool bar and the zoom bar, and a press there opens them.
    const host = document.getElementById("whiteboard-container");
    const r = host.getBoundingClientRect();
    const panel = document.getElementById("wb-map-note-peek")?.getBoundingClientRect();
    for (let y = r.top + 40; y < r.bottom - 40; y += 20) {
      for (let x = r.left + 20; x < r.right - 20; x += 20) {
        if (panel && x >= panel.left && x <= panel.right && y >= panel.top && y <= panel.bottom) continue;
        const el = document.elementFromPoint(x, y);
        if (el && host.contains(el) && !el.closest(".wb-object, button, .card, .glass, [role=toolbar]")) return { x, y };
      }
    }
    return { x: r.left + r.width / 2, y: r.top + 40 };
  });
  await page.mouse.click(blank.x, blank.y);
  await page.waitForTimeout(800);
  s = await state();
  ok("a press elsewhere closes and saves the edit", !s.panel && s.note === "Passport, charger, tickets.", JSON.stringify(s.note));

  // 7. Undo takes the edit back.
  await page.evaluate(() => document.getElementById("whiteboard-container").focus());
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(800);
  s = await state();
  ok("undo takes the edit back", s.note === "Passport, charger.\nTickets.", JSON.stringify(s.note));

  // 8. A reset of the topic's look keeps it; Markdown writes it.
  await page.evaluate(async (nid) => {
    const o = wbState.objects.find((x) => x.id === nid);
    await wbMapSetNodeStyle(o, { bold: true });
    await wbMapResetToBranch(nid);
  }, id);
  await page.waitForTimeout(500);
  s = await state();
  ok("resetting the topic's look keeps the note", s.note === "Passport, charger.\nTickets.", JSON.stringify(s.note));
  const md = await page.evaluate(async () => (await api(`/whiteboard/boards/${window.currentBoardId}/export?format=markdown`)).text());
  ok("Markdown writes the note as a paragraph under the topic", md.includes("  - Pack\n\n    Passport, charger.\n    Tickets.\n"), JSON.stringify(md.slice(0, 120)));

  // 9. Emptied, it goes.
  const reopened = await menuRow(id, "Open the note…");
  const opened = await page.evaluate(() => {
    const box = document.querySelector(".wb-map-note-text");
    if (box) box.value = "";
    return {
      box: Boolean(box),
      focus: document.activeElement?.className || document.activeElement?.tagName,
      open: [...document.querySelectorAll(".wb-ctx-menu, .sheet-overlay, .modal-overlay, .action-menu, .kebab-menu")]
        .filter((e) => e.getClientRects().length).map((e) => `${e.className} ${e.getAttribute("aria-label") || ""} ${e.textContent.slice(0, 60)}`),
    };
  });
  if (!reopened || !opened.box) console.log("    reopen:", reopened, JSON.stringify(opened));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);
  s = await state();
  ok("an emptied note is removed with its mark", s.note === null && !s.mark, JSON.stringify({ note: s.note, panel: s.panel }));

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`${pass} ok, ${fail} failed`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
