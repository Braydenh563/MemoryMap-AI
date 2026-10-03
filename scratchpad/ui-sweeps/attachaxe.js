// INBOX 440 (2): axe-core (WCAG 2.2 AA) and measured contrast on every
// surface that draws an attachment card: the note card, its open ⋯ menu, the
// edit form and the Capture box. Seed with attachcards.js first.
//
//   BASE=http://127.0.0.1:8789 THEME=dark AXE_JS=/tmp/axe-core/package/axe.min.js \
//     node scratchpad/ui-sweeps/attachaxe.js
const fs = require("fs");
const { boot } = require("./lib");
const AXE = fs.readFileSync(process.env.AXE_JS || "/tmp/axe-core/package/axe.min.js", "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page, where, selector) {
  await page.evaluate(AXE);
  const r = await page.evaluate(async ([sel, tags]) => {
    const nodes = [...document.querySelectorAll(sel)];
    const out = [];
    for (const node of nodes) {
      const res = await window.axe.run(node, { runOnly: { type: "tag", values: tags } });
      for (const v of res.violations) out.push(`${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(" | ")}`);
    }
    return { n: nodes.length, out };
  }, [selector, TAGS]);
  console.log(`[${where}] ${r.n} scanned, ${r.out.length} violations`);
  r.out.forEach((l) => console.log("   ", l));
}

//: WCAG relative luminance contrast, from computed colours, walking up for
//: the first opaque ground (a card is opaque; its `.att-cards` is not).
async function contrast(page, where) {
  const rows = await page.evaluate(() => {
    const parse = (c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ground = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = parse(getComputedStyle(n).backgroundColor);
        if (c.length >= 3 && (c.length < 4 || c[3] > 0.95)) return c;
      }
      return [255, 255, 255];
    };
    const ratio = (el) => {
      const fg = parse(getComputedStyle(el).color);
      const bg = ground(el);
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
      return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
    };
    const card = document.querySelector(".att-card");
    if (!card) return null;
    return {
      name: ratio(card.querySelector(".att-card-name")),
      meta: ratio(card.querySelector(".att-card-meta")),
      more: ratio(card.querySelector(".att-card-more")),
    };
  });
  console.log(`[${where}] contrast`, JSON.stringify(rows));
}

(async () => {
  const { browser, page } = await boot({ viewport: { width: 1280, height: 900 } });
  console.log(`== ${process.env.THEME || "light"}`);
  const id = await page.evaluate(async () => {
    const all = await apiJson("/entries?limit=200");
    return (Array.isArray(all) ? all : all.items).find((e) => (e.content || "").startsWith("Gary The Moss Monster"))?.id;
  });
  await page.evaluate(() => { switchTab("notes"); window.showNotesSection && showNotesSection("browse"); notesViewMode = "cards"; loadEntries(); });
  await page.waitForTimeout(2000);
  await scan(page, "note cards", `#entry-list > li[data-id="${id}"] .att-card`);
  await contrast(page, "note");
  await page.click(`#entry-list > li[data-id="${id}"] .att-cards .att-card .att-card-more`);
  await page.waitForTimeout(300);
  await scan(page, "open menu", '[role="menu"]:not(.hidden)');
  await page.keyboard.press("Escape");
  await page.evaluate((id) => { editingId = id; renderEntries(); }, id);
  await page.waitForTimeout(1200);
  await scan(page, "edit form", "#entry-edit-attachment-chips");
  await page.evaluate(() => { editingId = null; renderEntries(); switchTab("notes"); window.showNotesSection && showNotesSection("capture"); });
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const box = document.getElementById("entry-content");
    box.value = "![Gary The Moss Monster drawing final v2.png](/media/x.png)";
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(500);
  await scan(page, "capture", "#entry-attachment-chips");
  await page.evaluate(() => { const box = document.getElementById("entry-content"); box.value = ""; box.dispatchEvent(new Event("input", { bubbles: true })); });
  await browser.close();
})();
