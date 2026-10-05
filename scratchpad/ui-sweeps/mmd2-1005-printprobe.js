// What a document's print lays out: the chain of boxes from #tab-documents
// down to #doc-preview under print media, and how many pages the PDF has.
//   BASE=... node scratchpad/ui-sweeps/mmd2-1005-printprobe.js
const { boot } = require("./lib.js");
(async () => {
  const { page, browser } = await boot();
  await page.evaluate(async () => {
    const doc = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "P", content: "# P\n\n" + "words here. ".repeat(3000) }) });
    switchTab("documents");
    await openDocument(doc.id);
    setDocView("rendered");
    renderDocPreview();
    document.body.classList.add("printing-doc");
  });
  await page.waitForTimeout(800);
  await page.emulateMedia({ media: "print" });
  const r = await page.evaluate(() => {
    const line = (e) => `${e.tagName}#${e.id}.${[...e.classList].slice(0, 3).join(".")} disp=${getComputedStyle(e).display} h=${e.getBoundingClientRect().height | 0} ov=${getComputedStyle(e).overflow} pos=${getComputedStyle(e).position}`;
    const out = [];
    for (let e = document.getElementById("doc-preview"); e && e !== document.documentElement; e = e.parentElement) out.push(line(e));
    return out;
  });
  console.log(r.join("\n"));
  const pdf = await page.pdf({ preferCSSPageSize: true });
  console.log("count", /\/Count (\d+)/.exec(pdf.toString("latin1"))[1]);
  await browser.close();
})();
