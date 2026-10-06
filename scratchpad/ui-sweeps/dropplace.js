// dropplace (INBOX 664): where a thing placed from the Library lands against
// the pointer, on a board and on a map, at zoom 0.5, 1 and 2 with the view
// panned. "The owner, 2026-10-06: Placing coordinates of templates on the
// mindmap and whiteboard could be improved (little off from the cursor)."
//
// For each kind, the placed item's rendered box (getBoundingClientRect of its
// elements, union) is measured against where it should be:
//   drag, grab at the thumbnail's centre: the box's centre under the pointer;
//   drag, grab at a quarter of the thumbnail: the box's quarter point under it;
//   click (no drag): the box's centre at the middle of the canvas you can see
//     (the canvas less the side panel that sits over it).
// Error = distance in screen px. One Ctrl+Z after each must take the whole
// placement away (one undo step per drop).
//
// Tiles are dragged with the real mouse (Chromium's own HTML5 drag); the icon
// and emoji picker, a note and an image file are dropped as DragEvents with a
// DataTransfer, since their sources are not tiles in this panel.
//
//   bash scratchpad/ui-sweeps/serve.sh 8812 /tmp/mm-dp
//   BASE=http://127.0.0.1:8812 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/dropplace.js
//   ONLY=board|map to run one half; ZOOMS=1 to run one zoom.
const { openBoard } = require("./wb1005-lib.js");

const ZOOMS = (process.env.ZOOMS || "0.5,1,2").split(",").map(Number);
const rows = [];
const fails = [];
const LIMIT = 2;

function record(surface, kind, how, k, err, extra = "") {
  const e = err == null ? null : Math.round(err * 10) / 10;
  rows.push({ surface, kind, how, k, err: e, extra });
  console.log(`${surface.padEnd(5)} ${kind.padEnd(16)} ${how.padEnd(12)} k=${String(k).padEnd(4)} err=${e == null ? "none" : String(e).padStart(6)}px ${extra}`);
}

async function setView(page, k) {
  await page.evaluate((k) => {
    const c = document.getElementById("whiteboard-container");
    // Panned off the origin, by an amount that is not a round number.
    d3.select(c).call(wbZoom.transform, d3.zoomIdentity.translate(137, -83).scale(k));
    wbClearCanvasRectCache?.();
  }, k);
  await page.waitForTimeout(250);
}

// The canvas you can see: the container less the chrome docked over it (the
// top bar, the side rail and its panel, the bottom tool dock), measured here
// independently of the app's own helper.
async function visibleRect(page) {
  return page.evaluate(() => {
    const c = document.getElementById("whiteboard-container").getBoundingClientRect();
    const box = (id) => {
      const el = document.getElementById(id);
      if (!el || !el.offsetParent) return null;
      const r = el.getBoundingClientRect();
      return r.width && r.height ? r : null;
    };
    let { left, top, right, bottom } = c;
    const bar = box("wb-topbar"), side = box("wb-sidebar"), dock = box("wb-tools-panel");
    if (bar) top = Math.max(top, bar.bottom);
    if (side) left = Math.max(left, side.right);
    if (dock) bottom = Math.min(bottom, dock.top);
    return { left, top, right, bottom };
  });
}

async function snapshot(page) {
  return page.evaluate(() => ({
    o: (wbState.objects || []).map((x) => x.id),
    s: (wbState.sketches || []).map((x) => x.id),
    n: (wbState.nodes || []).map((x) => x.id),
  }));
}

// Waits for the placement, then the union of its rendered boxes in screen px.
async function placedBox(page, before, timeout = 6000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const got = await page.evaluate((b) => {
      const newO = (wbState.objects || []).filter((x) => !b.o.includes(x.id));
      const newS = (wbState.sketches || []).filter((x) => !b.s.includes(x.id) && !/"type"\s*:\s*"link-/.test(x.data));
      const newN = (wbState.nodes || []).filter((x) => !b.n.includes(x.id));
      if (!newO.length && !newS.length && !newN.length) return null;
      const boxes = [];
      for (const o of newO) boxes.push(document.querySelector(`#wb-html-layer .wb-object[data-id="${o.id}"]`));
      for (const s of newS) boxes.push(document.querySelector(`#wb-svg-layer g.sketch-group[data-id="${s.id}"]`));
      for (const n of newN) boxes.push(document.querySelector(`.node-card[data-id="${n.id}"]`));
      let l = Infinity, t = Infinity, r = -Infinity, btm = -Infinity, seen = 0;
      for (const el of boxes) {
        if (!el) continue;
        // A sketch group: its visible path only (a hit area is wider).
        const shape = el.matches("g") ? (el.querySelector("path:not(.wb-hit):not([stroke='transparent'])") || el) : el;
        const q = shape.getBoundingClientRect();
        if (!q.width && !q.height) continue;
        seen++;
        l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); btm = Math.max(btm, q.bottom);
      }
      if (seen < boxes.length) return null;
      return { l, t, r, b: btm, count: boxes.length };
    }, before);
    if (got) {
      await page.waitForTimeout(500);
      // Read again after a beat: a map tidies after it places.
      const again = await page.evaluate((b) => {
        const ids = [];
        const els = [];
        for (const o of (wbState.objects || []).filter((x) => !b.o.includes(x.id))) els.push(document.querySelector(`#wb-html-layer .wb-object[data-id="${o.id}"]`));
        for (const s of (wbState.sketches || []).filter((x) => !b.s.includes(x.id) && !/"type"\s*:\s*"link-/.test(x.data))) els.push(document.querySelector(`#wb-svg-layer g.sketch-group[data-id="${s.id}"]`));
        for (const n of (wbState.nodes || []).filter((x) => !b.n.includes(x.id))) els.push(document.querySelector(`.node-card[data-id="${n.id}"]`));
        let l = Infinity, t = Infinity, r = -Infinity, btm = -Infinity;
        for (const el of els) {
          if (!el) continue;
          const shape = el.matches("g") ? (el.querySelector("path:not(.wb-hit):not([stroke='transparent'])") || el) : el;
          const q = shape.getBoundingClientRect();
          if (!q.width && !q.height) continue;
          l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); btm = Math.max(btm, q.bottom);
        }
        return { l, t, r, b: btm, count: els.length };
      }, before);
      return again;
    }
    await page.waitForTimeout(150);
  }
  return null;
}

async function undoGone(page, before) {
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(700);
  const now = await snapshot(page);
  return now.o.length === before.o.length && now.s.length === before.s.length && now.n.length === before.n.length;
}

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

async function tileThumb(page, ref) {
  return page.evaluate((ref) => {
    const tile = document.querySelector(`#wb-lib-list .wb-lib-tile[data-ref="${ref}"]`);
    if (!tile) return null;
    const det = tile.closest("details");
    if (det && !det.open) det.open = true;
    tile.scrollIntoView({ block: "center" });
    // The thumbnail's drawn shape (its paths and boxes, not its words): the
    // same geometry the placed item is measured by.
    const svg = tile.querySelector("svg.wb-lib-thumb");
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const el of svg.querySelectorAll("path, rect")) {
      const q = el.getBoundingClientRect();
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom);
    }
    return { box: [l, t, r - l, b - t] };
  }, ref);
}

async function dragTile(page, ref, grabFrac, target) {
  const th = await tileThumb(page, ref);
  if (!th) return false;
  const [bx, by, bw, bh] = th.box;
  const gx = bx + bw * grabFrac[0], gy = by + bh * grabFrac[1];
  await page.mouse.move(gx, gy);
  await page.mouse.down();
  await page.mouse.move(gx + 8, gy + 4, { steps: 2 });
  await page.mouse.move(target[0], target[1], { steps: 12 });
  await page.mouse.up();
  return true;
}

async function synthDrop(page, at, payload) {
  await page.evaluate(async ({ at, payload }) => {
    const dt = new DataTransfer();
    if (payload.file) {
      // A 40x30 PNG drawn on a canvas.
      const c = document.createElement("canvas");
      c.width = 40; c.height = 30;
      c.getContext("2d").fillRect(0, 0, 40, 30);
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      dt.items.add(new File([blob], "dp.png", { type: "image/png" }));
    } else {
      dt.setData(payload.type, payload.value);
    }
    const target = document.elementFromPoint(at[0], at[1]);
    const opts = { bubbles: true, cancelable: true, composed: true, clientX: at[0], clientY: at[1], dataTransfer: dt };
    target.dispatchEvent(new DragEvent("dragenter", opts));
    target.dispatchEvent(new DragEvent("dragover", opts));
    target.dispatchEvent(new DragEvent("drop", opts));
  }, { at, payload });
}

async function boardHalf() {
  const { browser, page, errors } = await openBoard({ type: "board", title: "dp-board" });
  await page.evaluate(() => wbOpenSidebar("library"));
  await page.waitForTimeout(1200);
  const note = await page.evaluate(async () => (await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "# Drop me\n\nA note for the drop sweep.", category: "General" }) })).id);
  const tiles = [
    ["rect", "builtin:general/rect"],
    ["star", "builtin:general/star"],
    ["sticky", "builtin:general/sticky-yellow"],
    ["cloud", "builtin:general/cloud"],
    ["tpl-flow", "builtin:templates/flow"],
    ["tpl-kanban", "builtin:templates/kanban"],
    ["frame-timeline", "builtin:frames/timeline"],
  ];
  for (const k of ZOOMS) {
    await setView(page, k);
    const vis = await visibleRect(page);
    const target = [Math.round(vis.left + (vis.right - vis.left) * 0.55), Math.round(vis.top + (vis.bottom - vis.top) * 0.5)];
    const mid = [(vis.left + vis.right) / 2, (vis.top + vis.bottom) / 2];
    for (const [name, ref] of tiles) {
      // Drag, grab at the centre.
      let before = await snapshot(page);
      await dragTile(page, ref, [0.5, 0.5], target);
      let box = await placedBox(page, before);
      if (!box) { record("board", name, "drag-centre", k, null, "nothing placed"); fails.push(`${name} drag k=${k}`); }
      else {
        const c = [(box.l + box.r) / 2, (box.t + box.b) / 2];
        const err = dist(c, target);
        record("board", name, "drag-centre", k, err, `d=(${(c[0] - target[0]).toFixed(1)},${(c[1] - target[1]).toFixed(1)})`);
        if (err > LIMIT) fails.push(`${name} drag-centre k=${k} ${err.toFixed(1)}`);
        if (!(await undoGone(page, before))) fails.push(`${name} drag undo k=${k}`);
      }
      // Drag, grab at a quarter.
      before = await snapshot(page);
      await dragTile(page, ref, [0.25, 0.25], target);
      box = await placedBox(page, before);
      if (box) {
        const q = [box.l + (box.r - box.l) * 0.25, box.t + (box.b - box.t) * 0.25];
        const err = dist(q, target);
        record("board", name, "drag-quarter", k, err, `d=(${(q[0] - target[0]).toFixed(1)},${(q[1] - target[1]).toFixed(1)})`);
        if (err > LIMIT) fails.push(`${name} drag-quarter k=${k} ${err.toFixed(1)}`);
        if (!(await undoGone(page, before))) fails.push(`${name} quarter undo k=${k}`);
      } else record("board", name, "drag-quarter", k, null, "nothing placed");
      // Click.
      before = await snapshot(page);
      await page.evaluate((ref) => {
        wbLibState.libPlaceFanAt = 0; wbLibState.libLastClick = null; // a fresh click, not a run of them
        document.querySelector(`#wb-lib-list .wb-lib-tile[data-ref="${ref}"]`).click();
      }, ref);
      box = await placedBox(page, before);
      if (box) {
        const c = [(box.l + box.r) / 2, (box.t + box.b) / 2];
        const err = dist(c, mid);
        record("board", name, "click", k, err, `d=(${(c[0] - mid[0]).toFixed(1)},${(c[1] - mid[1]).toFixed(1)})`);
        if (err > LIMIT) fails.push(`${name} click k=${k} ${err.toFixed(1)}`);
        if (!(await undoGone(page, before))) fails.push(`${name} click undo k=${k}`);
      } else record("board", name, "click", k, null, "nothing placed");
    }
    // The icon and emoji picker's drag, a note, an image file.
    const synth = [
      ["icon", { type: "application/x-memorymap-icon", value: JSON.stringify({ kind: "icon", value: "acorn" }) }],
      ["emoji", { type: "application/x-memorymap-icon", value: JSON.stringify({ kind: "emoji", value: "\u{1F600}" }) }],
      ["note-card", { type: "text/plain", value: String(note) }],
      ["image", { file: true }],
    ];
    for (const [name, payload] of synth) {
      const before = await snapshot(page);
      await synthDrop(page, target, payload);
      const box = await placedBox(page, before, 8000);
      if (!box) { record("board", name, "drop", k, null, "nothing placed"); continue; }
      const c = [(box.l + box.r) / 2, (box.t + box.b) / 2];
      const err = dist(c, target);
      record("board", name, "drop", k, err, `d=(${(c[0] - target[0]).toFixed(1)},${(c[1] - target[1]).toFixed(1)}) size=${Math.round(box.r - box.l)}x${Math.round(box.b - box.t)}`);
      if (err > LIMIT) fails.push(`${name} drop k=${k} ${err.toFixed(1)}`);
      if (name === "note-card") {
        // A card is one per note per board: take it off for the next zoom.
        await page.evaluate(async (b) => {
          for (const n of (wbState.nodes || []).filter((x) => !b.n.includes(x.id))) await apiJson(`/whiteboard/nodes/${n.id}`, { method: "DELETE" }).catch(() => {});
          wbState.nodes = (wbState.nodes || []).filter((x) => b.n.includes(x.id));
          renderWhiteboardNow();
        }, before);
        await page.waitForTimeout(300);
      } else if (!(await undoGone(page, before))) fails.push(`${name} undo k=${k}`);
    }
  }
  // Two clicks in a row: the second does not land on the first.
  await setView(page, 1);
  const before = await snapshot(page);
  await page.evaluate(() => { wbLibState.libPlaceFanAt = 0; wbLibState.libLastClick = null; document.querySelector('#wb-lib-list .wb-lib-tile[data-ref="builtin:general/rect"]').click(); });
  const a = await placedBox(page, before);
  const mid = await snapshot(page);
  await page.evaluate(() => document.querySelector('#wb-lib-list .wb-lib-tile[data-ref="builtin:general/rect"]').click());
  const b = await placedBox(page, mid);
  const step = a && b ? dist([(a.l + a.r) / 2, (a.t + a.b) / 2], [(b.l + b.r) / 2, (b.t + b.b) / 2]) : null;
  record("board", "rect", "click-twice", 1, step, "distance between the two (must be > 0)");
  if (!step) fails.push("second click landed on the first");
  // A drop on the chrome over the canvas (the top bar, the panel the tile
  // came from) is not a drop on the board: nothing may land hidden under it.
  for (const id of ["wb-topbar", "wb-sidebar-panel", "wb-tools-panel"]) {
    const at = await page.evaluate((id) => {
      const r = document.getElementById(id).getBoundingClientRect();
      return [Math.round(r.left + r.width * 0.7), Math.round(r.top + r.height / 2)];
    }, id);
    const was = await snapshot(page);
    await dragTile(page, "builtin:general/rect", [0.5, 0.5], at);
    const box = await placedBox(page, was, 2500);
    record("board", "rect", `onto-${id.replace("wb-", "")}`, 1, null, box ? "PLACED (must not)" : "nothing placed (right)");
    if (box) { fails.push(`a drop on #${id} placed an item`); await undoGone(page, was); }
  }
  // Snap to grid on: the placed box's corner is on the 24-unit grid and its
  // grabbed point within half a step of the pointer (the one allowed
  // difference).
  await page.evaluate(() => { localStorage.setItem("wb-grid", "dots"); localStorage.setItem("wb-snap", "on"); });
  for (const k of [1, 2]) {
    await setView(page, k);
    const vis = await visibleRect(page);
    const target = [Math.round(vis.left + (vis.right - vis.left) * 0.55) + 7, Math.round(vis.top + (vis.bottom - vis.top) * 0.5) + 5];
    const was = await snapshot(page);
    await dragTile(page, "builtin:general/rect", [0.5, 0.5], target);
    const box = await placedBox(page, was);
    const corner = box && await page.evaluate((b) => {
      const o = (wbState.sketches || []).filter((s) => !b.s.includes(s.id)).map((s) => wbItemBBox("sketch", s))[0];
      return o ? [o.minX, o.minY] : null;
    }, was);
    const on = corner && corner.every((v) => Math.abs(v / 24 - Math.round(v / 24)) < 0.01);
    const err = box ? dist([(box.l + box.r) / 2, (box.t + box.b) / 2], target) : null;
    record("board", "rect-snap", "drag-centre", k, err, `corner ${JSON.stringify(corner)} on grid: ${on}; allowed <= ${(12 * Math.SQRT2 * k).toFixed(1)}px`);
    if (!on || err > 12 * Math.SQRT2 * k + 0.5) fails.push(`snap k=${k}`);
    if (box) await undoGone(page, was);
  }
  await page.evaluate(() => { localStorage.removeItem("wb-grid"); localStorage.removeItem("wb-snap"); });
  if (errors.length) console.log("ERRORS", errors.slice(0, 5));
  await browser.close();
}

async function mapHalf() {
  for (const withRoot of [false, true]) {
    const { browser, page, errors } = await openBoard({ type: "map", title: "dp-map" });
    await page.evaluate(() => wbOpenSidebar("library"));
    await page.waitForTimeout(1200);
    if (withRoot) {
      // A map with its own topic, off to the right of where things drop.
      await page.evaluate(async () => {
        const made = await apiJson("/whiteboard/objects", { method: "POST", body: JSON.stringify({ kind: "topic", board_id: window.currentBoardId, x: -600, y: -400, width: 180, height: 48, z: 1, data: { content: "Root" } }) });
        wbState.objects.push(made);
        await wbRefreshMapState?.();
        renderWhiteboardNow();
      });
      await page.waitForTimeout(600);
    }
    const label = withRoot ? "map+root" : "map";
    for (const k of ZOOMS) {
      await setView(page, k);
      const vis = await visibleRect(page);
      const target = [Math.round(vis.left + (vis.right - vis.left) * 0.55), Math.round(vis.top + (vis.bottom - vis.top) * 0.5)];
      const mid = [(vis.left + vis.right) / 2, (vis.top + vis.bottom) / 2];
      for (const [name, ref] of [["tpl-brainstorm", "builtin:maps/brainstorm"], ["tpl-meeting", "builtin:maps/meeting"], ["tpl-decision", "builtin:maps/decision"]]) {
        let before = await snapshot(page);
        await dragTile(page, ref, [0.5, 0.5], target);
        let box = await placedBox(page, before);
        if (box) {
          const c = [(box.l + box.r) / 2, (box.t + box.b) / 2];
          const err = dist(c, target);
          // No topic of the template drawn on top of another.
          const overlaps = await page.evaluate((b) => {
            const els = (wbState.objects || []).filter((x) => !b.o.includes(x.id)).map((o) => document.querySelector(`#wb-html-layer .wb-object[data-id="${o.id}"]`)?.getBoundingClientRect()).filter(Boolean);
            let n = 0;
            for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
              const a = els[i], q = els[j];
              if (a.left < q.right - 1 && q.left < a.right - 1 && a.top < q.bottom - 1 && q.top < a.bottom - 1) n++;
            }
            return n;
          }, before);
          if (overlaps) fails.push(`${label} ${name} k=${k}: ${overlaps} topics drawn over each other`);
          record(label, name, "drag-centre", k, err, `d=(${(c[0] - target[0]).toFixed(1)},${(c[1] - target[1]).toFixed(1)}) n=${box.count} overlaps=${overlaps}`);
          if (err > LIMIT && !withRoot) fails.push(`${label} ${name} drag k=${k} ${err.toFixed(1)}`);
          if (!(await undoGone(page, before))) fails.push(`${label} ${name} drag undo k=${k}`);
        } else record(label, name, "drag-centre", k, null, "nothing placed");
        before = await snapshot(page);
        await page.evaluate((ref) => { wbLibState.libPlaceFanAt = 0; wbLibState.libLastClick = null; document.querySelector(`#wb-lib-list .wb-lib-tile[data-ref="${ref}"]`).click(); }, ref);
        box = await placedBox(page, before);
        if (box) {
          const c = [(box.l + box.r) / 2, (box.t + box.b) / 2];
          const err = dist(c, mid);
          record(label, name, "click", k, err, `d=(${(c[0] - mid[0]).toFixed(1)},${(c[1] - mid[1]).toFixed(1)})`);
          if (err > LIMIT && !withRoot) fails.push(`${label} ${name} click k=${k} ${err.toFixed(1)}`);
          if (!(await undoGone(page, before))) fails.push(`${label} ${name} click undo k=${k}`);
        } else record(label, name, "click", k, null, "nothing placed");
      }
      for (const [name, payload] of [["emoji", { type: "application/x-memorymap-icon", value: JSON.stringify({ kind: "emoji", value: "\u{1F600}" }) }]]) {
        const before = await snapshot(page);
        await synthDrop(page, target, payload);
        const box = await placedBox(page, before, 8000);
        if (!box) { record(label, name, "drop", k, null, "nothing placed"); continue; }
        const c = [(box.l + box.r) / 2, (box.t + box.b) / 2];
        const err = dist(c, target);
        record(label, name, "drop", k, err, `d=(${(c[0] - target[0]).toFixed(1)},${(c[1] - target[1]).toFixed(1)})`);
        if (err > LIMIT) fails.push(`${label} ${name} drop k=${k} ${err.toFixed(1)}`);
        if (!(await undoGone(page, before))) fails.push(`${label} ${name} undo k=${k}`);
      }
    }
    if (errors.length) console.log("ERRORS", errors.slice(0, 5));
    await browser.close();
  }
}

(async () => {
  if (process.env.ONLY !== "map") await boardHalf();
  if (process.env.ONLY !== "board") await mapHalf();
  console.log(`\nfails: ${fails.length}`);
  for (const f of fails) console.log("  " + f);
  require("fs").writeFileSync((process.env.SCRATCH || ".") + "/dropplace.json", JSON.stringify(rows));
})();
