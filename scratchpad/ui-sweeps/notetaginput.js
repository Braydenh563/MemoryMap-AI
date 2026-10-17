// INBOX 904 B06: in the note edit form the add-tag input must sit on its own
// line below the chips, full width, at every tag count (it used to take
// whatever was left of the chip row and shrink to a sliver before wrapping).
// Usage: BASE=http://127.0.0.1:8783 [VIEWPORT=390x844] node notetaginput.js
const { boot } = require("./lib.js");
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page } = await boot({ viewport: { width: vw, height: vh } });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1200);
  for (const n of [0, 1, 4, 8, 14]) {
    const tags = Array.from({ length: n }, (_, i) => `topic${i + 1}word`);
    const id = await page.evaluate(async ([tags, n]) => {
      const r = await api("/entries", { method: "POST", body: JSON.stringify({ content: `# Tag probe ${n}\n\nbody`, tags }) });
      const e = await r.json();
      await loadEntries();
      return e.id;
    }, [tags, n]);
    await page.evaluate((id) => openNoteEditor(id), id);
    await page.waitForTimeout(1500);
    const m = await page.evaluate((id) => {
      const li = document.querySelector("#entry-edit-content")?.closest("li");
      const meta = li.querySelector(".note-edit-meta");
      const input = li.querySelector(".note-edit-tag-input");
      const chips = [...meta.querySelectorAll(".chip.tag")];
      const ib = input.getBoundingClientRect();
      const mb = meta.getBoundingClientRect();
      const bottoms = chips.map((c) => c.getBoundingClientRect().bottom);
      return {
        inputW: Math.round(ib.width), metaW: Math.round(mb.width - 32), inputTop: Math.round(ib.top),
        lastChipBottom: bottoms.length ? Math.round(Math.max(...bottoms)) : null,
      };
    }, id);
    console.log(n, JSON.stringify(m));
    ok(`${n} tags: input below every chip`, m.lastChipBottom === null || m.inputTop >= m.lastChipBottom);
    ok(`${n} tags: input at least half the form width`, m.inputW >= m.metaW * 0.5, `${m.inputW} of ${m.metaW}`);
    await page.keyboard.press("Escape");
    await page.evaluate(async () => { const c = [...document.querySelectorAll(".note-edit-actions button")].find((b) => /cancel/i.test(b.textContent)); if (c) c.click(); });
    await page.waitForTimeout(500);
  }
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
