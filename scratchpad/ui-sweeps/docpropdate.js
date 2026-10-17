// INBOX 904 B16: a date field in the document properties panel must be the
// app's own date picker (the Reminders tab's), not the browser's grey native
// calendar. A `type: book` document offers "finished" (a date field).
// Usage: BASE=http://127.0.0.1:8783 node docpropdate.js
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "B16 probe", content: "---\ntype: book\n---\n\nbody\n", file_type: "md" }) });
    await loadDocuments(d.id);
  });
  await page.waitForTimeout(3000);
  const m = await page.evaluate(() => {
    const input = document.querySelector('.doc-prop-value input[type="date"]');
    if (!input) return { found: false };
    return {
      found: true,
      enhanced: !!input.dataset.dateField,
      shell: !!input.closest(".date-field"),
      hidden: input.classList.contains("select-native-hidden"),
      opener: !!input.closest(".date-field")?.querySelector(".select-opener"),
    };
  });
  console.log(JSON.stringify(m));
  const box = await page.evaluate(() => {
    const o = document.querySelector(".doc-prop-value .date-field .select-opener")?.getBoundingClientRect();
    const v = document.querySelector(".doc-prop-value .date-field")?.closest(".doc-prop-value")?.getBoundingClientRect();
    return o && v ? { opener: [Math.round(o.width), Math.round(o.height)], value: Math.round(v.width), inside: o.right <= v.right + 1 } : null;
  });
  console.log("box", JSON.stringify(box));
  ok("the picker fits inside the row", !m.enhanced || (box && box.inside && box.opener[0] > 60));
  ok("a date input is in the properties panel", m.found);
  ok("it is the custom date field", m.found && m.enhanced && m.shell && m.hidden && m.opener);
  if (m.enhanced) {
    await page.click(".doc-prop-value .date-field .select-opener");
    await page.waitForTimeout(500);
    const pop = await page.evaluate(() => {
      const p = document.querySelector(".timeline-monthpop:not(.hidden)");
      const r = p?.getBoundingClientRect();
      return { open: !!p && !p.classList.contains("hidden"), days: p ? p.querySelectorAll(".timeline-monthday").length : 0, w: r ? Math.round(r.width) : 0 };
    });
    console.log("popup", JSON.stringify(pop));
    ok("pressing it opens the month popup", pop.open && pop.days >= 28);
    await page.evaluate(() => [...document.querySelectorAll(".timeline-monthpop:not(.hidden) .timeline-monthday")].find((b) => b.textContent.trim() === "15").click());
    await page.waitForTimeout(800);
    const text = await page.evaluate(() => docText());
    console.log(JSON.stringify(text.slice(0, 80)));
    ok("choosing a day writes it to the frontmatter", /finished: \d{4}-\d{2}-15/.test(text));
  }
  await browser.close();
  console.log(bad ? `${bad} FAILED` : "all passed");
  process.exit(bad ? 1 : 0);
})();
