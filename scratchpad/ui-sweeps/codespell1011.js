// Owner 2026-10-11: code documents spell-check comments and string text only; a squiggle opens the prose popover on hover, click and right-click.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  - " + d}`); };
const SRC = `def is_leap(year):
    # chekc the year is divisible
    urFucked = f"The yeer {year} is a leap"
    other = 'plain quoted wrod'
    return year % 4 == 0

x = "good words"
`;
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async (c) => { const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "sp1011", content: c, file_type: "py" }) }); await loadDocuments(d.id); }, SRC);
  await page.waitForTimeout(4000);
  const marks = () => page.evaluate(() => [...document.querySelectorAll("#doc-editor .cm-finding")].map((m) => m.textContent));
  const m = await marks();
  console.log("marks", JSON.stringify(m));
  ok("comment typo marked", m.includes("chekc"));
  ok("f-string typo marked, not the prefix", m.includes("yeer") && !m.some((t) => /^f"/.test(t)));
  ok("quoted typo marked", m.includes("wrod"));
  ok("no identifier marked", !m.some((t) => ["is_leap", "urFucked", "year", "leap", "other"].includes(t) && t !== "leap"));
  ok("browser spellcheck off", await page.evaluate(() => document.querySelector("#doc-editor .cm-content").getAttribute("spellcheck")) === "false");
  const menu = () => page.evaluate(() => { const e = document.getElementById("doc-suggest-menu"); return e && !e.classList.contains("hidden") ? e.textContent.replace(/\s+/g, " ").slice(0, 160) : null; });
  const close = async () => { await page.keyboard.press("Escape"); await page.mouse.click(5, 400); await page.waitForTimeout(300); };
  const center = (t) => page.evaluate((t) => { const e = [...document.querySelectorAll("#doc-editor .cm-finding")].find((x) => x.textContent === t); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, t);
  let p = await center("chekc");
  await page.mouse.move(p.x - 40, p.y + 40); await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(900);
  const hov = await menu(); ok("hover opens the popover", !!hov, hov);
  ok("popover offers Add to dictionary and Ignore", /dictionary/i.test(hov || "") && /Ignore/i.test(hov || ""));
  await close(); ok("closed", !(await menu()));
  p = await center("yeer");
  await page.mouse.click(p.x, p.y); await page.waitForTimeout(500);
  ok("click opens it", !!(await menu()), await menu());
  await close();
  p = await center("wrod");
  await page.mouse.click(p.x, p.y, { button: "right" }); await page.waitForTimeout(500);
  ok("right-click opens it", !!(await menu()), await menu());
  await page.screenshot({ path: process.env.SCRATCH + "/codespell.png" });
  console.log(bad ? "FAILURES " + bad : "all pass");
  await browser.close();
})();
