// DOCUMENTS_PLAN Phase 7: the export menu's two new rows, driven in a browser.
//
// The endpoints are tested in `tests/test_docexport_bundle.py`; what a python
// test cannot see is whether the menu rows exist, whether the handlers are
// wired, and what the app *says* when an install cannot answer (the Word
// export is an optional extra, so on a bare install the honest outcome is a
// message naming the missing package, not a silent nothing).
//
//   BASE=http://127.0.0.1:8793 node scratchpad/ui-sweeps/docexports.js
const { boot } = require("./lib.js");
const { openDoc } = require("./docopen.js");

let failures = 0;
const ok = (name, condition, detail) => {
  if (!condition) failures += 1;
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail === undefined ? "" : `  — ${detail}`}`);
};

(async () => {
  const { browser, page } = await boot();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
  // A refused request logs a console error of the browser's own, and this
  // sweep asks for two on purpose (the Word export on an install with no
  // python-docx). Counting those would make the check fail for doing its job,
  // so what is counted is everything else.
  const EXPECTED = /Failed to load resource.*(501|404)/;
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text().slice(0, 160);
    if (EXPECTED.test(text)) return;
    errors.push(text);
  });

  await openDoc(page, {
    title: "Exports sweep",
    content: "# Exports\n\nA paragraph, and a picture that is not there:\n\n![x](/media/none.png)\n",
  });

  const rows = await page.evaluate(() => {
    const ids = ["doc-export-md", "doc-export-html", "doc-export-zip", "doc-export-docx", "doc-export-pdf"];
    return ids.map((id) => {
      const el = document.getElementById(id);
      return { id, present: !!el, label: el ? el.textContent.trim() : null };
    });
  });
  ok("the export menu has all five rows", rows.every((r) => r.present),
    rows.map((r) => `${r.id}:${r.present}`).join(" "));
  console.log("  rows -> " + rows.map((r) => r.label).join(" / "));

  // The bundle: fetched the way the button fetches it, so the token, the
  // headers and the filename are the real ones.
  const bundle = await page.evaluate(async () => {
    const id = currentDoc.id;
    const response = await fetch(`/documents/${id}/export.zip`, {
      headers: { "X-Auth-Token": authToken() },
    });
    const blob = await response.blob();
    return {
      status: response.status,
      type: response.headers.get("content-type"),
      assets: response.headers.get("X-Assets"),
      disposition: response.headers.get("content-disposition"),
      bytes: blob.size,
    };
  });
  ok("the bundle downloads as a zip",
    bundle.status === 200 && bundle.type === "application/zip" && bundle.bytes > 100,
    JSON.stringify(bundle));
  ok("the bundle names how many images travelled", bundle.assets === "0", bundle.assets);
  ok("the bundle is named after the document",
    /Exports-sweep\.zip/.test(bundle.disposition || ""), bundle.disposition);

  // The Word export on an install without python-docx: a 501 that says which
  // package, shown in the document's own status line rather than swallowed.
  const word = await page.evaluate(async () => {
    const response = await fetch(`/documents/${currentDoc.id}/export.docx`, {
      headers: { "X-Auth-Token": authToken() },
    });
    let detail = "";
    try {
      detail = (await response.json()).detail || "";
    } catch (error) {
      detail = "";
    }
    return { status: response.status, detail };
  });
  if (word.status === 200) {
    ok("this install has the Word exporter and it answered", true, "200");
  } else {
    ok("without the extra the answer names the package",
      word.status === 501 && /python-docx/.test(word.detail), JSON.stringify(word));
    // Two doors, not one. The row is written inside the document's ⋯ menu,
    // which is a `<details>`, but `foldDocMenuGroup` moves the five download
    // rows into a "Download or print" group at load, and that group's flyout
    // is reparented to `<body>` so it can escape the menu's clipping. So the
    // row's runtime parent is the flyout, `row.closest("details")` is null,
    // and opening the `<details>` off the row (what this did) opened nothing
    // and the click timed out on "element is not visible". Open the
    // `<details>` by its own id, then click the group trigger, which is what
    // a person does.
    await page.evaluate(() => {
      const menu = document.getElementById("doc-dock-menu");
      if (menu) menu.open = true;
    });
    await page.waitForTimeout(200);
    const opened = await page.evaluate(() => {
      const row = document.getElementById("doc-export-docx");
      if (!row) return "no row";
      const panel = row.closest(".action-menu.submenu");
      if (!panel) return "not in a flyout";
      // By label, not by position: three groups are folded into this menu
      // ("Download or print", "Editor and layout", "While you write") and
      // the first one is not this one.
      const trigger = [...document.querySelectorAll("#doc-dock-menu .menu-item.has-submenu")]
        .find((el) => /download/i.test(el.textContent));
      if (!trigger) return "no trigger";
      trigger.click();
      return panel.classList.contains("hidden") ? "still hidden" : "open";
    });
    ok("the download group opens off the ⋯ menu", opened === "open", opened);
    await page.waitForTimeout(200);
    await page.click("#doc-export-docx");
    await page.waitForTimeout(700);
    const status = await page.evaluate(() => {
      const el = document.getElementById("doc-status");
      return { text: el.textContent.trim(), error: el.classList.contains("error") };
    });
    ok("and the app says so where a person is looking",
      /python-docx/.test(status.text) && status.error, JSON.stringify(status));
  }

  console.log(`console errors: ${errors.length}${errors.length ? " " + JSON.stringify(errors.slice(0, 3)) : ""}`);
  if (errors.length) failures += 1;
  await browser.close();
  console.log(failures ? `FAIL (${failures})` : "ALL PASS");
  process.exit(failures ? 1 : 0);
})();
