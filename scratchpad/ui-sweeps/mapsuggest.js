// Branches from my notes (FEAT-13; WHITEBOARD_PLAN decision 36). Three notes,
// two about the topic's words; a map whose root says "Gardening". The topic's
// menu row (through the command table) opens the picker dialog with a row per
// matching note, each saying which note it came from, all ticked, fitting the
// screen; unticking one and pressing Add makes the rest under the topic with
// their source in their note, the branch tidied; one Undo takes them away.
// The sweep's server runs no model, so the suggestions are the notes' titles.
//   BASE=http://127.0.0.1:8795 W=390 H=844 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/mapsuggest.js
const { openBoard, checker } = require("./wb1005-lib.js");
const { check, summary } = checker();

(async () => {
  const W = Number(process.env.W || 1440), H = Number(process.env.H || 900);
  const { browser, page, errors, board } = await openBoard({ type: "map", viewport: { width: W, height: H } });
  //: A word of its own each run (letters: the finder forgives a near number).
  const stamp = Array.from({ length: 9 }, () => "bcdfghjklmnpqrstvwxz"[Math.floor(Math.random() * 20)]).join("");
  const root = await page.evaluate(async ([bid, stamp]) => {
    for (const text of [`# Tomato pruning ${stamp}\n\n${stamp}: pinch the side shoots`, `# Compost heap ${stamp}\n\n${stamp}: turn it weekly`, `# Tax return\n\nfile by January`]) {
      await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: text }) });
    }
    const made = await apiJson(`/whiteboard/boards/${bid}/nodes`, { method: "POST", body: JSON.stringify({ kind: "topic", text: `${stamp}` }) });
    await fetchWhiteboardState();
    renderWhiteboardNow();
    selectWbItem("object", made.id);
    return made.id;
  }, [board.id, stamp]);
  await page.waitForTimeout(800);

  await page.evaluate(() => wbRunCommand("suggest-branches"));
  await page.waitForSelector(".entry-pick-card .note-picker-row", { timeout: 8000 }).catch(() => null);
  const dialog = await page.evaluate(() => {
    const card = document.querySelector(".entry-pick-card");
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const rows = [...card.querySelectorAll(".note-picker-row")].map((row) => ({
      text: row.querySelector(".note-picker-text")?.textContent,
      meta: row.querySelector(".note-picker-meta")?.textContent,
      on: row.querySelector(".note-picker-box")?.checked,
    }));
    return {
      title: card.querySelector(".dialog-head-title, h2")?.textContent?.trim(),
      about: card.querySelector(".entry-pick-about")?.textContent,
      rows,
      fits: r.left >= 0 && r.right <= innerWidth + 0.5 && document.documentElement.scrollWidth <= innerWidth,
      focus: document.activeElement?.className,
    };
  });
  check("the topic's menu row opens the picker with a row per matching note", dialog && dialog.rows.length === 2, dialog);
  check("each row says which note it came from, and all start ticked", dialog && dialog.rows.every((r) => /From your note "/.test(r.meta || "") && r.on), dialog?.rows);
  check("the unrelated note is not suggested", dialog && !dialog.rows.some((r) => /Tax return/.test(r.text)), dialog?.rows);
  check("the dialog fits the screen and takes the focus", dialog && dialog.fits && /note-picker-box/.test(dialog.focus || ""), dialog);

  // Untick the second, Add.
  await page.evaluate(() => {
    const boxes = document.querySelectorAll(".entry-pick-card .note-picker-box");
    boxes[1].click();
  });
  await page.evaluate(() => [...document.querySelectorAll(".entry-pick-card button")].find((b) => b.textContent.trim() === "Add").click());
  await page.waitForTimeout(1500);
  const after = await page.evaluate((root) => {
    const kids = (wbState.objects || []).filter((o) => o.parent_id === root);
    return { kids: kids.map((k) => ({ text: k.data.content, note: k.data.note })), open: Boolean(document.querySelector(".entry-pick-card")) };
  }, root);
  check("Add makes the ticked one under the topic, its source in its note", !after.open && after.kids.length === 1 && /From your note "/.test(after.kids[0].note || ""), after);
  const drawn = await page.evaluate((text) => [...document.querySelectorAll(".wb-map-node, .wb-object")].some((el) => el.textContent.includes(text)), after.kids[0]?.text || "?");
  check("and it is drawn on the map", drawn, drawn);
  await page.evaluate(() => wbUndo());
  await page.waitForTimeout(1200);
  const undone = await page.evaluate((root) => (wbState.objects || []).filter((o) => o.parent_id === root).length, root);
  check("one Undo takes it away", undone === 0, undone);

  check("no console errors", errors.length === 0, errors.slice(0, 5));
  const ok = summary();
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
