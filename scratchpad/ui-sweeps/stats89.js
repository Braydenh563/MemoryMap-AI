// Brief 89: the Statistics page, This week and the small tools, measured.
// Clicks from the dashboard heatmap to the page, the palette's rows for
// "statistics", "timer", "stopwatch", "word count" and "insert template",
// the page's sections, numbers, overlaps and past-the-edge at the width, and
// tick labels that collide in the charts.
// Usage: BASE=http://127.0.0.1:8832 VW=1440|390 node stats89.js
const { boot } = require("./lib.js");
const VW = Number(process.env.VW || 1440);
(async () => {
  const { browser, page } = await boot(VW < 600 ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : {});
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const out = { VW };
  await page.evaluate(() => switchTab("dashboard"));
  await page.waitForTimeout(2500);
  out.heatmapButton = await page.evaluate(() => { const b = document.getElementById("heatmap-statistics"); return b ? { shown: !!b.offsetParent, w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height) } : null; });
  if (out.heatmapButton) {
    await page.locator("#heatmap-statistics").scrollIntoViewIfNeeded();
    const t = Date.now();
    await page.click("#heatmap-statistics");
    await page.waitForSelector(".stats-card .stats-tiles", { timeout: 8000 }).catch(() => {});
    out.clicksFromHeatmap = 1;
    out.openMs = Date.now() - t;
  }
  await page.waitForTimeout(800);
  out.page = await page.evaluate(() => {
    const card = document.querySelector(".stats-card");
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const kids = [...card.querySelectorAll("button, .stats-tile, .stats-week-row, h3, .ask-chart-head, svg")].filter((e) => e.offsetParent);
    let overlaps = 0;
    for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
      if (kids[i].contains(kids[j]) || kids[j].contains(kids[i])) continue;
      if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++;
    }
    const past = kids.filter((e) => { const b = e.getBoundingClientRect(); return b.right > innerWidth + 1 || b.left < -1; }).length;
    // Tick labels drawn on top of each other, per chart.
    const tickHits = [...card.querySelectorAll("svg.ask-chart-svg")].map((svg) => {
      const t = [...svg.querySelectorAll("text.ask-chart-axis")].map((e) => e.getBoundingClientRect()).filter((b) => b.width);
      let n = 0;
      for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) if (t[i].left < t[j].right && t[j].left < t[i].right && t[i].top < t[j].bottom && t[j].top < t[i].bottom) n++;
      return n;
    });
    return {
      w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), right: Math.round(innerWidth - r.right),
      sections: [...card.querySelectorAll(".stats-section > h3")].map((h) => h.textContent),
      tiles: [...card.querySelectorAll(".stats-tile")].map((t) => t.textContent.replace(/\s+/g, " ").trim()),
      week: [...card.querySelectorAll(".stats-week-row")].map((t) => t.textContent.replace(/\s+/g, " ").trim()),
      span: card.querySelector(".stats-week-span")?.textContent,
      charts: [...card.querySelectorAll(".ask-chart-title")].map((t) => t.textContent),
      unused: card.querySelector(".stats-unused")?.textContent.slice(0, 120),
      overlaps, past, tickHits, scrolls: card.scrollHeight > card.clientHeight,
    };
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  out.closedOnEscape = await page.evaluate(() => !document.querySelector(".stats-overlay"));
  out.weekWidget = await page.evaluate(() => { const w = document.querySelector('[data-widget="week"]'); return w ? { shown: !!w.offsetParent, rows: [...w.querySelectorAll(".stats-week-row")].map((r) => r.textContent.replace(/\s+/g, " ").trim()) } : null; });
  out.palette = {};
  await page.evaluate(() => openPalette());
  await page.waitForTimeout(800);
  for (const q of (process.env.Q || "statistics|timer|timer 25 minutes|stopwatch|word count|insert template").split("|")) {
    await page.fill("#palette-input", q); await page.waitForTimeout(350);
    out.palette[q] = await page.evaluate(() => { const rows = [...document.querySelectorAll("#palette-list > li[role=option], #palette-list > li.rich-picker-row, #palette-list > li")].filter((li) => !li.classList.contains("palette-group-header") && !/Search everything/.test(li.textContent) && !li.classList.contains("palette-empty")); return [rows.length, rows.slice(0, 3).map((e) => e.textContent.replace(/\s+/g, " ").trim().slice(0, 50))]; });
  }
  await page.keyboard.press("Escape");
  out.errors = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
