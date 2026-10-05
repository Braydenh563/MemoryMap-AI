// The quick sketch against INBOX 620 (the owner: "can you also improve and
// modernise the quick sketch a little more as well?? it is already mostly
// fine, maybe a bit more of a gap below the top row title and close button").
// Prints the numbers and one line per finding; exit 1 on any. SHOT=1 writes
// the card.
//
//   head     the gap from the head row (title, close) to the toolbar at least
//            16px (12 at 390)
//   toolbar  quiet: no edge and no card fill of its own on the card (a tint
//            at most), no drawn rule between its groups, the labels muted
//   one row  at 1440, the toolbar on one row
//
//   BASE=http://127.0.0.1:8794 VIEWPORT=390x844 THEME=dark node sketch620.js
const { boot } = require("./lib.js");
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
const touch = vw < 600;
(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: vw, height: vh }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
  await page.evaluate(() => switchTab("notes"));
  await page.waitForTimeout(1000);
  await page.evaluate(() => openSketch());
  await page.waitForTimeout(1200);
  const m = await page.evaluate(() => {
    const r = (e) => e.getBoundingClientRect();
    const cs = (e) => getComputedStyle(e);
    const clear = (c) => /rgba\(\d+, \d+, \d+, 0\)|transparent/.test(c);
    const card = document.getElementById("sketch-card");
    const head = card.querySelector(".dialog-head");
    const bar = document.getElementById("sketch-toolbar");
    const sections = [...bar.querySelectorAll(".wb-tool-section")].filter((s) => s.checkVisibility());
    const rules = sections.filter((s) => ["Left", "Right"].some((k) => parseFloat(cs(s)[`border${k}Width`]) > 0 && !clear(cs(s)[`border${k}Color`]))).length;
    const label = bar.querySelector(".wb-tool-section-label");
    const barEdge = ["Top", "Bottom", "Left", "Right"].some((k) => parseFloat(cs(bar)[`border${k}Width`]) > 0 && !clear(cs(bar)[`border${k}Color`]));
    return {
      gap: Math.round(r(bar).top - r(head).bottom),
      headH: Math.round(r(head).height),
      bar: { edge: barEdge, bg: cs(bar).backgroundColor, cardBg: cs(card).backgroundColor, h: Math.round(r(bar).height),
        rows: new Set(sections.map((s) => Math.round(r(s).top / 8))).size },
      rules,
      label: label ? { size: parseFloat(cs(label).fontSize), color: cs(label).color, transform: cs(label).textTransform, weight: cs(label).fontWeight } : null,
      muted: cs(document.body).getPropertyValue("--muted").trim(),
      sw: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  const f = [];
  if (m.gap < (touch ? 12 : 16)) f.push(`head to toolbar ${m.gap}px`);
  if (m.bar.edge) f.push("toolbar has an edge");
  if (m.rules) f.push(`${m.rules} drawn rules between groups`);
  if (!touch && m.bar.rows > 1) f.push(`toolbar on ${m.bar.rows} rows`);
  if (m.sw > 0) f.push(`page scrolls sideways ${m.sw}`);
  if (errs.length) f.push(`page errors ${errs}`);
  console.log(JSON.stringify({ viewport: `${vw}x${vh}`, theme: process.env.THEME || "light", ...m }));
  console.log(`sketch620 ${vw} ${process.env.THEME || "light"}: ${f.length} findings${f.length ? "\n  " + f.join("\n  ") : ""}`);
  if (process.env.SHOT) await page.locator("#sketch-card").screenshot({ path: `${OUT}/sketch620-${vw}-${process.env.THEME || "light"}.png` });
  await browser.close();
  process.exit(f.length ? 1 : 0);
})();
