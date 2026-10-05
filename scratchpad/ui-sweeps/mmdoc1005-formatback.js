// INBOX 574: a hidden formatting toolbar has a visible way back. With the
// strip hidden, the dock shows a labelled Formatting button; it, Ctrl+Shift+X,
// the ⋯ menu's row and the palette row each bring the strip back; the first
// hide says where it went, once; a code file shows no button.
//
//   BASE=http://127.0.0.1:8844 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//   node scratchpad/ui-sweeps/mmdoc1005-formatback.js   (VIEWPORT=390x844, THEME=dark)
const { boot } = require("./lib.js");
const VIEWPORT = (() => {
  const [w, h] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
  return { width: w, height: h };
})();

(async () => {
  const { page, browser } = await boot({ viewport: VIEWPORT, hasTouch: VIEWPORT.width < 600, isMobile: VIEWPORT.width < 600 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  const results = [];
  const check = (name, ok, detail) => {
    results.push(ok);
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail ?? ""}`);
  };
  await page.evaluate(async () => {
    localStorage.removeItem("doc-toolbar-hidden-hint");
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Format back", content: "Some words." }),
    });
    const doc = await r.json();
    switchTab("documents");
    await new Promise((res) => setTimeout(res, 400));
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 1500));
    setDocView("live");
  });
  const state = () => page.evaluate(() => {
    const strip = document.getElementById("doc-toolbar");
    const pill = document.getElementById("doc-format-show");
    const r = pill.getBoundingClientRect();
    return {
      strip: Boolean(strip.checkVisibility()),
      pill: Boolean(pill.checkVisibility()),
      pillText: pill.textContent.trim(),
      pillBox: [r.left, r.top, r.width, r.height].map(Math.round),
      pillInView: r.right <= innerWidth && r.bottom <= innerHeight && r.width > 0,
      menuRow: document.getElementById("doc-format-toggle-label")?.textContent,
      toasts: [...document.querySelectorAll(".toast, #toast-box *")].map((t) => t.textContent).join(" | "),
    };
  });
  const show = async () => page.evaluate(() => { if (docToolbarCollapsed()) setDocToolbarCollapsed(false); });
  const hide = async () => page.evaluate(() => { if (!docToolbarCollapsed()) setDocToolbarCollapsed(true); });

  await show();
  let s = await state();
  check("with the strip shown, no Formatting button", s.strip && !s.pill, JSON.stringify(s));
  // Hidden the way a person hides it: the strip's own collapse button.
  await page.evaluate(() => document.querySelector("#doc-toolbar .doc-toolbar-collapse").click());
  await page.waitForTimeout(400);
  s = await state();
  if (VIEWPORT.width < 600) {
    // A phone formats from the bar at the thumb; no second row in the dock.
    check("on a phone the dock carries no Formatting button", !s.pill, JSON.stringify(s.pillBox));
    console.log(`${results.filter(Boolean).length}/${results.length} passed`);
    await browser.close();
    return;
  }
  check("hidden: a labelled Formatting button in the dock, on screen", !s.strip && s.pill && s.pillText === "Formatting" && s.pillInView, JSON.stringify(s.pillBox));
  check("and the first hide says how to bring it back", /Formatting hidden\. Bring it back from the Formatting button or Ctrl\+Shift\+X/.test(s.toasts), s.toasts.slice(0, 160));
  check("the menu row offers to show it", s.menuRow === "Show formatting toolbar", s.menuRow);
  await page.click("#doc-format-show");
  await page.waitForTimeout(300);
  s = await state();
  check("the Formatting button brings it back", s.strip && !s.pill);

  await hide();
  await page.waitForTimeout(800);
  const secondToast = (await state()).toasts;
  check("the second hide says nothing", !/Formatting hidden/.test(secondToast.split("|").slice(-1)[0] || ""), "");
  await page.click(".cm-content");
  await page.keyboard.press("Control+Shift+X");
  await page.waitForTimeout(300);
  check("Ctrl+Shift+X in the text brings it back", (await state()).strip);
  await page.keyboard.press("Control+Shift+X");
  await page.waitForTimeout(300);
  check("and hides it again", !(await state()).strip);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Control+Shift+X");
  await page.waitForTimeout(300);
  check("Ctrl+Shift+X from outside the text too", (await state()).strip);

  await hide();
  await page.evaluate(() => {
    document.getElementById("doc-dock-menu").open = true;
    document.getElementById("doc-format-toggle").click();
  });
  await page.waitForTimeout(300);
  check("the menu row brings it back", (await state()).strip);

  await hide();
  const palette = await page.evaluate(() => {
    const row = paletteCommands().find((r) => /formatting toolbar/i.test(r.label));
    if (!row) return null;
    row.run();
    return { label: row.label, keys: row.keys };
  });
  await page.waitForTimeout(300);
  check("the palette row brings it back, with its key", palette && palette.keys === "Ctrl+Shift+X" && (await state()).strip, JSON.stringify(palette));

  const sheet = await page.evaluate(() => {
    const list = document.createElement("ul");
    renderDocShortcutSheet(list);
    return list.textContent.includes("formatting toolbar") && list.textContent.includes("X");
  });
  check("the shortcut sheet lists it", sheet);

  await hide();
  const code = await page.evaluate(async () => {
    const r = await fetch("/documents", {
      method: "POST",
      headers: { "X-Auth-Token": localStorage.getItem("token") || "", "Content-Type": "application/json" },
      body: JSON.stringify({ title: "script.py", content: "print(1)\n" }),
    });
    const doc = await r.json();
    await openDocument(doc.id);
    await new Promise((res) => setTimeout(res, 1500));
    currentDoc.file_type = "py";
    syncDocFileType();
    return { type: docFileType().previewable, pill: document.getElementById("doc-format-show").checkVisibility() };
  });
  check("a code file has no Formatting button", code.type === false && !code.pill, JSON.stringify(code));
  await page.screenshot({ path: `${process.env.SCRATCH || "/tmp"}/mmdoc1005-formatback-${VIEWPORT.width}-${process.env.THEME || "light"}.png` });
  console.log("errors", errs.length, errs.slice(0, 3));
  console.log(`${results.filter(Boolean).length}/${results.length} passed`);
  await browser.close();
})();
