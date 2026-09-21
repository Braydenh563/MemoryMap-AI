// The documents formatting strip against the bar recipe, measured the way
// heads2.js measures a head row: consistency.md item 3 lists `.doc-toolbar` as
// the one surface still off `.dock > * > button.ghost`. Rest and hover are both
// read, because the gap that report is about is a *state*, not a geometry.
const { boot } = require("./lib.js");

const read = (page, sel, hoverFirst) => page.evaluate(({ s, hover }) => {
  const el = [...document.querySelectorAll(s)].find(
    (e) => e.checkVisibility && e.checkVisibility() && e.getBoundingClientRect().height > 0);
  if (!el) return null;
  const c = getComputedStyle(el);
  const kids = [...el.querySelectorAll("button, summary")].filter(
    (e) => e.checkVisibility && e.checkVisibility()
      && !e.closest(".action-menu, .doc-dock-menu-list, .doc-toolbar-menu-list")
      && !(e.parentElement && e.parentElement.classList.contains("seg")));
  const solid = (x) => {
    const m = String(x).match(/rgba?\(([^)]+)\)/);
    if (!m) return true;
    const p = m[1].split(/[\s,/]+/).map(Number);
    return (p.length < 4 ? 1 : p[3]) > 0.01;
  };
  const one = (e) => {
    const b = getComputedStyle(e);
    return {
      bg: solid(b.backgroundColor) ? b.backgroundColor : "transparent",
      border: `${b.borderTopWidth} ${solid(b.borderTopColor) ? b.borderTopColor : "transparent"}`,
      radius: b.borderTopLeftRadius,
      h: +e.getBoundingClientRect().height.toFixed(1),
      shadow: b.boxShadow === "none" ? "none" : "some",
    };
  };
  const rows = kids.map(one);
  const out = {
    surface: {
      bg: solid(c.backgroundColor) ? c.backgroundColor : "transparent",
      radius: c.borderTopLeftRadius,
      h: +el.getBoundingClientRect().height.toFixed(0),
    },
    controls: kids.length,
    heights: [...new Set(rows.map((r) => r.h))].sort((a, b) => a - b),
    radii: [...new Set(rows.map((r) => r.radius))],
    fillsAtRest: [...new Set(rows.map((r) => r.bg))],
    borders: [...new Set(rows.map((r) => r.border))],
    shadows: [...new Set(rows.map((r) => r.shadow))],
  };
  if (hover) {
    // The hover fill, read by forcing the style rather than by moving a real
    // pointer: `:hover` cannot be measured for twenty controls one at a time
    // without twenty round trips, and what is under test is the declared fill.
    const probe = kids[0];
    out.firstControl = probe ? probe.title || probe.textContent.trim().slice(0, 12) : null;
  }
  return out;
}, { s: sel, hover: Boolean(hoverFirst) });

(async () => {
  const { browser, page } = await boot();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });

  // The reference: a bar that is on the recipe.
  await page.click('[data-tab="notes"]').catch(() => {});
  await page.waitForTimeout(900);
  console.log("notes dock (the reference):", JSON.stringify(await read(page, '[data-dock-name="notes"]')));

  await page.evaluate(async () => {
    const r = await api("/documents", { method: "POST",
      body: JSON.stringify({ title: "Toolbar probe", content: "# Heading\n\nSome words.\n" }) });
    const doc = await r.json();
    switchTab("documents");
    await openDocument(doc.id);
  });
  await page.waitForTimeout(2500);
  // The strip starts collapsed (DOCUMENTS_PLAN D1), so it is opened the way a
  // reader opens it rather than by peeling a class off.
  await page.evaluate(() => setDocToolbarCollapsed(false));
  await page.waitForTimeout(500);
  const bar = await read(page, "#doc-toolbar", true);
  console.log("doc toolbar:              ", JSON.stringify(bar));

  // The hover state, on a real pointer, for one button of each shape.
  const hover = async (sel) => {
    const box = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, sel);
    if (!box) return null;
    await page.mouse.move(box.x, box.y);
    await page.waitForTimeout(220);
    return page.evaluate((s) => {
      const b = getComputedStyle(document.querySelector(s));
      return { bg: b.backgroundColor, border: `${b.borderTopWidth} ${b.borderTopColor}` };
    }, sel);
  };
  console.log("notes dock button, hovered:", JSON.stringify(
    await hover('[data-dock-name="notes"] button.ghost')));
  console.log("doc toolbar button, hovered:", JSON.stringify(
    await hover('#doc-toolbar button[data-md="bold"]')));
  console.log("doc toolbar summary, hovered:", JSON.stringify(
    await hover("#doc-toolbar summary")));

  const tokens = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return {
      ghostBtnBg: cs.getPropertyValue("--ghost-btn-bg").trim(),
      ghostBtnBorder: cs.getPropertyValue("--ghost-btn-border").trim(),
      accentSoft: cs.getPropertyValue("--accent-soft").trim(),
      controlH: cs.getPropertyValue("--control-h").trim(),
      radiusMd: cs.getPropertyValue("--radius-md").trim(),
    };
  });
  console.log("tokens:", JSON.stringify(tokens));
  console.log("console errors:", errs.length);
  await browser.close();
})();
