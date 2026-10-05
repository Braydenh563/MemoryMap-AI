// FEAT-02: which CSS rule makes one DOM insertion inside the map recalc the
// style of every element on the page (3,731 elements, 60-80ms at 301 topics,
// traced). Bisects the stylesheets, then the culprit sheet's rules.
const { boot } = require("./lib.js");
const N = Number(process.env.N || 301);
function outline(n) {
  const lines = ["# Bisect " + n, "", "- Centre"];
  let made = 1, b = 0;
  while (made < n) {
    lines.push(`  - Branch ${b}`); made++;
    for (let k = 0; k < 9 && made < n; k++, made++) lines.push(`    - Leaf ${b}.${k}`);
    b++;
  }
  return lines.join("\n");
}
(async () => {
  const { page, browser } = await boot();
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(800);
  await page.click('#library-subtabs [data-target="library-view-whiteboard"]');
  await page.waitForTimeout(1200);
  await page.evaluate(async (content) => {
    const b = await apiJson("/whiteboard/boards/import", { method: "POST", body: JSON.stringify({ format: "markdown", content }) });
    await openWhiteboardBoard(b.id);
    await wbMapTidyFresh();
  }, outline(N));
  await page.waitForTimeout(1500);
  const out = await page.evaluate(() => {
    const layer = document.getElementById("wb-html-layer");
    const node = layer.querySelector(":scope > .wb-object");
    const cost = () => {
      const xs = [];
      for (let k = 0; k < 3; k++) {
        void layer.offsetHeight;
        const span = document.createElement("span");
        const t = performance.now();
        node.appendChild(span);
        void layer.offsetHeight;
        xs.push(performance.now() - t);
        span.remove();
        void layer.offsetHeight;
      }
      return xs.sort((a, b) => a - b)[1];
    };
    const log = [];
    const base = cost();
    log.push(`base ${base.toFixed(1)}`);
    const sheets = [...document.styleSheets].filter((s) => { try { return s.cssRules.length > 0; } catch { return false; } });
    // Every style rule whose selector matches a pattern, nested ones too.
    const collect = (test) => {
      const found = [];
      const walk = (list) => {
        for (let i = 0; i < list.cssRules.length; i++) {
          const r = list.cssRules[i];
          if (r.cssRules && !r.selectorText) walk(r);
          else if (r.selectorText && test(r.selectorText)) found.push({ parent: list, rule: r });
        }
      };
      sheets.forEach(walk);
      return found;
    };
    const without = (rules) => {
      const saved = rules.map(({ parent, rule }) => {
        const text0 = rule.cssText;
        const idx = [...parent.cssRules].findIndex((r) => r === rule || r.cssText === text0);
        const text = rule.cssText;
        parent.deleteRule(idx);
        return { parent, idx, text };
      });
      return () => saved.reverse().forEach(({ parent, idx, text }) => parent.insertRule(text, idx));
    };
    for (const [name, test] of [
      [":has", (t) => t.includes(":has(")],
      ["nth/first/last", (t) => /:(nth-|first-|last-|only-)/.test(t)],
      ["sibling ~ +", (t) => /[~+]/.test(t.replace(/\([^)]*\)/g, ""))],
      ["focus-within", (t) => t.includes(":focus-within")],
      ["read-write/empty", (t) => /:(read-|empty|placeholder)/.test(t)],
    ]) {
      const rules = collect(test);
      const restore = without(rules);
      const c = cost();
      restore();
      log.push(`without ${name} (${rules.length} rules): ${c.toFixed(1)}`);
    }
    {
      // All :has rules out, then each put back alone: the ones that bring
      // the cost back are the culprits.
      const rules = collect((t) => t.includes(":has("));
      const texts = rules.map(({ parent, rule }) => ({ parent, text: rule.cssText, sel: rule.selectorText }));
      const restoreAll = without(rules);
      const floor = cost();
      log.push(`floor without :has ${floor.toFixed(1)}`);
      for (const { parent, text, sel } of texts) {
        parent.insertRule(text, parent.cssRules.length);
        const c = cost();
        parent.deleteRule(parent.cssRules.length - 1);
        if (c > floor * 4 + 3) log.push(`CULPRIT ${c.toFixed(1)}ms: ${sel.slice(0, 200)}`);
      }
      const host = sheets[sheets.length - 1];
      for (const sel of [
        ".entry-list.is-rows li:not(:has(textarea)) > [class]:not(.entry-title)",
        ".entry-list.is-rows li:not(:has(textarea)) > *:not(.entry-title)",
        ".entry-list.is-rows li:not(:has(textarea)) > :is(div, span, details, button):not(.entry-title)",
        ".doc-layout:has(> #doc-sidebar.hidden) > [class]:not(#doc-sidebar)",
        ".doc-layout:has(> #doc-sidebar.hidden) > .doc-main",
        ".doc-layout > #doc-sidebar.hidden ~ *",
        ".doc-layout:not(:has(> #doc-sidebar)) > .doc-main",
        "#capture > .row:has(> h2) button[class]:not(.graph-help-toggle)",
        "#capture > .row:has(> h2) :is(button.ghost, button.primary)",
        "#capture > .row:has(> h2) > button",
      ]) {
        host.insertRule(`${sel} { --mm-probe: 1; }`, host.cssRules.length);
        const c = cost();
        host.deleteRule(host.cssRules.length - 1);
        log.push(`${c.toFixed(1).padStart(6)}ms  ${sel}`);
      }
      restoreAll();
    }
    let culprit = null;
    for (const sheet of sheets) {
      sheet.disabled = true;
      const c = cost();
      sheet.disabled = false;
      log.push(`${(sheet.href || "inline").split("/").pop()} off: ${c.toFixed(1)}`);
      if (c < base / 4 && !culprit) culprit = sheet;
    }
    if (!culprit) return log;
    // Bisect top-level rules by deleting ranges and restoring them.
    let lo = 0, hi = culprit.cssRules.length;
    const removeRange = (a, b) => {
      const saved = [];
      for (let i = b - 1; i >= a; i--) { saved.unshift(culprit.cssRules[i].cssText); culprit.deleteRule(i); }
      return () => saved.forEach((text, k) => culprit.insertRule(text, a + k));
    };
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      const restore = removeRange(lo, mid);
      const c = cost();
      restore();
      if (c < base / 4) hi = mid;
      else {
        const restore2 = removeRange(mid, hi);
        const c2 = cost();
        restore2();
        if (c2 < base / 4) lo = mid;
        else { log.push(`split at ${lo}-${hi}: neither half alone (${c.toFixed(1)}, ${c2.toFixed(1)})`); break; }
      }
    }
    log.push(`culprit rule ${lo}: ${culprit.cssRules[lo].cssText.slice(0, 400)}`);
    return log;
  });
  console.log(out.join("\n"));
  await browser.close();
})();
