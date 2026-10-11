// Owner 2026-10-11: with no model, AI-only controls in the document and code editors are disabled with a reason.
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  const open = async (t, f, c) => {
    await page.evaluate(async ([t, f, c]) => { const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: t, content: c, file_type: f }) }); await loadDocuments(d.id); }, [t, f, c]);
    await page.waitForTimeout(1500);
  };
  const state = (ids) => page.evaluate((ids) => ids.map((id) => { const e = document.getElementById(id); if (!e) return [id, "missing"]; const r = e.getBoundingClientRect(); return [id, `shown=${r.width > 0} disabled=${e.disabled || e.getAttribute("aria-disabled")} ro=${e.readOnly}`]; }), ids);
  const ids = ["doc-ai", "doc-code-assist-open", "doc-ai-instruction", "doc-ai-run", "inline-ai-run"];
  await open("p1011", "md", "hello world some words here");
  await page.waitForTimeout(3000);
  console.log("md", JSON.stringify(await state(ids)));
  // selection bar
  await page.evaluate(() => { docCmView.focus(); docCmView.dispatch({ selection: { anchor: 0, head: 11 } }); });
  await page.waitForTimeout(600);
  console.log("selbar", JSON.stringify(await page.evaluate(() => { const b = document.querySelector("#selection-bar [data-inline-ai]"); const bar = document.getElementById("selection-bar"); return [bar && !bar.classList.contains("hidden"), b && { hidden: b.hidden, aria: b.getAttribute("aria-disabled"), dis: b.disabled }]; })));
  await open("c1011", "py", "def f():\n    return 1\n");
  console.log("py", JSON.stringify(await state(ids)));
  await page.click("#doc-code-assist-open").catch((e) => console.log("click fail", e.message.slice(0, 80)));
  await page.waitForTimeout(500);
  console.log("assist", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("#doc-code-assist button, #doc-code-assist input, #doc-code-assist textarea")].map((e) => [e.id || e.textContent.trim().slice(0, 14), e.disabled || e.getAttribute("aria-disabled") || false, e.readOnly]))));
  console.log("aiOff", await page.evaluate(() => aiIsOff()));
  await browser.close();
})();
