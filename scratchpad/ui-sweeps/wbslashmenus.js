// The owner, 2026-10-10: "/ command menus don't appear in text boxes in the
// whiteboard"; "Pressing enter when typing on a mindmap node makes a new
// node instead of a new line. Also the / command menu and [[ adding notes
// etc doesn't work on mind map nodes." A text box being typed in opens the
// editor's "/" menu (blocks and links) and "[[" (notes); a row runs where
// the "/" was. A topic being typed in: Enter breaks the line and keeps the
// one topic, Escape keeps the name, Ctrl+Enter a sibling, Tab a child; "/"
// offers links and an emoji, "[[" a note.
//   BASE=http://127.0.0.1:8783 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/wbslashmenus.js
const { boot } = require("./lib.js");
let fails = 0, passes = 0;
const check = (ok, what, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${what}${detail ? "  " + detail : ""}`); ok ? passes++ : fails++; };
const menu = (page) => page.evaluate(() => ({
  open: typeof editorMenuState !== "undefined" && editorMenuState.open,
  rows: [...document.querySelectorAll("#editor-menu [role=option]")].map((o) => o.textContent.replace(/\s+/g, " ").trim().slice(0, 30)),
  box: (() => { const m = document.getElementById("editor-menu"); if (!m || m.classList.contains("hidden")) return null; const r = m.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; })(),
}));
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.click('[data-tab="library"]'); await page.waitForTimeout(700);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]'); await page.waitForTimeout(1200);
  await page.evaluate(async () => { await initWhiteboard(); await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "Slash sweep target note" }) }); if (typeof refreshEntries === "function") await refreshEntries(); });
  const b = await page.evaluate(async () => apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: "Slash " + Date.now() }) }));
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, b.id); await page.waitForTimeout(900);
  // 1. A text box.
  const textId = await page.evaluate(async () => (await wbCreateObject("text", { content: "" }, 300, 260, 320, 140)).id);
  await page.waitForTimeout(300);
  await page.evaluate((id) => wbBeginTextEdit(document.querySelector(`.wb-object[data-id="${id}"] .wb-text-content`)), textId);
  await page.waitForTimeout(200);
  await page.keyboard.type("Plan");
  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  await page.waitForTimeout(400);
  let m = await menu(page);
  const caret = await page.evaluate((id) => document.querySelector(`.wb-object[data-id="${id}"] .wb-text-content`).getBoundingClientRect(), textId);
  check(m.open && m.rows.some((r) => /To-do list/.test(r)) && m.rows.some((r) => /Bookmark link/.test(r)), '"/" in a text box opens the block and link menu', JSON.stringify(m.rows.slice(0, 6)));
  check(m.box && m.box.y > caret.y && m.box.y < caret.y + caret.height + 60 && m.box.x >= caret.x - 4, "the menu opens under the caret's line", JSON.stringify({ menu: m.box, box: { x: Math.round(caret.x), y: Math.round(caret.y) } }));
  await page.keyboard.type("todo");
  await page.waitForTimeout(250);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  await page.keyboard.type("Buy milk");
  let typed = await page.evaluate((id) => wbEditedText(document.querySelector(`.wb-object[data-id="${id}"] .wb-text-content`)), textId);
  check(/^Plan\n- \[ \] Buy milk/.test(typed), "the row runs where the / was, and typing carries on after it", JSON.stringify(typed));
  await page.keyboard.press("Enter");
  await page.keyboard.type("See [[Slash sw");
  await page.waitForTimeout(400);
  m = await menu(page);
  check(m.open && m.rows.some((r) => /Slash sweep target/.test(r)), '"[[" in a text box offers the notes', JSON.stringify(m.rows.slice(0, 4)));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  typed = await page.evaluate((id) => wbEditedText(document.querySelector(`.wb-object[data-id="${id}"] .wb-text-content`)), textId);
  check(/See \[\[Slash sweep target note\]\]/.test(typed), "choosing a note writes its link", JSON.stringify(typed));
  await page.keyboard.press("Escape");
  await page.mouse.click(1100, 700);
  await page.waitForTimeout(600);
  const saved = await page.evaluate((id) => wbState.objects.find((o) => o.id === id).data.content, textId);
  check(/- \[ \] Buy milk/.test(saved) && /\[\[Slash sweep target note\]\]/.test(saved), "the text box keeps what the menu wrote", JSON.stringify(saved));

  // 2. A map topic.
  const map = await page.evaluate(async () => apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content: "# Keys map\n- Root\n  - Alpha", name: "Keys map " + Date.now() }) }));
  await page.evaluate(async (id) => { await openWhiteboardBoard(id); }, map.id);
  await page.waitForTimeout(1600);
  const count = () => page.evaluate(() => wbMapIndex().nodes.length);
  const alpha = await page.evaluate(() => { const idx = wbMapIndex(); return idx.nodes.find((n) => /Alpha/.test(wbMapLabel(n))).id; });
  const n0 = await count();
  await page.evaluate((id) => wbMapEditNode(id, { now: true }), alpha);
  await page.waitForTimeout(250);
  await page.keyboard.press("End");
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" one");
  await page.keyboard.press("Enter");
  await page.keyboard.type("line two");
  await page.waitForTimeout(200);
  const editing = await page.evaluate(() => Boolean(document.querySelector(".wb-map-text[contenteditable='plaintext-only'], .wb-map-text[contenteditable='true']")));
  check(editing && (await count()) === n0, "Enter in a topic breaks the line: still typing, no new topic", JSON.stringify({ editing, n: await count(), n0 }));
  await page.keyboard.type(" /");
  await page.waitForTimeout(400);
  m = await menu(page);
  check(m.open && m.rows.some((r) => /Emoji or icon/.test(r)) && m.rows.some((r) => /Link to a note/.test(r)) && !m.rows.some((r) => /Heading/.test(r)), '"/" in a topic offers links and an emoji, no blocks', JSON.stringify(m.rows));
  await page.keyboard.press("Escape");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(" [[Slash sw");
  await page.waitForTimeout(400);
  m = await menu(page);
  check(m.open && m.rows.some((r) => /Slash sweep target/.test(r)), '"[[" in a topic offers the notes', JSON.stringify(m.rows.slice(0, 3)));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  // The [[ menu took that Escape; this one keeps the name.
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const label = await page.evaluate((id) => wbState.objects.find((o) => o.id === id).data.content, alpha);
  check(/Alpha one\nline two/.test(label), "Escape keeps the two-line name", JSON.stringify(label));
  await page.evaluate((id) => wbMapEditNode(id, { now: true }), alpha);
  await page.waitForTimeout(250);
  await page.keyboard.press("Control+Enter");
  await page.waitForTimeout(900);
  const n1 = await count();
  check(n1 === n0 + 1, "Ctrl+Enter while typing adds a sibling", JSON.stringify({ n0, n1 }));
  await page.keyboard.type("Sib");
  await page.keyboard.press("Tab");
  await page.waitForTimeout(900);
  const n2 = await count();
  const tree = await page.evaluate(() => { const idx = wbMapIndex(); const name = (n) => (n ? String(wbMapLabel(n) || "").trim() : ""); return idx.nodes.map((n) => `${name(n)}<${name(idx.byId.get(n.parent_id)) || "-"}`).sort().join(" | "); });
  check(n2 === n1 + 1 && /Sib<Root/.test(tree), "Tab while typing keeps the name and adds a child", tree);
  check(!errors.length, "no page errors", errors.join(" | ").slice(0, 300));
  console.log(`${passes}/${passes + fails}`);
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
