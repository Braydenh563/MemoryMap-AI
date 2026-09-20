// Probe: the Word exporter is a card in Settings, optional extras, with a
// working Install button, and the document Export menu's 501 sends you there.
// OPEN.md: "python-docx has no row in core/extras.py, so the Word export's 501
// names the package instead of pointing at a button in Settings".
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  — " + d}`); };
(async () => {
  const { browser, page } = await boot();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  const catalogue = await page.evaluate(async () => {
    const r = await api("/extras");
    const body = await r.json();
    return body.extras.map((e) => ({ id: e.id, label: e.label, unavailable: e.unavailable }));
  });
  const row = catalogue.find((e) => e.id === "docx");
  ok("the catalogue has a Word export row", Boolean(row), JSON.stringify(row));
  ok("and its button is not disabled", row && !row.unavailable, row && row.unavailable);

  // The card itself, drawn by renderExtras from that same list.
  await page.evaluate(async () => { await openSettingsModal("extras"); });
  await page.waitForTimeout(1500);
  const card = await page.evaluate(() => {
    const el = [...document.querySelectorAll("#extras-list .extras-row")]
      .find((c) => /Export to Word/i.test(c.textContent));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const button = [...el.querySelectorAll("button")].map((b) => ({ text: b.textContent.trim(), disabled: b.disabled }));
    return { w: Math.round(r.width), h: Math.round(r.height), button };
  });
  ok("a card for it is drawn in Settings", Boolean(card && card.w > 100 && card.h > 20), JSON.stringify(card));

  // The 501, read as the user reads it.
  const detail = await page.evaluate(async () => {
    const made = await api("/documents", { method: "POST", body: JSON.stringify({ title: "Docx probe", content: "# Hi\n" }) });
    const doc = await made.json();
    // `api()` throws on a non-2xx and carries the detail in the message, and
    // it is also what adds the unlock header, so a bare `fetch` would only
    // ever measure a 401.
    try {
      await api(`/documents/${doc.id}/export.docx`);
      return "installed";
    } catch (error) {
      return error.message;
    }
  });
  ok("the 501 points at the Settings button", detail === "installed" || /Settings/.test(detail), detail);

  console.log(bad ? `${bad} FAILURES` : "all clear");
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
