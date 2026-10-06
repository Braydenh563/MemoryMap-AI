// What sits above a document's first line on a phone (UI_MODERNISATION_PLAN
// Phase 11, item 12's gate: chrome at most 25% of the height, content in the
// top 40%). Opens a document in each view and lists every visible band
// between the top of the window and the first line, top to bottom, with its
// box, so the number that moves is named rather than inferred.
//   BASE=http://127.0.0.1:8808 W=390 H=844 THEME=dark node scratchpad/ui-sweeps/docphonetop.js
const { boot } = require("./lib.js");
const W = Number(process.env.W || 390);
const H = Number(process.env.H || 844);

(async () => {
  const { page, browser } = await boot({ viewport: { width: W, height: H }, hasTouch: true, isMobile: true });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluate(async () => {
    const d = await apiJson("/documents", { method: "POST", body: JSON.stringify({ title: "Phone top", content: "The first line.\n\nThe second paragraph, long enough to wrap at a phone's width." }) });
    switchTab("documents");
    await new Promise((r) => setTimeout(r, 800));
    await openDocument(d.id);
    await new Promise((r) => setTimeout(r, 2000));
  });
  let fails = 0;
  for (const view of (process.env.VIEWS || "rendered,live").split(",")) {
    await page.evaluate((v) => { if (typeof setDocView === "function") setDocView(v); }, view);
    await page.waitForTimeout(1200);
    const out = await page.evaluate(() => {
      const first = [...document.querySelectorAll("#tab-documents .cm-line, #tab-documents .doc-rendered p, #tab-documents .markdown-body p, #tab-documents [class*='preview'] p")]
        .find((el) => el.getClientRects().length && /first line/.test(el.textContent));
      const y = first ? Math.round(first.getBoundingClientRect().top) : null;
      // Every element above the line that draws a band of its own: visible,
      // at least 16px tall, full-ish width, not an ancestor of the line.
      const bands = [];
      for (const el of document.querySelectorAll("body *")) {
        if (!el.getClientRects().length || (first && el.contains(first))) continue;
        const r = el.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= (y ?? 0) || r.height < 16 || r.width < innerWidth * 0.5) continue;
        if (r.right <= 1 || r.left >= innerWidth - 1 || el.closest(".hidden, [hidden], #bg-art-canvas")) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.opacity === "0") continue;
        const parentBand = bands.find((b) => b.el.contains(el) && Math.abs(b.top - r.top) < 2 && Math.abs(b.bottom - r.bottom) < 2);
        if (parentBand) continue;
        bands.push({ el, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height),
          name: (el.id ? "#" + el.id : "") + "." + String(el.className).split(" ").filter(Boolean).slice(0, 3).join("."),
          pad: `${cs.paddingTop}/${cs.paddingBottom} m ${cs.marginTop}/${cs.marginBottom}` });
      }
      // The line's own ancestors: where each one starts and what it pads.
      const chain = [];
      for (let n = first; n && n !== document.body; n = n.parentElement) {
        const r = n.getBoundingClientRect();
        const cs = getComputedStyle(n);
        chain.push(`${Math.round(r.top)} ${n.tagName.toLowerCase()}${n.id ? "#" + n.id : ""}.${String(n.className).split(" ").filter(Boolean).slice(0, 2).join(".")} pt ${cs.paddingTop} mt ${cs.marginTop} bt ${cs.borderTopWidth}`);
      }
      return { y, chain, bands: bands.filter((b) => !bands.some((o) => o !== b && o.el.contains(b.el) && o.top <= b.top && o.bottom >= b.bottom && o.h < 140))
        .map(({ el, ...b }) => b).sort((a, b) => a.top - b.top) };
    });
    const ok = out.y !== null && out.y <= Math.round(H * 0.25);
    if (!ok) fails++;
    console.log(`${ok ? "ok  " : "FAIL"} ${view}: first line at y=${out.y} (chrome budget ${Math.round(H * 0.25)})`);
    if (process.env.CHAIN) for (const c of out.chain) console.log(`       ^ ${c}`);
    for (const b of out.bands) console.log(`     ${String(b.top).padStart(4)}..${String(b.bottom).padEnd(4)} h${String(b.h).padEnd(4)} ${b.name}  (${b.pad})`);
  }
  if (errors.length) console.log("PAGE ERRORS:", errors.slice(0, 3).join(" | "));
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
