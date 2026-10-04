// INBOX 445 (2): the mind map, audited from the keyboard at about sixty
// topics, then measured.
//
// The map is built with the keys alone (Tab for a child, Enter for a
// sibling, the arrows to walk back up), because keyboard node creation is
// the essential every map tool is judged on first, and the latency of each
// key (press to editor open) is reported. Then each of the map's keys is
// driven once and checked against the state it should leave; then pan, wheel
// zoom and a branch drag are measured the way wbaudit.js measures the board.
//
//   BASE=http://127.0.0.1:8798 SCRATCH=/tmp/mm-wb-a08 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbmapaudit.js
const { boot } = require("./lib.js");

const BRANCHES = Number(process.env.BRANCHES || 6);
const LEAVES = Number(process.env.LEAVES || 9);

async function newBoard(page, name, type) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  if (type === "map") await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
}

let pass = 0;
let fail = 0;
function ok(label, good, detail) {
  if (good) pass += 1;
  else fail += 1;
  console.log(`${good ? "OK  " : "FAIL"} ${label}${detail ? "  " + detail : ""}`);
}
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};
const p95 = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : 0;
};
const r1 = (x) => Math.round(x * 10) / 10;

const state = (page) =>
  page.evaluate(() => {
    const topics = (wbState.objects || []).filter((o) => o.kind === "topic");
    const sel = wbSelectedItem && wbSelectedItem.kind === "object" ? topics.find((o) => o.id === wbSelectedItem.id) : null;
    return {
      n: topics.length,
      sel: sel ? sel.id : null,
      selText: sel ? sel.data.content : null,
      parent: sel ? sel.parent_id : null,
      editing: Boolean(document.activeElement && document.activeElement.isContentEditable),
      tool: window.currentTool,
    };
  });

async function timedKey(page, key, until) {
  const t0 = Date.now();
  await page.keyboard.press(key);
  await page.waitForFunction(until, null, { timeout: 5000, polling: 10 }).catch(() => {});
  return Date.now() - t0;
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await newBoard(page, "Audit map", "map");

  const open = await state(page);
  ok("a new map opens with its root selected", open.sel !== null, JSON.stringify(open));

  // --- Build by keys ------------------------------------------------------
  const lat = [];
  const editorOpen = () => document.activeElement && document.activeElement.isContentEditable;
  for (let b = 0; b < BRANCHES; b++) {
    lat.push(await timedKey(page, "Tab", editorOpen));
    await page.keyboard.type(`Branch ${b}`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(120);
    lat.push(await timedKey(page, "Tab", editorOpen));
    await page.keyboard.type(`Leaf ${b}.0`);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(120);
    for (let l = 1; l < LEAVES; l++) {
      lat.push(await timedKey(page, "Enter", editorOpen));
      await page.keyboard.type(`Leaf ${b}.${l}`);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
    }
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(800);
  const built = await state(page);
  ok(`built ${1 + BRANCHES * (LEAVES + 1)} topics by keys`, built.n === 1 + BRANCHES * (LEAVES + 1), `have ${built.n}; key to editor median ${median(lat)}ms p95 ${p95(lat)}ms max ${Math.max(...lat)}ms`);
  const overlaps = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll("#wb-html-layer .wb-map-node")].map((e) => e.getBoundingClientRect());
    let n = 0;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) n += 1;
      }
    return n;
  });
  ok("no two topics overlap after building by keys", overlaps === 0, `${overlaps} overlapping pairs`);

  // --- Each map key once --------------------------------------------------
  await page.evaluate(() => { const r = wbMapIndex().roots[0]; selectWbItem("object", r.id); document.getElementById("whiteboard-container").focus(); });
  await page.keyboard.press("ArrowRight");
  const first = await state(page);
  ok("ArrowRight walks from the root to a branch", first.selText && first.selText.startsWith("Branch"), first.selText);
  await page.keyboard.press("ArrowDown");
  const second = await state(page);
  ok("ArrowDown walks to the next sibling", second.selText && second.selText !== first.selText, second.selText);
  const kidsBefore = await page.evaluate((id) => (wbState.objects || []).filter((o) => o.parent_id === id).length, second.sel);
  await page.keyboard.press("c");
  await page.waitForTimeout(500);
  const folded = await page.evaluate((id) => Boolean((wbState.objects || []).find((o) => o.id === id).data.collapsed), second.sel);
  const hidden = await page.evaluate(() => [...document.querySelectorAll("#wb-html-layer .wb-map-node")].length);
  ok("C folds a branch", folded, `${kidsBefore} children; ${hidden} topics drawn`);
  await page.keyboard.press("c");
  await page.waitForTimeout(500);
  ok("C again opens it", !(await page.evaluate((id) => Boolean((wbState.objects || []).find((o) => o.id === id).data.collapsed), second.sel)));
  // Reorder within siblings.
  const orderOf = () => page.evaluate((id) => {
    // Order as drawn: the rank of this topic's top among its siblings'.
    const me = wbState.objects.find((o) => o.id === id);
    const sibs = wbState.objects.filter((o) => o.parent_id === me.parent_id && o.kind === "topic");
    return sibs.filter((s) => s.y < me.y).length;
  }, second.sel);
  const o0 = await orderOf();
  await page.keyboard.press("Control+Shift+ArrowUp");
  await page.waitForTimeout(800);
  const o1 = await orderOf();
  ok("Ctrl+Shift+ArrowUp moves a topic up among its siblings", o1 < o0, `${o0} -> ${o1}`);
  const outlineOrder = () => page.evaluate(async () => {
    const tree = await apiJson(`/whiteboard/boards/${window.currentBoardId}/tree`);
    return tree.roots[0].children.map((n) => n.text);
  });
  ok("the tree endpoint reads the new order", (await outlineOrder())[0] === second.selText, (await outlineOrder()).slice(0, 3).join(", "));
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(1200);
  ok("one Ctrl+Z puts the order back", (await orderOf()) === o0, `${await orderOf()}`);
  // Enter on a middle topic adds right after it; Shift+Enter right before.
  const sibs = await page.evaluate((id) => {
    const me = wbState.objects.find((o) => o.id === id);
    return wbMapIndex().childrenOf.get(me.parent_id).map((o) => o.id);
  }, second.sel);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.activeElement && document.activeElement.isContentEditable, null, { timeout: 4000 }).catch(() => {});
  await page.keyboard.type("Inserted after");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const afterIns = await page.evaluate((pid) => wbMapIndex().childrenOf.get(pid).map((o) => o.data.content), await page.evaluate((id) => wbState.objects.find((o) => o.id === id).parent_id, second.sel));
  const at = sibs.indexOf(second.sel);
  ok("Enter adds the sibling right after the topic", afterIns[at + 1] === "Inserted after", afterIns.slice(0, 4).join(", "));
  await page.keyboard.press("Shift+Enter");
  await page.waitForFunction(() => document.activeElement && document.activeElement.isContentEditable, null, { timeout: 4000 }).catch(() => {});
  await page.keyboard.type("Inserted before");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const afterIns2 = await page.evaluate((pid) => wbMapIndex().childrenOf.get(pid).map((o) => o.data.content), await page.evaluate((id) => wbState.objects.find((o) => o.id === id).parent_id, second.sel));
  ok("Shift+Enter adds the sibling right before it", afterIns2.indexOf("Inserted before") === afterIns2.indexOf("Inserted after") - 1, afterIns2.slice(0, 5).join(", "));
  const overlaps2 = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll("#wb-html-layer .wb-map-node")].map((e) => e.getBoundingClientRect());
    let n = 0;
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j];
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) n += 1;
      }
    return n;
  });
  ok("no overlaps after inserting in the middle", overlaps2 === 0, `${overlaps2}`);
  await page.evaluate((id) => selectWbItem("object", id), second.sel);
  await page.keyboard.press("F2");
  await page.waitForTimeout(300);
  ok("F2 edits the topic", (await state(page)).editing);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const n0 = (await state(page)).n;
  await page.keyboard.press("Control+d");
  await page.waitForTimeout(1200);
  const n1 = (await state(page)).n;
  ok("Ctrl+D duplicates the topic", n1 > n0, `${n0} -> ${n1}`);
  const dup = await page.evaluate((src) => {
    const all = wbState.objects || [];
    const s = all.find((o) => o.id === src);
    const d = all.find((o) => o.id === wbSelectedItem?.id);
    return { srcParent: s?.parent_id ?? null, dupParent: d?.parent_id ?? null, same: d?.id !== src, text: d?.data?.text, srcText: s?.data?.text };
  }, second.sel);
  ok("the copy is a sibling, selected, with the same words", dup.same && dup.dupParent === dup.srcParent && dup.dupParent !== null && dup.text === dup.srcText, JSON.stringify(dup));
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(1200);
  const n2 = (await state(page)).n;
  ok("Ctrl+Z takes the duplicate back", n2 === n0, `${n1} -> ${n2}`);
  const selAfterUndo = (await state(page)).sel;
  ok("undoing the duplicate selects its parent", selAfterUndo === dup.srcParent, `${selAfterUndo}`);
  await page.evaluate((id) => selectWbItem("object", id), second.sel);
  await page.keyboard.press("Delete");
  await page.waitForTimeout(1000);
  const n3 = (await state(page)).n;
  // Delete takes the branch with it (`wbMapDeleteSubtree`, with an undo
  // rather than a confirm); "Remove topic" in the ring keeps the branch.
  ok("Delete removes the topic and its branch", n3 === n0 - 1 - kidsBefore, `${n0} -> ${n3}`);
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(3500);
  const n4 = (await state(page)).n;
  ok("Ctrl+Z restores it", n4 === n0, `${n3} -> ${n4}; undo stack ${await page.evaluate(() => wbUndoStack.map((e) => e.action).join(","))}`);
  const shape = await page.evaluate((text) => {
    const top = wbState.objects.find((o) => o.data && o.data.content === text);
    return top ? { kids: wbState.objects.filter((o) => o.parent_id === top.id).length, parent: top.parent_id } : null;
  }, second.selText);
  ok("the restored branch comes back with its children under it", shape && shape.kids === kidsBefore && shape.parent !== null, JSON.stringify(shape));
  await page.keyboard.press("Control+Shift+z");
  await page.waitForTimeout(1500);
  ok("Ctrl+Shift+Z deletes it again", (await state(page)).n === n3, String((await state(page)).n));
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(3500);
  // Board-only letters on a map.
  for (const k of ["r", "p", "t", "e", "n"]) {
    await page.keyboard.press(k);
    const s = await state(page);
    ok(`${k.toUpperCase()} on a map leaves the tool alone`, ["select", "pan", "lasso"].includes(s.tool), s.tool);
  }

  // --- Measure ------------------------------------------------------------
  await page.evaluate(() => wbZoomToFit({ animate: false }));
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.__renders = 0;
    const orig = window.renderWhiteboard;
    window.renderWhiteboard = function () { window.__renders += 1; return orig.apply(this, arguments); };
    window.__long = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push(e.duration); }).observe({ entryTypes: ["longtask"] });
    window.__startFrames = () => {
      window.__frames = []; window.__rafOn = true; window.__renders = 0; window.__long = [];
      let last = performance.now();
      const tick = (t) => { if (!window.__rafOn) return; window.__frames.push(t - last); last = t; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    };
    window.__stopFrames = () => { window.__rafOn = false; return { frames: window.__frames.slice(1), renders: window.__renders, long: window.__long }; };
  });
  const metrics = async () => {
    const { metrics: m } = await cdp.send("Performance.getMetrics");
    const o = {};
    for (const x of m) o[x.name] = x.value;
    return o;
  };
  async function measure(label, gesture) {
    const m0 = await metrics();
    await page.evaluate(() => window.__startFrames());
    await gesture();
    await page.waitForTimeout(250);
    const res = await page.evaluate(() => window.__stopFrames());
    const m1 = await metrics();
    const f = res.frames;
    console.log(
      `PERF ${label}: frames ${f.length} median ${r1(median(f))}ms p95 ${r1(p95(f))}ms max ${r1(Math.max(0, ...f))}ms` +
      ` >33ms ${f.filter((x) => x > 33).length}; renders ${res.renders}; longtasks ${res.long.length} (${r1(res.long.reduce((a, b) => a + b, 0))}ms)` +
      `; layouts ${m1.LayoutCount - m0.LayoutCount} (${r1((m1.LayoutDuration - m0.LayoutDuration) * 1000)}ms)` +
      ` styles ${m1.RecalcStyleCount - m0.RecalcStyleCount} (${r1((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000)}ms)` +
      ` script ${r1((m1.ScriptDuration - m0.ScriptDuration) * 1000)}ms`
    );
  }
  const box = await page.evaluate(() => { const r = document.getElementById("whiteboard-container").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  await page.keyboard.press("h");
  await measure("map pan (hand, 60 moves)", async () => {
    await page.mouse.move(cx, cy + 300);
    await page.mouse.down();
    for (let i = 0; i < 60; i++) await page.mouse.move(cx + Math.sin(i / 8) * 300, cy + 300 + Math.cos(i / 8) * 100);
    await page.mouse.up();
  });
  await measure("map zoom (ctrl+wheel, 30 notches)", async () => {
    await page.mouse.move(cx, cy);
    await page.keyboard.down("Control");
    for (let i = 0; i < 15; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(16); }
    for (let i = 0; i < 15; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(16); }
    await page.keyboard.up("Control");
  });
  await page.keyboard.press("v");
  const branch = await page.evaluate(() => {
    const b = wbMapIndex().roots[0];
    const kid = wbState.objects.find((o) => o.parent_id === b.id);
    const el = document.querySelector(`.wb-object[data-id="${kid.id}"]`);
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  await measure("map branch drag (40 moves)", async () => {
    await page.mouse.move(branch.x, branch.y);
    await page.mouse.down();
    for (let i = 0; i < 40; i++) await page.mouse.move(branch.x + i * 3, branch.y + i * 2);
    await page.mouse.up();
  });
  await page.waitForTimeout(800);
  await measure("map idle 2s", async () => { await page.waitForTimeout(2000); });

  console.log(`page errors: ${errors.length}${errors.length ? "  " + errors.slice(0, 3).join(" | ") : ""}`);
  console.log(`${pass} ok, ${fail} failed`);
  await browser.close();
})();
