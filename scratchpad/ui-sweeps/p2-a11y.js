// INBOX 404, the accessibility check: findings in the suggestions panel under
// Accessibility, drawn with their own underline, answered from the menu.
const { boot } = require("./lib.js");
let bad = 0;
const ok = (n, c, d) => { if (!c) bad += 1; console.log(`${c ? "PASS" : "FAIL"}  ${n}${d === undefined ? "" : "  : " + d}`); };
const DOC = "# Report\n\n### Findings\n\nThe chart is below. ![](chart.png)\n\nFor the data [click here](https://example.com/data).\n";
(async () => {
  const { browser, page } = await boot({});
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async (doc) => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "A11y probe", content: doc }) });
    await loadDocuments(d.id);
    setDocView("source");
  }, DOC);
  await page.waitForTimeout(1500);
  const found = await page.evaluate(() => docProseFound.filter((f) => docFindingKind(f) === "access").map((f) => f.rule));
  ok("three accessibility findings", JSON.stringify(found) === JSON.stringify(["heading-order", "image-alt", "link-text"]), JSON.stringify(found));
  const marks = await page.evaluate(() => ({
    n: new Set([...document.querySelectorAll(".cm-finding-access")].map((e) => e.getAttribute("data-doc-finding"))).size,
    style: getComputedStyle(document.querySelector(".cm-finding-access")).textDecorationStyle,
  }));
  ok("drawn with a dashed underline", marks.n === 3 && marks.style === "dashed", JSON.stringify(marks));
  await page.click("#doc-prose");
  await page.waitForTimeout(300);
  const panel = await page.evaluate(() => ({
    groups: [...document.querySelectorAll("#doc-prose-panel .doc-prose-group")].map((g) => g.textContent),
    ring: getComputedStyle(document.querySelector("#doc-prose-panel .doc-finding-dot-access")).boxShadow,
  }));
  ok("the panel lists them under Accessibility", panel.groups.includes("Accessibility3"), panel.groups.join(" | "));
  ok("its dot is a ring", /inset/.test(panel.ring), panel.ring);
  await page.evaluate(() => closeDocProsePanel());
  // The heading fix from the word's menu.
  const spot = await page.evaluate(() => {
    const el = [...document.querySelectorAll(".cm-finding-access")].find((e) => e.textContent.includes("Findings"));
    const r = el.getBoundingClientRect();
    return { x: r.x + 20, y: r.y + r.height / 2 };
  });
  await page.mouse.click(spot.x, spot.y);
  await page.waitForTimeout(400);
  const items = await page.evaluate(() => [...document.querySelectorAll("#doc-suggest-menu:not(.hidden) .doc-suggest-list .doc-suggest-item")].map((b) => b.textContent));
  ok("the heading's menu offers the right level", items.includes("## Findings"), items.join(", "));
  await page.evaluate(() => [...document.querySelectorAll("#doc-suggest-menu .doc-suggest-item")].find((b) => b.textContent === "## Findings")?.click());
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({ text: docText().split("\n")[2], left: docProseFound.filter((f) => f.rule === "heading-order").length }));
  ok("choosing it fixes the outline", after.text === "## Findings" && after.left === 0, JSON.stringify(after));
  console.log(bad ? `${bad} FAILED` : "all passed");
  await browser.close();
})();
