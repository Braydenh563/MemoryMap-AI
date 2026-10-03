// Drives the OCR workspace end to end on one text image and prints what a
// person meets: the engine status, the controls, the clicks a read takes,
// and what the message line says. Written for INBOX 443 (3).
//
//   BASE=http://127.0.0.1:8792 SCRATCH=/tmp/ocrshots PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/ocrflow.js
const { boot } = require("./lib.js");

const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;width:900px;height:400px;background:#fff;font-family:Arial,sans-serif;color:#111"><div style="padding:40px;font-size:34px;line-height:1.5"><b>Project kickoff</b><br>Scope: capture, search and the graph.<br>Next meeting: Thursday at noon.</div></body>`;

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const scan = await (await browser.newContext()).newPage();
  await scan.setViewportSize({ width: 900, height: 400 });
  await scan.setContent(PAGE);
  const png = (await scan.screenshot({ type: "png" })).toString("base64");
  const media = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fd = new FormData();
    fd.append("file", new File([bytes], `kickoff-${Date.now()}.png`, { type: "image/png" }));
    fd.append("direct", "true");
    const r = await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } });
    return r.json();
  }, png);
  const state = async (label) => {
    const s = await page.evaluate(() => {
      const vis = (id) => { const e = document.getElementById(id); return !!e && !e.classList.contains("hidden") && !e.hidden && e.offsetParent !== null; };
      const sel = document.getElementById("ocr-reader");
      return {
        reader: sel?.value,
        options: [...(sel?.options || [])].map((o) => `${o.value}${o.disabled ? "(disabled)" : ""}${o.hidden ? "(hidden)" : ""}: ${o.textContent}`),
        message: document.getElementById("ocr-message")?.textContent,
        readBtn: document.getElementById("ocr-read-page")?.textContent.trim(),
        readDisabled: document.getElementById("ocr-read-page")?.disabled,
        regions: [...document.querySelectorAll("#ocr-region-list > *")].map((r) => r.textContent.slice(0, 60)),
        caption: vis("ocr-caption") ? document.getElementById("ocr-caption").textContent : "",
        langControl: !!document.querySelector("#ocr-lang, [data-ocr-lang]"),
      };
    });
    console.log(`--- ${label}\n` + JSON.stringify(s, null, 1));
    return s;
  };
  await page.evaluate(() => switchTab("library")); await page.waitForTimeout(1500);
  console.log("readers:", JSON.stringify(await page.evaluate(() => apiJson("/ocr-readers"))));
  await page.evaluate(async (m) => {
    const row = await apiJson(`/media/meta/${encodeURIComponent(m.url.split("/").pop())}`);
    openOcrWorkspace({ ...row, _isImage: true }, [{ ...row, _isImage: true }]);
  }, media);
  await page.waitForTimeout(2500);
  await state("opened");
  await page.screenshot({ path: `${process.env.SCRATCH || "."}/ocrflow-opened.png` });
  // Reader on Tesseract, then read.
  await page.evaluate(() => { const s = document.getElementById("ocr-reader"); s.value = "tesseract"; s.dispatchEvent(new Event("change")); });
  await state("tesseract chosen");
  let clicks = 0;
  const t0 = Date.now();
  await page.evaluate(() => document.getElementById("ocr-read-page").click()); clicks++;
  await page.waitForTimeout(1500);
  await state("after one Read this page click (1.5s)");
  console.log("clicks:", clicks, "ms:", Date.now() - t0);
  await page.screenshot({ path: `${process.env.SCRATCH || "."}/ocrflow-read.png` });
  console.log(await page.evaluate(() => document.querySelector("#toast-container, .toast")?.textContent || "(no toast)"));
  await browser.close();
})();
