// MINDMAP_PLAN.md decisions 19 and 20: a boundary round a branch, and a
// summary beside a run of siblings.
//
// A map of a trunk (Trip) and three branches (Pack, with Passport under it;
// Book; Go). Pack's menu draws a boundary round its branch: it holds Pack and
// Passport and not Go; the menu makes it a cloud and dashed, labels it (the
// words above its top edge), and removes it, which Ctrl+Z brings back. It
// follows a drag of Pack and shrinks when the branch folds. Pack and Book
// selected together are summarised: one brace beyond both branches, on the
// side away from the trunk, the words beyond its tip. Both are in the image
// export. Contrast of the words against the board.
//
//   BASE=http://127.0.0.1:8809 SCRATCH=/tmp/x THEME=light VW=1440 VH=900 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapstructure.js
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
const rgb = (s) => {
  const parts = (String(s).match(/[\d.]+/g) || []).slice(0, 3).map(Number);
  return String(s).startsWith("color(srgb") ? parts.map((v) => v * 255) : parts;
};
const VW = Number(process.env.VW || 1440);
const VH = Number(process.env.VH || 900);

(async () => {
  const phone = VW < 600;
  const { browser, page } = await boot({
    viewport: { width: VW, height: VH },
    ...(phone ? { hasTouch: true, isMobile: true } : {}),
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.evaluate(() => document.querySelector('[data-tab="library"]').click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('[data-target="library-view-whiteboard"]').click());
  await page.waitForTimeout(700);
  const mapId = await page.evaluate(async () =>
    (await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: `Structure ${Date.now()}`, type: "map", layout: "tree-right" }) })).id
  );
  await page.evaluate((bid) => openWhiteboardBoard(bid), mapId);
  await page.waitForTimeout(1500);
  await page.keyboard.press("Escape");
  const ids = await page.evaluate(async () => {
    const root = wbMapIndex().roots[0] || (await wbMapCreateNode({ parentId: null, text: "Trip" }));
    const pack = await wbMapCreateNode({ parentId: root.id, text: "Pack" });
    const passport = await wbMapCreateNode({ parentId: pack.id, text: "Passport" });
    const book = await wbMapCreateNode({ parentId: root.id, text: "Book" });
    const go = await wbMapCreateNode({ parentId: root.id, text: "Go" });
    await wbMapTidy({ quiet: true });
    renderWhiteboardNow();
    wbZoomToFit({ animate: false, padding: 140 });
    return { root: root.id, pack: pack.id, passport: passport.id, book: book.id, go: go.id };
  });
  await page.waitForTimeout(800);

  const rect = (sel) =>
    page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
    }, sel);
  const topic = (id) => rect(`.wb-object[data-id="${id}"]`);
  const inside = (a, b) => a && b && b.l >= a.l - 1 && b.t >= a.t - 1 && b.r <= a.r + 1 && b.b <= a.b + 1;
  const menuRun = (id, label) =>
    page.evaluate(([id, label]) => {
      clearWbSelection();
      selectWbItem("object", id);
      const menu = wbBuildContextMenu("object");
      const rows = [...menu.querySelectorAll("button")];
      const row = rows.find((b) => b.textContent.trim() === label);
      if (row) row.click();
      return rows.map((b) => b.textContent.trim());
    }, [id, label]);
  const answer = async (words) => {
    await page.waitForSelector(".confirm-overlay input[type=text]", { timeout: 3000 });
    await page.fill(".confirm-overlay input[type=text]", words);
    await page.click(".confirm-overlay .confirm-actions button:last-child");
    await page.waitForTimeout(700);
  };
  const boundarySel = `.wb-map-boundary[data-topic="${ids.pack}"]`;

  // 1. Drawn from the menu, round the branch and nothing else.
  const rows = await menuRun(ids.pack, "Draw a boundary round this branch");
  ok("the topic menu offers a boundary and a summary", rows.includes("Draw a boundary round this branch") && rows.includes("Summarise this topic…"), JSON.stringify(rows.filter((r) => /oundar|ummar/.test(r))));
  await page.waitForTimeout(600);
  let b = await rect(boundarySel);
  const [pk, pp, go] = [await topic(ids.pack), await topic(ids.passport), await topic(ids.go)];
  ok("the boundary holds the topic and the one under it", inside(b, pk) && inside(b, pp), JSON.stringify({ b, pk, pp }));
  ok("and not the branch beside it", go && b && !(go.t >= b.t && go.b <= b.b && go.l >= b.l && go.r <= b.r), JSON.stringify(go));

  // 2. Restyled and labelled.
  await menuRun(ids.pack, "Make the boundary a cloud");
  await page.waitForTimeout(500);
  const cloud = await page.evaluate((sel) => /a[\d.]+ /.test(document.querySelector(sel)?.getAttribute("d") || ""), boundarySel);
  ok("a cloud is drawn as bumps", cloud);
  await menuRun(ids.pack, "Make the boundary dashed");
  await page.waitForTimeout(500);
  const dash = await page.evaluate((sel) => getComputedStyle(document.querySelector(sel)).strokeDasharray, boundarySel);
  ok("dashed is dashed", dash && dash !== "none", dash);
  await menuRun(ids.pack, "Label the boundary…");
  await answer("Before we go");
  b = await rect(boundarySel);
  const label = await page.evaluate(() => {
    const t = [...document.querySelectorAll(".wb-map-boundary-label")].find((x) => x.textContent === "Before we go");
    if (!t) return null;
    const r = t.getBoundingClientRect();
    const cs = getComputedStyle(t);
    return { t: r.top, b: r.bottom, l: r.left, fill: cs.fill, bg: getComputedStyle(document.getElementById("whiteboard-container")).backgroundColor };
  });
  ok("the label sits above the boundary's top edge", label && b && label.b <= b.t + 2, JSON.stringify({ label, top: b?.t }));
  const lr = label ? ratio(rgb(label.fill), rgb(label.bg)) : 0;
  ok("the label reads on the board (4.5:1)", lr >= 4.5, lr.toFixed(2));

  // 3. Follows a drag; shrinks when the branch folds.
  const before = await rect(boundarySel);
  await page.mouse.move(pk.l + pk.w / 2, pk.t + pk.h / 2);
  await page.mouse.down();
  await page.mouse.move(pk.l + pk.w / 2 + 30, pk.t + pk.h / 2 + 50, { steps: 8 });
  await page.waitForTimeout(150);
  const mid = await rect(boundarySel);
  const midTopic = await topic(ids.pack);
  //: Back where it started before the release, so the summary below is
  //: measured on the tidy layout.
  await page.mouse.move(pk.l + pk.w / 2, pk.t + pk.h / 2, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  ok("the boundary follows a drag of its topic", mid && before && Math.abs(mid.t - before.t - 50) <= 8 && inside(mid, midTopic), JSON.stringify({ before: before?.t, mid: mid?.t }));
  await page.evaluate((id) => wbMapToggleCollapse(id), ids.pack);
  await page.waitForTimeout(700);
  const folded = await rect(boundarySel);
  ok("folding the branch shrinks the boundary", folded && mid && folded.w < mid.w - 20, JSON.stringify({ was: mid?.w, now: folded?.w }));
  await page.evaluate((id) => wbMapToggleCollapse(id), ids.pack);
  await page.waitForTimeout(700);

  // 4. Removed, and Ctrl+Z brings it back.
  await menuRun(ids.pack, "Remove the boundary");
  await page.waitForTimeout(600);
  ok("Remove the boundary takes it away", !(await rect(boundarySel)));
  await page.evaluate(() => document.getElementById("whiteboard-container").focus());
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(900);
  ok("Ctrl+Z brings it back", Boolean(await rect(boundarySel)));

  // 5. A summary over two siblings.
  const menuRows = await page.evaluate(([a, c]) => {
    clearWbSelection();
    wbMultiSelection.add(wbMultiKey("object", a));
    wbMultiSelection.add(wbMultiKey("object", c));
    const menu = wbBuildContextMenu("object");
    const rows = [...menu.querySelectorAll("button")];
    rows.find((r) => r.textContent.trim() === "Summarise these topics…")?.click();
    return rows.map((r) => r.textContent.trim());
  }, [ids.book, ids.pack]);
  ok("two siblings selected offer one summary", menuRows.includes("Summarise these topics…"), JSON.stringify(menuRows));
  await answer("Errands");
  const stored = await page.evaluate((id) => {
    const o = wbState.objects.find((x) => x.id === id);
    return [o.data.summary, o.data.summary_span];
  }, ids.pack);
  ok("kept on the first of the run, two long", stored[0] === "Errands" && stored[1] === 2, JSON.stringify(stored));
  const brace = await rect(`.wb-map-summary-brace[data-topic="${ids.pack}"]`);
  const run = [await topic(ids.pack), await topic(ids.passport), await topic(ids.book)];
  const right = Math.max(...run.map((r) => r.r));
  ok("the brace is beyond the run's branches, away from the trunk", brace && brace.l >= right - 1 && brace.t <= Math.min(...run.map((r) => r.t)) + 1 && brace.b >= Math.max(...run.map((r) => r.b)) - 1, JSON.stringify({ brace, right }));
  const words = await page.evaluate(() => {
    const t = [...document.querySelectorAll(".wb-map-summary-label")].find((x) => x.textContent === "Errands");
    const r = t?.getBoundingClientRect();
    return r ? { l: r.left, fill: getComputedStyle(t).fill, bg: getComputedStyle(document.getElementById("whiteboard-container")).backgroundColor } : null;
  });
  ok("the words sit beyond the brace's tip", words && brace && words.l >= brace.r, JSON.stringify(words));
  const wr = words ? ratio(rgb(words.fill), rgb(words.bg)) : 0;
  ok("the summary reads on the board (4.5:1)", wr >= 4.5, wr.toFixed(2));
  const goNow = await topic(ids.go);
  ok("the brace leaves the third branch out", brace && goNow && (goNow.t >= brace.b - 1 || goNow.b <= brace.t + 1), JSON.stringify({ brace, go: goNow }));

  if (process.env.SHOT) await page.screenshot({ path: `${process.env.SCRATCH}/mapstructure-${VW}-${process.env.THEME || "light"}.png` });

  // 6. In the image export.
  const svg = await page.evaluate(() => wbBuildExportSvg("board"));
  const text = typeof svg === "string" ? svg : svg?.svg || JSON.stringify(svg || "");
  ok("the export draws the boundary, its label and the summary", text.includes("Before we go") && text.includes("Errands") && /fill-opacity="0.08"/.test(text), String(text.length));

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${pass}/${pass + fail} at ${VW}x${VH} ${process.env.THEME || "light"}`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
