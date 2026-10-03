// The OCR workspace's engine line and its new foot buttons at phone width
// (INBOX 443 (3)): nothing overflows sideways, the engine line's controls are
// thumb-sized, and the thumb bar still holds every action. Run against a
// server with the stand-in program (MODE=present in ocrflow.js) so there is a
// reading, and against one without it for the Install line.
//
//   BASE=http://127.0.0.1:8795 SCRATCH=/tmp/ocrshots PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/ocrflowphone.js
const { boot } = require("./lib.js");

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const media = await page.evaluate(async () => {
    const c = document.createElement("canvas");
    c.width = 300; c.height = 120;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, 300, 120);
    g.fillStyle = "#111"; g.font = "24px Arial"; g.fillText("Project kickoff", 20, 60);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const fd = new FormData();
    fd.append("file", new File([blob], `phone-${Date.now()}.png`, { type: "image/png" }));
    fd.append("direct", "true");
    const r = await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } });
    return r.json();
  });
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(1500);
  await page.evaluate(async (m) => {
    const row = await apiJson(`/media/meta/${encodeURIComponent(m.url.split("/").pop())}`);
    openOcrWorkspace({ ...row, _isImage: true }, [{ ...row, _isImage: true }]);
  }, media);
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const rect = (el) => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), l: Math.round(r.left), r: Math.round(r.right) }; };
    const engine = document.getElementById("ocr-engine");
    const bar = document.getElementById("ocr-phone-bar");
    const card = document.querySelector(".ocr-card");
    return {
      engine: engine && !engine.hidden ? rect(engine) : null,
      engineControls: engine ? [...engine.querySelectorAll("button, select")].filter((e) => e.offsetParent).map((e) => ({ t: (e.textContent || e.className).trim().slice(0, 18), ...rect(e) })) : [],
      barOverflow: bar ? bar.scrollWidth - bar.clientWidth : null,
      barButtons: bar ? [...bar.querySelectorAll("button:not(.hidden)")].filter((b) => b.offsetParent).map((b) => ({ id: b.id, ...rect(b) })) : [],
      docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      cardOverflow: card.scrollWidth - card.clientWidth,
      width: window.innerWidth,
    };
  });
  console.log(JSON.stringify(m));
  await page.screenshot({ path: `${process.env.SCRATCH || "."}/ocrflowphone.png` });
  check("phone: the page does not scroll sideways", m.docOverflow <= 0 && m.cardOverflow <= 0, `doc ${m.docOverflow}, card ${m.cardOverflow}`);
  check("phone: the engine line is inside the window", !m.engine || (m.engine.l >= 0 && m.engine.r <= m.width), JSON.stringify(m.engine));
  check("phone: the engine line's controls are thumb-sized", m.engineControls.every((c) => c.h >= 36), m.engineControls.map((c) => `${c.t}:${c.h}`).join(" "));
  check("phone: the thumb bar holds its buttons without scrolling", m.barOverflow === null || m.barOverflow <= 0, `overflow ${m.barOverflow}, ${m.barButtons.length} buttons`);
  console.log(failures ? `${failures} FAILED` : "ALL PASSED");
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
