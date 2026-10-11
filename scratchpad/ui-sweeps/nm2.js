const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot();
  await page.evaluate(() => switchTab("documents"));
  await page.waitForTimeout(2000);
  await page.evaluate(async () => { const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "s1011", content: "hello world some words here", file_type: "md" }) }); await loadDocuments(d.id); });
  await page.waitForTimeout(3000);
  await page.dblclick("#doc-editor .cm-content");
  await page.waitForTimeout(800);
  console.log(JSON.stringify(await page.evaluate(() => { const bar = document.getElementById("selection-bar"); const pop = document.querySelector(".selection-popup"); return { sel: window.getSelection().toString(), bar: bar && !bar.classList.contains("hidden"), buttons: bar ? [...bar.querySelectorAll("button")].map((b) => [b.title, b.hidden, b.getAttribute("aria-disabled")]) : null, pop: pop && pop.textContent.slice(0,50), popShown: pop && pop.getBoundingClientRect().width > 0 }; })));
  await page.screenshot({ path: process.env.SCRATCH + "/nm2.png" }).catch(()=>{});
  await browser.close();
})();
