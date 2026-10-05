// MINDMAP_PLAN §14b gate (mc1): each level's look from the dialog, Redefine,
// and copy and paste style on topics, each one Undo step.
//   BASE=http://127.0.0.1:8798 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mc1-maplook.js
const { boot } = require("./lib.js");
const results = [];
const check = (label, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
};
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async () => {
    const v = document.getElementById("library-view-whiteboard");
    for (const s of document.querySelectorAll('[id^="library-view-"]')) s.classList.toggle("hidden", s !== v);
    await initWhiteboard();
    const content = ["- Centre", "  - Branch one", "    - Leaf a", "    - Leaf b", "  - Branch two", "    - Leaf c"];
    const board = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: content.join("\n"), name: "Look" }) });
    await openWhiteboardBoard(board.id);
    await new Promise((r) => setTimeout(r, 1500));
  });
  const font = (re) => page.evaluate((src) => {
    const n = wbMapIndex().nodes.find((x) => new RegExp(src).test(x.data?.content || ""));
    const el = document.querySelector(`.wb-object[data-id="${n.id}"]`);
    return { font: parseFloat(getComputedStyle(el.querySelector(".wb-map-text")).fontSize), shape: el.dataset.shape || "", own: n.data?.font_size ?? null };
  }, re.source);

  // --- the dialog's level switch ---
  const dialog = await page.evaluate(async () => {
    wbMapThemeDialog();
    await new Promise((r) => setTimeout(r, 300));
    const card = document.querySelector(".wb-info-card");
    const seg = card.querySelector(".wb-map-theme-scope");
    const pressed = () => [...seg.children].find((b) => b.getAttribute("aria-pressed") === "true")?.textContent;
    const before = pressed();
    seg.children[2].click();
    await new Promise((r) => setTimeout(r, 100));
    const rows = [...card.querySelectorAll(".wb-map-theme-rows select")].map((s) => s.getAttribute("aria-label"));
    const blank = card.querySelector(".wb-map-theme-rows select")?.options[0]?.textContent;
    const box = card.getBoundingClientRect();
    return { before, after: pressed(), rows, blank, h: Math.round(box.height), fits: card.scrollHeight <= card.clientHeight + 1 };
  });
  console.log("    " + JSON.stringify(dialog));
  check("the dialog opens on the whole map and switches to a level", dialog.before === "Whole map" && dialog.after === "Main branches");
  check("a level shows its seven rows, named for it", dialog.rows.length === 7 && /main branches/.test(dialog.rows[0]), `${dialog.rows.length}`);
  check("a row's blank says what the hierarchy draws there", /As Classic draws \(17px\)/.test(dialog.blank), dialog.blank);
  check("it fits without scrolling at 1440x900", dialog.fits, `${dialog.h}px`);

  // Set main branches' size to XXL from the dialog's own select.
  await page.evaluate(async () => {
    const select = document.querySelector('.wb-info-card .wb-map-theme-rows select');
    select.value = "28";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    document.querySelector(".wb-info-card .dialog-head button, .wb-info-card [aria-label='Close']")?.click();
  });
  await page.waitForTimeout(400);
  let b = await font(/Branch one/);
  check("a level's size set in the dialog reaches its topics", b.font === 28, `${b.font}`);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(1200);
  b = await font(/Branch one/);
  check("and one Undo takes it back", b.font === 17, `${b.font}`);

  // --- Redefine: a topic's own look given to its level ---
  await page.evaluate(async () => {
    const n = wbMapIndex().nodes.find((x) => /Leaf a/.test(x.data?.content || ""));
    await wbMapSetNodeStyle(n, { shape: "rect", font_size: 19 });
    renderWhiteboardNow();
  });
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const n = wbMapIndex().nodes.find((x) => /Leaf a/.test(x.data?.content || ""));
    await wbMapUseLookForLevel(n.id);
  });
  await page.waitForTimeout(1200);
  const leafA = await font(/Leaf a/);
  const leafC = await font(/Leaf c/);
  check("Use this look for its level: every sub-topic takes it", leafC.font === 19 && leafC.shape === "rect", JSON.stringify(leafC));
  check("and the topic itself now follows its level", leafA.own === null && leafA.font === 19, JSON.stringify(leafA));
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(1500);
  const leafC2 = await font(/Leaf c/);
  const leafA2 = await font(/Leaf a/);
  check("one Undo puts the level and the topic back", leafC2.font === 13.6 && leafA2.own === 19, `${leafC2.font}, own ${leafA2.own}`);

  // --- Copy and paste style on topics ---
  const pasted = await page.evaluate(async () => {
    const idx = wbMapIndex();
    const a = idx.nodes.find((x) => /Leaf a/.test(x.data?.content || ""));
    const c = idx.nodes.find((x) => /Leaf c/.test(x.data?.content || ""));
    selectWbItem("object", a.id);
    wbCopySelectedStyle();
    selectWbItem("object", c.id);
    await wbPasteCopiedStyle();
    await new Promise((r) => setTimeout(r, 600));
    const now = wbMapIndex().nodes.find((x) => x.id === c.id);
    return { size: now.data.font_size, shape: now.data.shape, content: now.data.content };
  });
  check("Copy style on a topic, Paste style on another: the look moves, the words stay", pasted.size === 19 && pasted.shape === "rect" && pasted.content === "Leaf c", JSON.stringify(pasted));
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(1200);
  const back = await font(/Leaf c/);
  check("and one Undo takes the paste back", back.own === null && back.shape === "", JSON.stringify(back));

  // --- the topic menu's Look group ---
  const menu = await page.evaluate(async () => {
    const a = wbMapIndex().nodes.find((x) => /Branch one/.test(x.data?.content || ""));
    selectWbItem("object", a.id);
    const el = document.querySelector(`.wb-object[data-id="${a.id}"]`);
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ContextMenu", bubbles: true }));
    await new Promise((res) => setTimeout(res, 300));
    const words = [...document.querySelectorAll(".action-menu:not(.hidden) [role=menuitem], .action-menu:not(.hidden) button")].map((x) => x.textContent.trim());
    return words.filter((w) => /Look|style|look/.test(w));
  });
  check("the topic menu has a Look group", menu.some((w) => /^Look/.test(w)), JSON.stringify(menu));

  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
