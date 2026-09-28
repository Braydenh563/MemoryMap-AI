// The writing dictionary as a settings sheet (INBOX 410: "redesign the
// dictionary panel as it is ugly and needs a proper professional modern
// redesign").
//
// Prints the same measures before and after (`measure:` lines), then asserts
// the redesign: the count as muted text, not a chip; one field that filters as
// you type and adds on Enter; quiet rows whose remove shows on hover or focus;
// an empty state and a no-match state; the spelling variant, grammar and smart
// punctuation as settings rows; export and import of a .txt word list.
//
// Usage: BASE=http://127.0.0.1:8792 [THEME=dark] [BEFORE=1] node dictsheet.js
const fs = require("fs");
const { boot } = require("./lib.js");

let bad = 0;
let good = 0;
const ok = (n, c, d) => {
  if (c) good += 1;
  else bad += 1;
  console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`);
};
const J = JSON.stringify;

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    prefsCache = await apiJson("/preferences", { method: "PUT", body: JSON.stringify({ writing_dictionary: ["idk"] }) });
  });
  await page.evaluate(() => openDocDictionary());
  await page.waitForTimeout(500);

  const measure = () =>
    page.evaluate(() => {
      const d = document.getElementById("doc-dictionary-dialog");
      const cs = (el) => (el ? getComputedStyle(el) : null);
      const count = document.getElementById("doc-dictionary-count");
      const rows = [...d.querySelectorAll(".doc-dictionary-row")];
      const row = rows[0];
      const remove = row?.querySelector("button");
      const grammar = document.getElementById("doc-grammar-check")?.closest("label");
      const box = d.getBoundingClientRect();
      return {
        dialog: { w: Math.round(box.width), h: Math.round(box.height) },
        count: count && { text: count.textContent, border: cs(count).borderTopWidth, bg: cs(count).backgroundColor, cls: count.className },
        rows: rows.length,
        rowBorder: row ? cs(row).borderTopWidth : null,
        rowH: row ? Math.round(row.getBoundingClientRect().height) : null,
        removeOpacity: remove ? cs(remove).opacity : null,
        grammar: grammar && { cls: grammar.className, border: cs(grammar).borderTopWidth, borderColor: cs(grammar).borderTopColor, bg: cs(grammar).backgroundColor },
        field: !!document.getElementById("doc-dictionary-search"),
      };
    });
  let m = await measure();
  console.log("measure:", J(m));
  if (process.env.BEFORE) {
    await browser.close();
    return;
  }

  ok("the count is muted text beside the title, not a chip", m.count && !/\bchip\b/.test(m.count.cls) && m.count.border === "0px" && m.count.text === "1 word", J(m.count));
  ok("rows carry no box of their own", m.rowBorder === "0px", m.rowBorder);
  ok("remove is hidden until the row is pointed at", m.removeOpacity === "0", m.removeOpacity);
  await page.hover(".doc-dictionary-row");
  await page.waitForTimeout(250);
  const shown = await page.evaluate(() => getComputedStyle(document.querySelector(".doc-dictionary-row button")).opacity);
  ok("and shows on hover", shown === "1", shown);
  ok("grammar is a settings row, not an accent pill", /setting-check/.test(m.grammar.cls), J(m.grammar));

  // Find and add.
  await page.fill("#doc-dictionary-search", "kubern");
  await page.waitForTimeout(150);
  let v = await page.evaluate(() => ({
    rows: document.querySelectorAll(".doc-dictionary-row").length,
    empty: document.querySelector(".doc-dictionary-empty")?.textContent || "",
    add: !document.getElementById("doc-dictionary-add").hidden,
  }));
  ok("typing filters, says Enter adds, and offers Add", v.rows === 0 && /Press Enter to add it/.test(v.empty) && v.add, J(v));
  await page.press("#doc-dictionary-search", "Enter");
  await page.waitForTimeout(600);
  v = await page.evaluate(() => ({
    words: [...document.querySelectorAll(".doc-dictionary-word")].map((w) => w.textContent),
    field: document.getElementById("doc-dictionary-search").value,
    count: document.getElementById("doc-dictionary-count").textContent,
    saved: prefsCache.writing_dictionary,
  }));
  ok("Enter adds it, clears the field and counts it", v.words.includes("kubern") && v.field === "" && v.count === "2 words" && v.saved.includes("kubern"), J(v));
  await page.fill("#doc-dictionary-search", "kub");
  await page.waitForTimeout(150);
  v = await page.evaluate(() => [...document.querySelectorAll(".doc-dictionary-word")].map((w) => w.textContent));
  ok("the field filters the list", J(v) === J(["kubern"]), J(v));
  await page.fill("#doc-dictionary-search", "");

  // Remove with the keyboard.
  await page.evaluate(() => [...document.querySelectorAll(".doc-dictionary-row")].find((r) => r.textContent.includes("kubern")).querySelector("button").focus());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const focusOpacity = await page.evaluate(() => getComputedStyle(document.activeElement).opacity);
  ok("remove is visible when focused", focusOpacity === "1", focusOpacity);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  v = await page.evaluate(() => prefsCache.writing_dictionary);
  ok("and removes the word", !v.includes("kubern"), J(v));

  // Export.
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 5000 }).catch(() => null),
    page.click("#doc-dictionary-export"),
  ]);
  let exported = "";
  if (download) exported = fs.readFileSync(await download.path(), "utf8");
  ok("Export saves the list as .txt, one word per line", download && download.suggestedFilename() === "writing-dictionary.txt" && exported === "idk\n", J(exported));

  // Import merges and never removes.
  const file = (process.env.SCRATCH || "/tmp") + "/dict-import.txt";
  fs.writeFileSync(file, "Alpha\nidk\nbeta, gamma\n\nnot a word!\n");
  await page.setInputFiles("#doc-dictionary-file", file);
  await page.waitForTimeout(800);
  v = await page.evaluate(() => [...prefsCache.writing_dictionary].sort());
  ok("Import adds the new words and keeps the old", J(v) === J(["alpha", "beta", "gamma", "idk"]), J(v));

  // Smart punctuation, the same preference as Settings.
  await page.click("#doc-smart-punctuation");
  await page.waitForTimeout(500);
  v = await page.evaluate(() => prefsCache.smart_punctuation);
  ok("Smart quotes and dashes switches the preference", v === true, J(v));
  await page.click("#doc-smart-punctuation");
  await page.waitForTimeout(400);

  // Empty state.
  await page.evaluate(async () => {
    prefsCache = await apiJson("/preferences", { method: "PUT", body: JSON.stringify({ writing_dictionary: [] }) });
    renderDocDictionary();
  });
  v = await page.evaluate(() => ({ empty: document.querySelector(".doc-dictionary-empty")?.className || "", count: document.getElementById("doc-dictionary-count").textContent }));
  ok("an empty list says what it is for", /empty-state/.test(v.empty) && v.count === "Empty", J(v));
  await page.evaluate(async () => {
    prefsCache = await apiJson("/preferences", { method: "PUT", body: JSON.stringify({ writing_dictionary: ["idk", "kubernetes", "sqlite"] }) });
    renderDocDictionary();
  });
  m = await measure();
  console.log("measure:", J(m));
  const overflow = await page.evaluate(() => {
    const d = document.getElementById("doc-dictionary-dialog");
    return d.scrollWidth > d.clientWidth + 1;
  });
  ok("nothing in the sheet overflows sideways", !overflow);
  await page.screenshot({ path: `${process.env.SCRATCH || "."}/shots/dictsheet-${process.env.THEME || "light"}.png` });

  ok("no page errors", errors.length === 0, errors.join(" | "));
  console.log(`\n${good} passed, ${bad} failed`);
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
