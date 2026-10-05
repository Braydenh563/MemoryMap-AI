// The note edit form behind its lazy stand-in (renderEditForm moved to
// note-edit-panels.js, boot gzip, 2026-10-05). Opens a note for editing, checks
// the form is whole (one surface, tag chips, category chip, a foot with the
// counts before Cancel and Save), types, saves, and reads the note back; then
// opens Settings and checks the full backup's handlers arrived with
// settings-controls.js. Counts console errors throughout.
//   BASE=http://127.0.0.1:8791 VIEWPORT=390x844 THEME=dark node int1005-editlazy.js
const { boot } = require("./lib.js");
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
(async () => {
  const { page, browser } = await boot({ viewport: { width: vw, height: vh } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  const checks = [];
  const ok = (name, pass, detail) => checks.push({ name, pass: Boolean(pass), detail });
  const id = await page.evaluate(async () => {
    const made = await (await api("/entries", { method: "POST", body: JSON.stringify({ content: "# Lazy edit probe\n\nOne two three four five.", tags: ["probe"] }) })).json();
    return made.id;
  });
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1500);
  await page.evaluate(async (id) => { await loadEntries?.(); await openNoteEditor(id); }, id);
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => {
    const li = document.querySelector("#entry-edit-content")?.closest("li");
    if (!li) return null;
    const foot = li.querySelector(":scope > .note-edit-foot");
    const kids = foot ? [...foot.children].map((c) => c.className) : [];
    const counts = foot?.querySelector(".note-edit-counts");
    const save = [...li.querySelectorAll(".note-edit-actions button")].map((b) => b.textContent.trim());
    const fr = foot?.getBoundingClientRect(), cr = counts?.getBoundingClientRect();
    const ar = li.querySelector(".note-edit-actions")?.getBoundingClientRect();
    return {
      surface: !!li.querySelector(".note-edit-surface"),
      chips: li.querySelectorAll(".tag-field .chip").length,
      category: !!li.querySelector(".note-edit-category"),
      kids, counts: counts?.textContent, save,
      countsBeforeActions: cr && ar && cr.width ? Math.round(ar.left - cr.right) : null,
      countsShown: !!(cr && cr.width),
      footRightGap: fr && ar ? Math.round(fr.right - ar.right) : null,
      real: !String(window.renderEditForm).includes("ensureModule"),
    };
  });
  ok("form drawn", m, m);
  if (m) {
    ok("one surface", m.surface);
    ok("tag chip", m.chips === 1, m.chips);
    ok("category chip", m.category);
    ok("counts in the foot", /words?/.test(m.counts || "") && /min read|under a min/.test(m.counts || ""), m.counts);
    //: 616's foot: the count left of Cancel and Save, and hidden on a phone.
    if (vw >= 600) ok("counts left of the actions", m.countsShown && m.countsBeforeActions >= 0, m.countsBeforeActions);
    else ok("counts hidden on a phone", !m.countsShown, m.countsShown);
    ok("actions at the foot's right", m.footRightGap !== null && m.footRightGap <= 1, m.footRightGap);
    ok("Cancel then Save", m.save.length === 2 && /Cancel/.test(m.save[0]), m.save);
    ok("real function loaded", m.real);
  }
  await page.evaluate(() => {
    const t = document.querySelector(".note-edit-title");
    t.value = "Lazy edit probe saved";
    t.dispatchEvent(new Event("input", { bubbles: true }));
    [...document.querySelectorAll(".note-edit-actions button")].pop().click();
  });
  await page.waitForTimeout(2000);
  const saved = await page.evaluate(async (id) => (await (await api(`/entries/${id}`)).json()).content, id);
  ok("saved through the form", (saved || "").startsWith("# Lazy edit probe saved"), (saved || "").slice(0, 40));
  await page.evaluate(() => openSettingsModal("data"));
  await page.waitForTimeout(2000);
  const fns = await page.evaluate(() => ["exportFullBackup", "restoreFullBackup", "deleteProfile", "mergeNamedPrompts"].map((n) => typeof window[n]));
  ok("settings handlers loaded", fns.every((t) => t === "function"), fns);
  ok("no console errors", errors.length === 0, errors.slice(0, 5));
  for (const c of checks) console.log(`${c.pass ? "PASS" : "FAIL"} ${c.name}${c.pass ? "" : " " + JSON.stringify(c.detail)}`);
  console.log(`${checks.filter((c) => c.pass).length}/${checks.length} at ${vw}x${vh} ${process.env.THEME || "light"}`);
  await browser.close();
})();
