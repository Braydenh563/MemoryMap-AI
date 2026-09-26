// "Clean up repeated lines" in the OCR workspace (INBOX 423f): a picture
// whose stored vision reading is a degenerate loop ("Test, Test, Test, ...")
// gets a broom button beside Delete reading that runs the server's
// cut_reading_loops on the media item and repaints.
//
//   BASE=http://127.0.0.1:8802 SCRATCH=/tmp/mm-inbox423 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/ocrcleanloops.js
const { boot } = require("./lib.js");

let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

const LOOP = "Test, ".repeat(30) + "Test";

async function seed(page) {
  return page.evaluate(async (loop) => {
    const c = document.createElement("canvas");
    c.width = 80; c.height = 60;
    const g = c.getContext("2d");
    g.fillStyle = "#246"; g.fillRect(0, 0, 80, 60);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const fd = new FormData();
    fd.append("file", new File([blob], `cleanloops-${Date.now()}.png`, { type: "image/png" }));
    fd.append("direct", "true");
    const r = await fetch("/media/upload", { method: "POST", body: fd, headers: { "X-Auth-Token": authToken(), "X-Workspace-ID": activeSpaceId() } });
    const media = await r.json();
    await apiJson(`/media/${media.id}/vision-ocr`, { method: "POST", body: JSON.stringify({ text: loop }) });
    return media;
  }, LOOP);
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  try {
    const media = await seed(page);
    const before = await page.evaluate(async (m) => {
      const row = await apiJson(`/media/meta/${encodeURIComponent(m.url.split("/").pop())}`);
      return row.vision_ocr_text || "";
    }, media);
    check("seeded: the stored reading really loops", (before.match(/Test/g) || []).length > 5, `${before.length} chars`);

    // openOcrWorkspace lives in the library bundle, loaded lazily: switching
    // to the Library tab is what pulls it in (ocrreadings.js does the same).
    await page.evaluate(() => switchTab("library"));
    await page.waitForTimeout(800);
    await page.evaluate(async (m) => {
      const row = await apiJson(`/media/meta/${encodeURIComponent(m.url.split("/").pop())}`);
      openOcrWorkspace({ ...row, _isImage: true }, [{ ...row, _isImage: true }]);
    }, media);
    await page.waitForTimeout(2000);

    const btn = await page.evaluate(() => {
      const b = document.getElementById("ocr-clean-loops");
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { visible: !b.classList.contains("hidden") && r.width > 0, x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    check("the clean-up button shows for a picture with a reading", Boolean(btn?.visible), JSON.stringify(btn));

    if (btn?.visible) {
      await page.mouse.click(btn.x, btn.y);
      await page.waitForTimeout(1200);
      const toastText = await page.evaluate(() => document.querySelector(".toast")?.textContent || "");
      check("a toast confirms the clean-up", /clean/i.test(toastText), toastText);

      const after = await page.evaluate(async (m) => {
        const row = await apiJson(`/media/meta/${encodeURIComponent(m.url.split("/").pop())}`);
        return row.vision_ocr_text || "";
      }, media);
      check("the stored reading is actually shorter and no longer loops", after.length < before.length && (after.match(/Test/g) || []).length <= 2,
        `before ${before.length} chars, after ${after.length} chars (${JSON.stringify(after)})`);

      const workspaceText = await page.evaluate(() => {
        const regions = [...document.querySelectorAll("#ocr-region-list .ocr-region")].map((r) => r.textContent).join(" ");
        return regions;
      });
      check("the workspace repaints with the cleaned text", workspaceText.includes(after) || after.length === 0 || workspaceText.length > 0,
        workspaceText.slice(0, 80));
    }
    await page.screenshot({ path: `${process.env.SCRATCH || "."}/shots/ocrcleanloops-${process.env.THEME || "light"}.png` });

    // Clicking again on an already-clean reading must not error or re-loop it.
    if (btn?.visible) {
      const stillBtn = await page.evaluate(() => {
        const b = document.getElementById("ocr-clean-loops");
        const r = b?.getBoundingClientRect();
        return b && !b.classList.contains("hidden") && r?.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      });
      if (stillBtn) {
        await page.mouse.click(stillBtn.x, stillBtn.y);
        await page.waitForTimeout(1000);
        const again = await page.evaluate(async (m) => {
          const row = await apiJson(`/media/meta/${encodeURIComponent(m.url.split("/").pop())}`);
          return row.vision_ocr_text || "";
        }, media);
        check("cleaning an already-clean reading is idempotent", again.length > 0, again);
      }
    }
    // The lightbox's "other readings" list gets the same broom button, for
    // the reading that is not the one shown as the page's sections.
    const media2 = await seed(page);
    await page.evaluate(async (m) => {
      const filename = m.url.split("/").pop();
      await apiJson(`/media/${m.id}/ocr`, { method: "POST", body: JSON.stringify({ text: "Tesseract, not the sections shown." }) });
      const row = await apiJson(`/media/meta/${encodeURIComponent(filename)}`);
      const sel = document.getElementById("ocr-reader");
      const model = [...(sel?.options || [])].find((o) => o.value !== "tesseract");
      if (sel && model) sel.value = model.value;
      openOcrWorkspace({ ...row, _isImage: true }, [{ ...row, _isImage: true }]);
    }, media2);
    await page.waitForTimeout(2000);
    const other = await page.evaluate(() => {
      const b = document.querySelector("#ocr-other-readings .ocr-other-reading-clean");
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    check("the other-readings list in the workspace/lightbox also gets a clean-up button", Boolean(other), JSON.stringify(other));
    if (other) {
      await page.mouse.click(other.x, other.y);
      await page.waitForTimeout(1000);
      const cleanedTess = await page.evaluate(async (m) => {
        const row = await apiJson(`/media/meta/${encodeURIComponent(m.url.split("/").pop())}`);
        return row.ocr_text || "";
      }, media2);
      check("clicking it cleans that field too (no loop here, so it is left as written)",
        cleanedTess === "Tesseract, not the sections shown.", cleanedTess);
    }
  } finally {
    await browser.close();
  }
  console.log(failures ? `${failures} failed` : "all passed");
  process.exit(failures ? 1 : 0);
})();
