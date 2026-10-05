// The audit's D4 (DOCUMENTS_PLAN decision 7): Print or save as PDF asks for
// page size, orientation and margins, and the page number and title, then
// prints on that page; the PDF Chromium makes is measured for its page box.
//
//   BASE=http://127.0.0.1:8858 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmd2-1005-printsetup.js   (THEME=dark, W=390)
const { boot, OUT } = require("./lib.js");
(async () => {
  const W = Number(process.env.W || 1440);
  const { page, browser } = await boot({ viewport: { width: W, height: W < 600 ? 844 : 900 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  const para = "A paragraph long enough to fill a page when it is written out many times over, so the print has more than one page to number. ";
  await page.evaluate(async (text) => {
    localStorage.removeItem("docPrintSetup");
    const doc = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Print \"me\"", content: `# Print\n\n${text}` }) });
    switchTab("documents");
    await openDocument(doc.id);
    window.__printed = 0;
    window.print = () => { window.__printed += 1; };
  }, Array.from({ length: 40 }, () => para).join("\n\n"));
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById("doc-export-pdf").click());
  await page.waitForTimeout(500);
  const dialog = await page.evaluate(() => {
    const card = document.querySelector(".doc-print-card");
    const r = card?.getBoundingClientRect();
    return {
      open: Boolean(card), inWindow: r && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
      groups: card ? [...card.querySelectorAll("[role=group]")].map((g) => `${g.getAttribute("aria-label")}:${g.querySelector("[aria-pressed=true]")?.textContent}`) : [],
      numbers: document.getElementById("doc-print-numbers")?.checked, focus: document.activeElement?.id,
    };
  });
  check("one step before the browser's dialog, with the defaults chosen",
    dialog.open && dialog.inWindow && dialog.groups.join(",") === "Page size:A4,Orientation:Portrait,Margins:Normal" && dialog.numbers === true && dialog.focus === "doc-print-go",
    JSON.stringify(dialog));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const cancelled = await page.evaluate(() => ({ open: Boolean(document.querySelector(".doc-print-card")), printed: window.__printed }));
  check("Escape leaves without printing", !cancelled.open && cancelled.printed === 0, JSON.stringify(cancelled));
  await page.evaluate(() => document.getElementById("doc-export-pdf").click());
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const pick = (label, value) => [...document.querySelectorAll(`.doc-print-card [aria-label="${label}"] button`)].find((b) => b.textContent === value).click();
    pick("Page size", "Letter");
    pick("Orientation", "Landscape");
    pick("Margins", "Narrow");
    document.getElementById("doc-print-go").click();
  });
  await page.waitForTimeout(900);
  const applied = await page.evaluate(() => {
    const sheet = [...document.adoptedStyleSheets].reverse().find((s) => [...s.cssRules].some((r) => /@page/.test(r.cssText)));
    return {
      printed: window.__printed,
      css: sheet ? [...sheet.cssRules].map((r) => r.cssText).join(" ") : "",
      saved: JSON.parse(localStorage.getItem("docPrintSetup") || "null"),
      printing: document.body.classList.contains("printing-doc"),
    };
  });
  check("Print prints on the page chosen, and remembers it",
    applied.printed === 1 && /size: letter landscape/i.test(applied.css) && /margin: 12mm/.test(applied.css) && applied.saved?.size === "Letter",
    JSON.stringify({ printed: applied.printed, saved: applied.saved }));
  check("the page number and the title are in the page's own margin",
    /@bottom-center/.test(applied.css) && /counter\(page\)/.test(applied.css) && /@top-center/.test(applied.css) && /Print \\"me\\"/.test(applied.css),
    applied.css.slice(0, 400));
  // The PDF Chromium makes from it: the page box is Letter, turned.
  await page.emulateMedia({ media: "print" });
  const probe = await page.evaluate(() => {
    const p = document.getElementById("doc-preview");
    return { printing: document.body.classList.contains("printing-doc"), h: p.scrollHeight, shown: !p.classList.contains("hidden"), paras: p.querySelectorAll("p").length, docH: document.documentElement.scrollHeight };
  });
  console.log("probe", JSON.stringify(probe));
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const text = pdf.toString("latin1");
  const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(text);
  const pages = Number((/\/Count (\d+)/.exec(text) || [])[1] || 0);
  check("the PDF's pages are Letter landscape, more than one", box && Math.round(Number(box[1])) === 792 && Math.round(Number(box[2])) === 612 && pages >= 2,
    JSON.stringify({ box: box && [box[1], box[2]], pages }));
  require("fs").writeFileSync(`${OUT}/mmd2-print.pdf`, pdf);
  //: The words on the paper, where poppler's pdftotext is installed: each
  //: page carries "n/N" at its foot and the title at its head.
  try {
    const words = require("child_process").execFileSync("pdftotext", ["-layout", `${OUT}/mmd2-print.pdf`, "-"]).toString();
    const numbers = (words.match(/^\s+\d+\s*\/\s*\d+\s*$/gm) || []).map((x) => x.trim().replace(/\s+/g, ""));
    const heads = (words.match(/^\s{10,}Print "me"\s*$/gm) || []).length;
    check("every page has its number and the title", numbers.join(",") === Array.from({ length: pages }, (_, i) => `${i + 1}/${pages}`).join(",") && heads === pages,
      JSON.stringify({ numbers, heads }));
  } catch (err) {
    console.log("SKIP  pdftotext not available:", err.message.slice(0, 80));
  }
  console.log("pdf", `${OUT}/mmd2-print.pdf`);
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  await browser.close();
})();
