// The board's context bar on one line (INBOX 576, the owner: "this menu's
// elements arent aligned vertically"): for every selection kind, each shown
// control's vertical centre is within 1px of its line's (the bar's, or on a
// wrapped bar its row's), and the controls of
// one role (fields, selects, swatches, switches, icon buttons) share one
// height. A map topic's bar is the map's own strip (the mind map agent's).
// At 1440 and 390 (W=390), light and dark (THEME=dark).
//   BASE=http://127.0.0.1:8845 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wb1005-barline.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();
const W = Number(process.env.W || 1440);

(async () => {
  const { browser, page, errors, board } = await openBoard({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const ids = await page.evaluate(async (bid) => {
    const post = (url, body) => apiJson(url, { method: "POST", body: JSON.stringify({ ...body, board_id: bid }) });
    const rect = (x, y) => `M ${x} ${y} L ${x + 140} ${y} L ${x + 140} ${y + 80} L ${x} ${y + 80} Z`;
    const shape = (await post("/whiteboard/sketches", { data: JSON.stringify({ d: rect(200, 300), shape: "rect", color: "#335599", width: 2, fill: "#ffcc00" }), x: 0, y: 0, z: 1 })).id;
    const shape2 = (await post("/whiteboard/sketches", { data: JSON.stringify({ d: rect(600, 300), shape: "rect", color: "#335599", width: 2 }), x: 0, y: 0, z: 1 })).id;
    const ink = (await post("/whiteboard/sketches", { data: JSON.stringify({ d: "M 200 600 L 300 640 L 400 600", shape: "pen", color: "#aa2222", width: 3 }), x: 0, y: 0, z: 1 })).id;
    const arrow = (await post("/whiteboard/sketches", { data: JSON.stringify({ d: "M 500 600 L 700 640", shape: "arrow", color: "#222222", width: 3, endCap: "arrow" }), x: 0, y: 0, z: 1 })).id;
    const link = (await post("/whiteboard/sketches", { data: JSON.stringify({ type: "link-straight", sourceId: shape, sourceKind: "sketch", targetId: shape2, targetKind: "sketch" }), x: 0, y: 0, z: 1 })).id;
    const text = (await post("/whiteboard/objects", { kind: "text", data: { content: "Some words" }, x: 200, y: 800, width: 200, height: 80, z: 2 })).id;
    const sticky = (await post("/whiteboard/objects", { kind: "text", data: { content: "Sticky", bg: "#fff2a8" }, x: 500, y: 800, width: 160, height: 160, z: 2 })).id;
    const frame = (await post("/whiteboard/objects", { kind: "frame", data: { content: "A frame" }, x: 900, y: 600, width: 300, height: 200, z: 0 })).id;
    //: A picture: a small PNG drawn here and uploaded as this notebook's own
    //: media (the upload checks the file, so a real one).
    const cv = document.createElement("canvas");
    cv.width = cv.height = 32;
    cv.getContext("2d").fillRect(0, 0, 32, 32);
    const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
    const form = new FormData();
    form.append("file", new File([blob], "dot.png", { type: "image/png" }));
    form.append("direct", "true");
    const media = await (await fetch("/media/upload", { method: "POST", body: form, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } })).json();
    const image = (await post("/whiteboard/objects", { kind: "image", data: { url: media.url }, x: 1300, y: 300, width: 120, height: 120, z: 2 })).id;
    await fetchWhiteboardState();
    renderWhiteboardNow();
    return { shape, ink, arrow, link, text, sticky, frame, image };
  }, board.id);

  const kinds = [["shape", "sketch", ids.shape], ["ink", "sketch", ids.ink], ["line", "sketch", ids.arrow], ["connector", "sketch", ids.link],
    ["text", "object", ids.text], ["sticky", "object", ids.sticky], ["frame", "object", ids.frame], ["image", "object", ids.image], ["multi", null, null]];
  for (const [name, kind, id] of kinds) {
    const out = await page.evaluate(async ([kind, id, all]) => {
      clearWbSelection();
      if (kind) {
        const item = wbFindItem(kind, id);
        const box = wbItemBBox(kind, item) || wbLinkSelectionBox(item);
        const c = document.getElementById("whiteboard-container");
        const k = d3.zoomTransform(c).k;
        d3.select(c).call(wbZoom.translateTo, (box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2 + 60 / k);
        selectWbItem(kind, id);
      } else {
        wbMultiSelection.add(wbMultiKey("sketch", all.shape));
        wbMultiSelection.add(wbMultiKey("object", all.text));
        wbApplySelectionHighlight();
        wbUpdateSelectionBar();
      }
      await new Promise((r) => setTimeout(r, 400));
      const bar = document.getElementById("wb-context");
      if (bar.classList.contains("hidden")) return { hidden: true };
      const br = bar.getBoundingClientRect();
      const mid = br.top + br.height / 2;
      const shown = (el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden" && !el.closest(".hidden, [hidden]");
      };
      const role = (el) => {
        if (el.matches("input[type=color]")) return "swatch";
        if (el.matches("input[type=number]")) return "field";
        if (el.matches("input[type=checkbox]")) return "switch";
        if (el.matches("input[type=range]")) return "range";
        if (el.matches(".enhanced-select-btn, .select-btn, button[aria-haspopup='listbox']")) return "select";
        if (el.matches(".wb-context-label, .wb-snap-label > span")) return "label";
        if (el.matches("button.icon-only")) return "icon";
        if (el.matches("button")) return "button";
        return null;
      };
      const controls = [];
      for (const el of bar.querySelectorAll(":scope > .wb-context-group *")) {
        if (el.closest(".wb-board-menu")) continue;
        const r = role(el);
        if (!r || !shown(el)) continue;
        const rr = el.getBoundingClientRect();
        //: A wrapped bar (a phone, a multi-selection) has several lines: each
        //: control is held to its own line's centre, which is its group's
        //: (a group stretches to the line), and one line holds to the bar's.
        const line = el.closest(".wb-context-group").getBoundingClientRect();
        const centre = br.height > 60 ? line.top + line.height / 2 : mid;
        controls.push({ role: r, id: el.id || el.className.toString().slice(0, 40) || el.tagName, h: Math.round(rr.height * 10) / 10, off: Math.round((rr.top + rr.height / 2 - centre) * 10) / 10 });
      }
      return { controls, barH: br.height };
    }, [kind, id, ids]);
    if (out.hidden) {
      check(`${name}: the bar shows`, false, out);
      continue;
    }
    const off = out.controls.filter((c) => Math.abs(c.off) > 1);
    check(`${name}: every control on the bar's centre line (within 1px)`, off.length === 0, off);
    const byRole = {};
    for (const c of out.controls) (byRole[c.role] ||= new Set()).add(c.h);
    const mixed = Object.entries(byRole).filter(([r, hs]) => r !== "label" && hs.size > 1).map(([r, hs]) => [r, [...hs]]);
    check(`${name}: one height per kind of control`, mixed.length === 0, { mixed, controls: out.controls });
  }
  check("no console errors", errors.length === 0, errors);
  summary();
  await browser.close();
})();
