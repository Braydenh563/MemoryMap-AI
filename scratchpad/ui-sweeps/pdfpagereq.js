// The Files sub-tab asks for a PDF's first page only when the server can draw
// one (OPEN.md, Library, "A Files row asks for a PDF first page that this
// sandbox cannot render"). Seeds two one-page PDFs, opens Library > Files and
// counts `/pdf-page/` requests and 404s. On a server without the render extra
// (`has_pages` false on every row) the count must be 0 and each row still draws
// its type glyph; on one with it, each PDF row's page is asked for once.
//   BASE=http://127.0.0.1:8798 VIEWPORT=390x844 THEME=dark node pdfpagereq.js
const { boot } = require("./lib.js");

const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);

(async () => {
  const { page, browser } = await boot({ viewport: { width: vw, height: vh } });
  let fails = 0;
  const check = (ok, label) => { if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"} ${label}`); };
  const asked = [];
  const missing = [];
  page.on("request", (r) => { if (r.url().includes("/pdf-page/")) asked.push(r.url()); });
  page.on("response", (r) => { if (r.url().includes("/pdf-page/") && r.status() === 404) missing.push(r.url()); });
  const rows = await page.evaluate(async () => {
    const have = await (await api("/media?limit=200")).json();
    if (have.filter((r) => /\.pdf$/i.test(r.original_name)).length < 2) {
      for (let i = 0; i < 2; i += 1) {
        const body = `BT /F1 12 Tf 40 120 Td (Page probe ${i}) Tj ET`;
        const objs = [
          "<</Type/Catalog/Pages 2 0 R>>",
          "<</Type/Pages/Kids[3 0 R]/Count 1>>",
          "<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>",
          `<</Length ${body.length}>>\nstream\n${body}\nendstream`,
          "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
        ];
        let pdf = "%PDF-1.4\n";
        const offsets = [];
        objs.forEach((o, j) => { offsets.push(pdf.length); pdf += `${j + 1} 0 obj\n${o}\nendobj\n`; });
        const xref = pdf.length;
        pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
        for (const off of offsets) pdf += String(off).padStart(10, "0") + " 00000 n \n";
        pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF\n`;
        const fd = new FormData();
        fd.append("file", new File([pdf], `page-probe-${i}.pdf`, { type: "application/pdf" }));
        fd.append("direct", "true");
        await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } });
      }
    }
    return (await (await api("/media?limit=200")).json()).filter((r) => /\.pdf$/i.test(r.original_name));
  });
  const drawable = rows.filter((r) => r.has_pages).length;
  console.log(`pdf rows ${rows.length}, has_pages on ${drawable}`);
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("#library-subtabs button, [data-subtab]")]
      .find((e) => /file/i.test(e.textContent || e.dataset.subtab || ""));
    if (b) b.click();
  });
  await page.waitForTimeout(1800);
  const tiles = await page.evaluate(() => [...document.querySelectorAll(".library-image-tile")]
    .filter((t) => /pdf/i.test(t.textContent || ""))
    .map((t) => ({ glyph: !!t.querySelector(".library-file-thumb i.ph"), page: !!t.querySelector(".library-file-page") })));
  console.log(JSON.stringify({ asked: asked.length, missing: missing.length, tiles }));
  check(tiles.length >= 2, `PDF rows on screen (${tiles.length})`);
  check(tiles.every((t) => t.glyph), "every PDF row draws its type glyph");
  if (drawable) {
    check(missing.length === 0, `no page 404s (${missing.length})`);
  } else {
    check(asked.length === 0, `no first-page request without the render extra (${asked.length})`);
    check(tiles.every((t) => !t.page), "no page image in any row");
  }
  console.log(fails ? `${fails} failed` : "all passed");
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
