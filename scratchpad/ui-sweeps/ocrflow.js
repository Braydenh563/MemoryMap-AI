// Drives the OCR workspace end to end on one text image: the engine's status
// line, a read, a language change, a read again, an edit, adding the text to a
// note, the Install flow (mocked, so the sandbox is not changed), and the
// Packages row. Written for INBOX 443 (3).
//
// Two modes, because Tesseract is a separate program:
//   MODE=missing  the server runs without it (the sandbox default)
//   MODE=present  the server runs with a stand-in `tesseract` on PATH and the
//                 real pytesseract and Pillow (see the header of the run
//                 recipe in the commit); TESS_STUB_LOG names its call log
//
//   BASE=http://127.0.0.1:8792 MODE=missing SCRATCH=/tmp/ocrshots \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/ocrflow.js
const fs = require("fs");
const { boot } = require("./lib.js");

const MODE = process.env.MODE || "missing";
const SHOTS = process.env.SCRATCH || ".";
let failures = 0;
function check(label, ok, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? "  " + detail : ""}`);
}

const PAGE = `<!doctype html><meta charset="utf-8"><body style="margin:0;width:900px;height:400px;background:#fff;font-family:Arial,sans-serif;color:#111"><div style="padding:40px;font-size:34px;line-height:1.5"><b>Project kickoff</b><br>Scope: capture, search and the graph.<br>Next meeting: Thursday at noon.</div></body>`;

async function engineLine(page) {
  return page.evaluate(() => {
    const host = document.getElementById("ocr-engine");
    if (!host || host.hidden) return { shown: false, text: "", buttons: [], select: null };
    return {
      shown: true,
      text: host.textContent.replace(/\s+/g, " ").trim(),
      buttons: [...host.querySelectorAll("button")].map((b) => b.textContent.trim()).filter(Boolean),
      select: host.querySelector("select.ocr-engine-lang")?.value ?? null,
    };
  });
}

async function menuItem(page, pattern) {
  await page.evaluate(() => document.querySelector("#ocr-more button").click());
  await page.waitForTimeout(300);
  await page.evaluate((source) => {
    const re = new RegExp(source);
    [...document.querySelectorAll(".action-menu:not(.hidden) .menu-item, .sheet-card .menu-item")].find((b) => re.test(b.textContent))?.click();
  }, pattern.source);
  await page.waitForTimeout(300);
}

async function panel(page) {
  return page.evaluate(() => ({
    message: document.getElementById("ocr-message")?.textContent.trim(),
    readLabel: document.getElementById("ocr-read-page-label")?.textContent.trim(),
    source: document.getElementById("ocr-source")?.textContent.trim(),
    regions: [...document.querySelectorAll("#ocr-region-list > li")].map((r) => r.textContent.replace(/\s+/g, " ").trim()),
    reader: document.getElementById("ocr-reader")?.value,
    editShown: Boolean(document.querySelector("#ocr-more .menu-item:not(.menu-item-unavailable)")),
  }));
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });
  const toasts = [];
  await page.exposeFunction("__toast", (t) => toasts.push(t));
  await page.evaluate(() => {
    new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList?.contains("toast")) window.__toast(n.textContent.trim());
    }).observe(document.getElementById("toast-box"), { childList: true });
  });
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
  await page.evaluate(() => switchTab("library"));
  await page.waitForTimeout(1500);
  const open = async () => {
    await page.evaluate(async (m) => {
      const row = await apiJson(`/media/meta/${encodeURIComponent(m.url.split("/").pop())}`);
      openOcrWorkspace({ ...row, _isImage: true }, [{ ...row, _isImage: true }]);
    }, media);
    await page.waitForTimeout(2200);
  };
  const close = async () => {
    await page.evaluate(() => closeOcrWorkspace());
    await page.waitForTimeout(300);
  };

  await open();
  let line = await engineLine(page);
  console.log("engine line:", JSON.stringify(line));
  await page.screenshot({ path: `${SHOTS}/ocrflow-${MODE}-opened.png` });

  if (MODE === "missing") {
    check("missing: the engine line is shown and says it can't read", line.shown && /can't read yet/.test(line.text), line.text);
    check("missing: it names the cause", /isn't installed/.test(line.text));
    check("missing: one Install button", line.buttons.filter((b) => /Install Tesseract/.test(b)).length === 1, line.buttons.join(" | "));
    // A read with nothing available: an error that says what to do, no success.
    toasts.length = 0;
    await page.evaluate(() => document.getElementById("ocr-read-page").click());
    await page.waitForTimeout(800);
    let p = await panel(page);
    check("missing: Read says what to do", /Install Tesseract|start an AI model/.test(p.message), p.message);
    check("missing: no 'Read <file>.' success toast", !toasts.some((t) => /^Read .*\.$/.test(t) && !/can't|Nothing/.test(t)), toasts.join(" | "));
    // The Install flow, with the server's answers mocked so nothing is installed.
    let installed = false;
    let phase = 0;
    await page.route("**/extras/ocr/install", (route) => route.fulfill({ json: { started: true, message: "Installing" } }));
    await page.route("**/extras", (route) => {
      phase += 1;
      if (phase <= 2) return route.fulfill({ json: { extras: [], running: true, installing: "ocr", step: phase === 1 ? "pip install pytesseract Pillow" : "Installing the Tesseract program…", outcome: "", log: [] } });
      installed = true;
      return route.fulfill({ json: { extras: [], running: false, installing: "", step: "Search inside images (Tesseract OCR) is ready. Tesseract installed.", outcome: "completed", log: [] } });
    });
    await page.route("**/ocr-readers", async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      if (installed) body.engine = { ...body.engine, ready: true, binary: true, package: true, version: "5.3.4", reason: "", fix: "", languages: [{ code: "eng", name: "English" }, { code: "deu", name: "German" }] };
      if (installed) body.tesseract = true;
      return route.fulfill({ json: body });
    });
    await page.evaluate(() => [...document.querySelectorAll("#ocr-engine button")].find((b) => /Install Tesseract/.test(b.textContent)).click());
    await page.waitForTimeout(500);
    const dialog = await page.evaluate(() => document.querySelector(".confirm-overlay")?.textContent.replace(/\s+/g, " ").trim());
    check("install: asks first, says what it does", /Install Tesseract OCR\?.*PyPI.*nothing is sent/.test(dialog || ""), (dialog || "").slice(0, 90));
    await page.evaluate(() => [...document.querySelectorAll(".confirm-overlay button")].find((b) => /install|ok|yes|confirm/i.test(b.textContent) && !/cancel/i.test(b.textContent))?.click());
    await page.waitForTimeout(700);
    line = await engineLine(page);
    check("install: progress is shown", /Installing Tesseract/.test(line.text) && /pip install|Starting|Installing the Tesseract/.test(line.text), line.text);
    await page.screenshot({ path: `${SHOTS}/ocrflow-missing-installing.png` });
    await page.waitForTimeout(4200);
    line = await engineLine(page);
    check("install: ends on 'ready' with a language choice", /is ready/.test(line.text) && line.select === "", line.text);
    check("install: the success is announced", toasts.some((t) => /Tesseract is ready/.test(t)), toasts.join(" | "));
    await page.screenshot({ path: `${SHOTS}/ocrflow-missing-after-install.png` });
    // Failure path.
    await page.unroute("**/extras");
    await page.unroute("**/ocr-readers");
    await page.route("**/extras/ocr/install", (route) => route.fulfill({ json: { started: true, message: "Installing" } }));
    await page.route("**/extras", (route) => route.fulfill({ json: { extras: [], running: false, installing: "", step: "The Python part is installed, but the Tesseract program is not. Couldn't find a package manager to install Tesseract automatically on this system, install it by hand (see INSTALL.md).", outcome: "completed", log: [] } }));
    await close();
    await open();
    await page.evaluate(() => [...document.querySelectorAll("#ocr-engine button")].find((b) => /Install Tesseract/.test(b.textContent)).click());
    await page.waitForTimeout(400);
    await page.evaluate(() => [...document.querySelectorAll(".confirm-overlay button")].find((b) => /install|ok|yes|confirm/i.test(b.textContent) && !/cancel/i.test(b.textContent))?.click());
    await page.waitForTimeout(2200);
    line = await engineLine(page);
    check("install failure: says why and offers Try again", /by hand/.test(line.text) && line.buttons.some((b) => /Try again/.test(b)), line.text.slice(0, 160));
    check("install failure: points at the log", /Settings, Packages/.test(line.text));
    await page.screenshot({ path: `${SHOTS}/ocrflow-missing-failed.png` });
    // Packages: the row offers Install and does not claim it is installed.
    await page.unroute("**/extras");
    await page.unroute("**/extras/ocr/install");
    await close();
    await page.evaluate(() => openSettingsModal("extras"));
    await page.waitForTimeout(1500);
    const row = await page.evaluate(() => {
      const li = document.getElementById("extra-row-ocr");
      return li ? { text: li.textContent.replace(/\s+/g, " ").trim(), buttons: [...li.querySelectorAll("button")].map((b) => b.textContent.trim()) } : null;
    });
    check("packages: the OCR row is not 'Installed' and offers Install", row && !/Installed/.test(row.text) && row.buttons.some((b) => /Install/.test(b)), row && row.buttons.join(" | "));
  } else {
    const log = process.env.TESS_STUB_LOG;
    check("present: the engine line says it is ready, with the version", line.shown && /Tesseract 5\.3\.4 is ready/.test(line.text), line.text);
    check("present: a language picker (Default, English, German)", line.select === "", line.text);
    const options = await page.evaluate(() => [...document.querySelectorAll("#ocr-engine select.ocr-engine-lang option")].map((o) => o.textContent));
    check("present: the languages come from the program", options.join(",") === "Default,English,German", options.join(","));
    check("present: no Install button", !line.buttons.some((b) => /Install/.test(b)), line.buttons.join(" | "));
    let p = await panel(page);
    check("present: the reader falls to Tesseract (no model here)", p.reader === "tesseract", p.reader);
    // One press reads.
    toasts.length = 0;
    const t0 = Date.now();
    await page.evaluate(() => document.getElementById("ocr-read-page").click());
    await page.waitForFunction(() => !document.getElementById("ocr-read-page").disabled && document.querySelectorAll("#ocr-region-list > li").length >= 3, null, { timeout: 15000 }).catch(async () => {
      console.log("read never produced three sections:", JSON.stringify(await panel(page)), toasts.join(" | "));
      await page.screenshot({ path: `${SHOTS}/ocrflow-present-stuck.png` });
    });
    const ms = Date.now() - t0;
    p = await panel(page);
    console.log("read took", ms, "ms; 1 click");
    check("read: three sections, from one click", p.regions.length === 3, `${p.regions.length} sections in ${ms} ms`);
    check("read: the result says who read it", /Tesseract/.test(p.source) && /Read by Tesseract/.test(p.message), `${p.source} | ${p.message}`);
    check("read: the button now says Read again", p.readLabel === "Read again", p.readLabel);
    check("read: the result can be edited", p.editShown);
    await page.screenshot({ path: `${SHOTS}/ocrflow-present-read.png` });
    // Language is remembered and applied on demand.
    await page.evaluate(() => { const s = document.querySelector("#ocr-engine select.ocr-engine-lang"); s.value = "deu"; s.dispatchEvent(new Event("change", { bubbles: true })); });
    await page.waitForTimeout(900);
    p = await panel(page);
    check("language: changing it does not re-run by itself", !/\[deu\]/.test(p.regions.join(" ")));
    check("language: it says how to apply it", toasts.some((t) => /German from now on.*Read a page again/.test(t)), toasts.join(" | "));
    await page.evaluate(() => document.getElementById("ocr-read-page").click());
    await page.waitForFunction(() => /\[deu\]/.test(document.getElementById("ocr-region-list").textContent), null, { timeout: 15000 });
    check("language: Read again reads in German (stub echoes the -l it got)", true);
    const calls = fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "";
    check("language: the program was called with -l deu", /-l deu/.test(calls), calls.split("\n").slice(-3).join(" ; "));
    await close();
    await open();
    line = await engineLine(page);
    check("language: remembered after closing and reopening", line.select === "deu", `select ${line.select}`);
    // Edit and save.
    p = await panel(page);
    await menuItem(page, /Edit the text/);
    await page.fill("#ocr-edit-box", "Project kickoff\n\nCorrected by hand.");
    await page.evaluate(() => document.getElementById("ocr-edit-save").click());
    await page.waitForTimeout(1500);
    p = await panel(page);
    check("edit: the saved text becomes the sections", p.regions.length === 2 && /Corrected by hand/.test(p.regions.join(" ")), p.regions.join(" | "));
    const stored = await page.evaluate(async (m) => (await apiJson(`/media/meta/${encodeURIComponent(m.url.split("/").pop())}`)).ocr_text, media);
    check("edit: it is stored", /Corrected by hand/.test(stored), stored);
    // Add to an existing note.
    const note = await page.evaluate(async () => {
      const r = await apiJson("/entries", { method: "POST", body: JSON.stringify({ content: "A note to add to" }) });
      return r.id;
    });
    await page.evaluate(() => loadEntries?.());
    await menuItem(page, /Add to an existing note/);
    await page.waitForTimeout(900);
    const picked = await page.evaluate(() => {
      const row = [...document.querySelectorAll(".entry-pick-list > *")].find((r) => /A note to add to/.test(r.textContent));
      row?.click();
      return Boolean(row);
    });
    await page.waitForTimeout(1200);
    const after = await page.evaluate(async (id) => (await apiJson(`/entries/${id}`)).content, note);
    check("add to note: the reading lands in the chosen note", picked && /Corrected by hand/.test(after), after.slice(0, 80));
    // Settings, Packages: the same language, one place.
    await close();
    await page.evaluate(() => openSettingsModal("extras"));
    await page.waitForTimeout(1800);
    const row = await page.evaluate(() => {
      const li = document.getElementById("extra-row-ocr");
      return li ? { text: li.textContent.replace(/\s+/g, " ").trim(), select: li.querySelector("select.ocr-engine-lang")?.value ?? null, installChips: li.querySelectorAll("button").length } : null;
    });
    check("packages: the row is Installed and shows the same language", row && /Installed/.test(row.text) && row.select === "deu", row && `${row.select}`);
    await page.evaluate(() => document.getElementById("extra-row-ocr")?.scrollIntoView({ block: "center" }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/ocrflow-present-packages.png` });
    // Reset for the next run.
    await page.evaluate(() => apiJson("/ocr/language", { method: "POST", body: JSON.stringify({ language: "" }) }));
  }
  console.log(failures ? `${failures} FAILED` : "ALL PASSED");
  await browser.close();
  process.exit(failures ? 1 : 0);
})();
