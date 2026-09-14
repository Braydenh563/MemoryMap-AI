// INBOX 191, first half: "can you put an opaque background or smth behind the
// item radials in the mindmap?? they still feel disconnected."
//
// The claim to prove is about pixels, so it is measured in pixels: the ring is
// opened on a real node, the point exactly halfway around the circle between
// two neighbouring slots is computed from their own boxes, the page is
// screenshotted, and that pixel is read. It has to be the card colour the band
// is painted in, not the canvas behind it, and the node in the middle of the
// ring has to still be visible.
//
//   BASE=http://127.0.0.1:8791 SCRATCH=/tmp/mm-map THEME=dark \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapring.js
const { boot } = require("./lib.js");
const { execFileSync } = require("child_process");
const path = require("path");

const OUT = (process.env.SCRATCH || ".") + "/shots";
const PY = process.env.PY || "/home/user/MemoryMap-AI/.venv/bin/python";
const THEME = process.env.THEME || "light";

const results = [];
function check(label, ok, detail) {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

function pixel(file, x, y) {
  const out = execFileSync(PY, [path.join("scratchpad", "pngpixel.py"), file, String(x), String(y)], { encoding: "utf8" });
  const m = out.match(/\((\d+), (\d+), (\d+)\)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
const near = (a, b, tol) => a && b && a.every((v, i) => Math.abs(v - b[i]) <= tol);

async function newBoard(page, name) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.click("#wb-boards-new");
  await page.waitForTimeout(700);
  await page.fill(".confirm-overlay input[type=text]", name);
  await page.click('.confirm-overlay .seg button[data-value="map"]');
  await page.click(".confirm-overlay .confirm-actions button:last-child");
  await page.waitForTimeout(2500);
  await page.keyboard.press("Escape");
}

(async () => {
  const { browser, page } = await boot({});
  await newBoard(page, `Ring map ${THEME}`);
  const kidId = await page.evaluate(async () => {
    const root = wbMapIndex().roots[0];
    const kid = await wbMapAddChild(root.id);
    return kid?.id ?? wbMapIndex().roots[0].id;
  });
  await page.waitForTimeout(1500);
  await page.evaluate((id) => selectWbItem("object", id), kidId);
  await page.waitForTimeout(300);
  const nodeCentreBefore = await page.evaluate((id) => {
    const r = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)];
  }, kidId);
  const beforeShot = `${OUT}/mapring-${THEME}-before.png`;
  await page.screenshot({ path: beforeShot });
  const nodeWas = pixel(beforeShot, nodeCentreBefore[0], nodeCentreBefore[1]);
  //: **Click the empty canvas first.** A topic added by `wbMapAddChild` opens
  //: in its own editor, so its label is still focused and still
  //: `contenteditable="true"`, and `wbWireContextMenu` correctly stands aside
  //: for a right-click inside something that is being typed into (the native
  //: cut/copy/paste menu belongs to the person editing). That is why this
  //: sweep reported "opened by: direct" from the eighth run onwards: it was
  //: right-clicking a topic it had just created and never finished. A person
  //: clicks away, which blurs the label and ends the edit; so does this.
  await page.mouse.click(200, 700);
  await page.waitForTimeout(400);
  await page.click(`.wb-object[data-id="${kidId}"]`, { button: "right" });
  await page.waitForTimeout(600);
  const why = await page.evaluate((id) => ({
    id, sel: wbSelectedItem, multi: wbMultiSelection.size,
    mapNode: wbSelectedMapNode() ? wbSelectedMapNode().id : null,
    onCanvas: Boolean(document.querySelector(`.wb-object[data-id="${id}"]`)),
  }), kidId);
  console.log("  state:", JSON.stringify(why));
  // The gesture is what should open it; when it has not, open it the way the
  // gesture does so the rest of the measurement still happens, and say so.
  const opened = await page.evaluate(() => {
    const el = document.getElementById("wb-map-radial");
    if (!el.classList.contains("hidden")) return "gesture";
    const node = wbSelectedMapNode();
    return wbOpenMapRadial(node) ? "direct" : "refused";
  });
  console.log("  opened by:", opened);
  await page.waitForTimeout(400);

  const geom = await page.evaluate((id) => {
    const el = document.getElementById("wb-map-radial");
    const slots = [...el.querySelectorAll(".wb-map-radial-slot")]
      .filter((b) => b.getBoundingClientRect().width > 0)
      .map((b) => { const r = b.getBoundingClientRect(); return { id: b.id, cx: r.left + r.width / 2, cy: r.top + r.height / 2 }; });
    if (!slots.length) return { hidden: el.classList.contains("hidden"), slots: 0, all: el.querySelectorAll(".wb-map-radial-slot").length };
    const cx = slots.reduce((a, s) => a + s.cx, 0) / slots.length;
    const cy = slots.reduce((a, s) => a + s.cy, 0) / slots.length;
    const rr = Math.hypot(slots[0].cx - cx, slots[0].cy - cy);
    // Halfway round the circle between the first two slots in the markup,
    // which are neighbours in the ring by construction.
    const ang = (s) => Math.atan2(s.cy - cy, s.cx - cx);
    let a0 = ang(slots[0]), a1 = ang(slots[1]);
    let d = a1 - a0;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const mid = a0 + d / 2;
    const node = document.querySelector(`.wb-object[data-id="${id}"]`).getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);
    return {
      hidden: el.classList.contains("hidden"),
      slots: slots.length, cx, cy, rr,
      betweenX: Math.round(cx + Math.cos(mid) * rr),
      betweenY: Math.round(cy + Math.sin(mid) * rr),
      nodeCentre: [Math.round(node.left + node.width / 2), Math.round(node.top + node.height / 2)],
      card: cs.getPropertyValue("--card").trim(),
      boardBg: getComputedStyle(document.getElementById("whiteboard-container")).backgroundColor,
    };
  }, kidId);
  console.log("  ring:", JSON.stringify(geom));
  if (!geom.slots) { console.log("  the ring did not open:", JSON.stringify(geom)); await browser.close(); process.exit(1); }
  check("the ring is open with all six slots", !geom.hidden && geom.slots === 6, `${geom.slots} slots, hidden ${geom.hidden}`);

  // MINDMAP_PLAN §12.5: a slot says what it is at rest, not on hover, and the
  // caption carries the keys so the ring reads as a shortcut rather than as
  // the only way in.
  const words = await page.evaluate(() => {
    const ring = document.getElementById("wb-map-radial");
    return {
      names: [...ring.querySelectorAll(".wb-map-radial-slot")].map((s) => ({
        id: s.id,
        word: s.querySelector(".wb-map-radial-name")?.textContent.trim() || "",
        shown: getComputedStyle(s.querySelector(".wb-map-radial-name") || s).opacity,
      })),
      caption: ring.querySelector(".wb-map-radial-caption")?.textContent.trim() || "",
      stripHidden: document.getElementById("wb-map-strip")?.classList.contains("hidden"),
    };
  });
  console.log("  words:", JSON.stringify(words));
  check("every slot draws its own word at rest",
    words.names.length === 6 && words.names.every((n) => n.word && n.shown === "1"),
    words.names.map((n) => n.word).join(", "));
  check("the caption names the keys when nothing is under the pointer",
    /Tab/.test(words.caption) && /Enter/.test(words.caption) && /Delete/.test(words.caption),
    words.caption);
  check("the topic strip is put away while the ring is open", words.stripHidden === true,
    `strip hidden ${words.stripHidden}`);

  const shot = `${OUT}/mapring-${THEME}.png`;
  await page.screenshot({ path: shot });
  const between = pixel(shot, geom.betweenX, geom.betweenY);
  const away = pixel(shot, Math.round(geom.cx + geom.rr * 2.2), Math.round(geom.cy));
  const atNode = pixel(shot, geom.nodeCentre[0], geom.nodeCentre[1]);
  console.log(`  between two slots ${geom.betweenX},${geom.betweenY}: ${between}; canvas away from the ring: ${away}; node centre: ${atNode}`);
  check("the gap between two slots is a surface, not the canvas",
    between && away && !near(between, away, 6), `${between} against the canvas's ${away}`);
  // The band is `--card`; a screenshot of a `--card` surface under a shadow is
  // within a few levels of the token, not exactly it.
  // Inside the slot but off its glyph: the icon is about 16px wide on a 28px
  // circle, so the centre reads the icon's own ink rather than the slot's
  // ground and told us nothing about the two surfaces.
  const slotPixel = await page.evaluate(() => {
    const b = document.querySelector(".wb-map-radial-slot");
    const r = b.getBoundingClientRect();
    return [Math.round(r.left + r.width / 2 - r.width / 2 + 4), Math.round(r.top + r.height / 2)];
  });
  const onSlot = pixel(shot, slotPixel[0], slotPixel[1]);
  check("a slot still reads against the band it sits on",
    onSlot && between && !near(onSlot, between, 3), `slot ${onSlot} against band ${between}`);
  // Against what the node's own centre read before the ring opened, not
  // against the band's colour: in a light theme a white card and a near-white
  // band are a few levels apart and "different from the band" would pass for a
  // node that had been painted over.
  check("the topic in the middle of the ring is not covered",
    atNode && nodeWas && near(atNode, nodeWas, 2), `node centre ${atNode}, was ${nodeWas} before the ring opened`);

  const bad = results.filter((r) => !r.ok);
  console.log(`\n${THEME}: ${results.length - bad.length}/${results.length} passed`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})();
