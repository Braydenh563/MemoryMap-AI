// UX-06's remainder (audit 2026-10-05, ux.md): a concept map's counts, its
// links called "sketches", its topics in Notes and Recently added, and the
// focus after Enter names a card.
//
//   BASE=http://127.0.0.1:8858 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmd2-1005-ux06.js   (THEME=dark, W=390)
const { boot } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  const sketchPosts = [];
  page.on("request", (r) => { if (r.method() === "POST" && /\/whiteboard\/sketches$/.test(r.url())) sketchPosts.push(r.url()); });
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('#library-subtabs [data-target="library-view-whiteboard"]')?.click());
  await page.waitForTimeout(1200);
  const tag = `Pets${Date.now() % 100000}`;
  await page.evaluate(async (title) => {
    const board = await apiJson("/whiteboard/boards", { method: "POST", body: JSON.stringify({ name: title }) });
    const root = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: `# ${title}`, tags: [], defer_filing: true, map_topic: true }) });
    await apiJson("/whiteboard/nodes", { method: "POST", body: JSON.stringify({ entry_id: root.id, board_id: board.id, x: 400, y: 260, z: 1 }) });
    await loadEntries();
    await openWhiteboardBoard(board.id);
    const placed = wbState.nodes.find((n) => n.entry_id === root.id);
    selectWbItem("node", placed.id);
    document.activeElement?.blur();
  }, tag);
  await page.waitForTimeout(600);
  await page.keyboard.press("Tab");
  await page.waitForTimeout(1500);
  await page.keyboard.type("Dogs");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  const after = await page.evaluate(() => ({
    active: document.activeElement?.id || document.activeElement?.tagName,
    sel: wbSelectedItem,
  }));
  check("after Enter names a card it stays selected", after.sel?.kind === "node", JSON.stringify(after));
  const postsBefore = sketchPosts.length;
  await page.keyboard.type("Flowers");
  await page.waitForTimeout(400);
  const typing = await page.evaluate(() => ({
    editing: Boolean(document.querySelector(".wb-card-editor, #wb-card-editor")),
    tool: window.currentTool || null,
  }));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  const texts = await page.evaluate(() => wbState.nodes.map((n) => allEntries.find((e) => e.id === n.entry_id)?.content));
  check("letters typed then rename the card, no tool, no stray shape",
    typing.editing && sketchPosts.length === postsBefore && texts.includes("Flowers") && !texts.includes("Dogs"),
    JSON.stringify({ typing, posts: sketchPosts.length - postsBefore, texts }));
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  await page.keyboard.type("Garden");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1200);
  const label = await page.evaluate(() => document.getElementById("wb-board-select").selectedOptions[0].textContent);
  check("the picker counts what is on the board, kept current", label.endsWith("(3 items)"), label);
  const words = await page.evaluate(() => [
    mapCountLabel({ node_count: 3, sketch_count: 3, link_count: 2, object_count: 0 }),
    mapCountLabel({ type: "map", object_count: 7 }),
  ]);
  check("links are links, drawings drawings, a map's are topics",
    words[0] === "3 cards · 2 links · 1 drawing" && words[1] === "7 topics", JSON.stringify(words));
  const notes = await page.evaluate(async () => {
    await loadEntries();
    switchTab("notes");
    showNotesSection("browse");
    renderEntries();
    await new Promise((r) => setTimeout(r, 600));
    const rows = [...document.querySelectorAll("#entry-list .entry-content, #entry-list li")].map((li) => li.textContent).join(" | ");
    return { flowers: /Flowers/.test(rows), garden: /Garden/.test(rows), flagged: allEntries.filter((e) => e.map_topic).length };
  });
  check("Notes leaves the map's topics out", !notes.flowers && !notes.garden && notes.flagged >= 3, JSON.stringify(notes));
  const searched = await page.evaluate(async () => {
    const box = document.getElementById("note-search");
    box.value = "Flowers";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 900));
    const found = [...document.querySelectorAll("#entry-list li")].some((li) => /Flowers/.test(li.textContent));
    box.value = "";
    box.dispatchEvent(new Event("input", { bubbles: true }));
    return found;
  });
  check("and a search still finds one", searched);
  const recent = await page.evaluate(async () => {
    const body = document.createElement("div");
    await renderRecentNotesWidget(body);
    return body.textContent;
  });
  check("Recently added leaves them out too", !/Flowers|Garden/.test(recent), recent.slice(0, 120));
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
