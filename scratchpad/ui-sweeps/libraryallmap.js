// The Library's All list draws a mind map as a map, not as a note
// (MINDMAP_PLAN, placed from INBOX 2026-09-09: "in the all library subtab, the
// mindmap I made called bubble tea shows as a note"). Makes a map and a note,
// opens Library > All, and reads each row's kind and glyph.
//
//   BASE=http://127.0.0.1:8794 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/libraryallmap.js
const { boot } = require("./lib.js");

(async () => {
  const { browser, page } = await boot();
  const stamp = Date.now();
  await page.evaluate(async (s) => {
    const post = async (path, body) => (await api(path, { method: "POST", body: JSON.stringify(body) })).json();
    const map = await post("/whiteboard/boards", { name: `bubble tea ${s}`, type: "map", layout: "tree-right" });
    await post(`/whiteboard/boards/${map.id}/nodes`, { kind: "topic", text: "Taro" });
    await post("/entries", { content: `bubble tea note ${s}` });
  }, stamp);
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-documents"]').catch(() => {});
  await page.waitForTimeout(1500);
  const rows = await page.evaluate((s) => {
    const all = [...document.querySelectorAll("#library-view-documents [data-kind], #library-view-documents li, #library-view-documents article")];
    const find = (text) => all.find((el) => el.textContent.includes(text) && el.querySelector(".ph, i"));
    const read = (el) => el && {
      kind: el.dataset.kind || el.closest("[data-kind]")?.dataset.kind || null,
      glyphs: [...el.querySelectorAll("i.ph, .ph")].map((i) => [...i.classList].find((c) => c.startsWith("ph-") && c !== "ph-lead")).filter(Boolean).slice(0, 3),
    };
    return { map: read(find(`bubble tea ${s}`)), note: read(find(`bubble tea note ${s}`)) };
  }, stamp);
  console.log(JSON.stringify(rows));
  const ok = rows.map && rows.note
    && rows.map.glyphs.includes("ph-tree-structure") && !rows.map.glyphs.includes("ph-note-pencil")
    && !rows.note.glyphs.includes("ph-tree-structure");
  console.log(ok ? "PASS: the map draws as a map, the note as a note" : "FAIL");
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
