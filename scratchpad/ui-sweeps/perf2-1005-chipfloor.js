// perf2-1005 (audit FE-14, the chips): every interactive chip on a note card,
// in the Library and in the note's edit form, measured for its painted box
// and for its hit target (elementFromPoint 1px inside the 28px floor above
// and below the chip's centre). Desktop, 1440.
//   BASE=http://127.0.0.1:8859 [THEME=dark] node perf2-1005-chipfloor.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: Number(process.env.W || 1440), height: 900 } });
  if (!process.env.NO_SEED) await page.evaluate(async () => {
    for (const content of ["Garden plan for spring #home", "Budget review with the bank"]) {
      await api("/entries", { method: "POST", body: JSON.stringify({ content, category: "Home" }) });
    }
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  await page.fill("#lock-password", "testpassword123").catch(() => {});
  await page.click("#lock-submit").catch(() => {});
  await page.waitForTimeout(2500);
  await page.click('[data-tab="notes"]').catch(() => {});
  await page.waitForTimeout(2000);
  const out = await page.evaluate(() => {
    const floor = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--target-min")) * 16 || 28;
    const shown = (el) => el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && el.getBoundingClientRect().height > 0;
    const rows = [];
    const sel = "button.chip, a.chip, .chip[role='button'], .chip[tabindex], button.tag-chip, .entry-meta button, .entry-tags button";
    for (const el of document.querySelectorAll(sel)) {
      if (!shown(el)) continue;
      const r = el.getBoundingClientRect();
      //: elementFromPoint answers only inside the viewport.
      if (r.top < 90 || r.bottom > innerHeight - 90) continue; // inside the viewport and clear of a scroll box edge or a dock
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const reach = (dy) => {
        const hit = document.elementFromPoint(cx, cy + dy);
        return !!hit && (hit === el || el.contains(hit));
      };
      const half = floor / 2 - 1;
      rows.push({
        what: (el.id || el.className || el.tagName).toString().slice(0, 60),
        text: el.textContent.trim().slice(0, 20),
        painted: Math.round(r.height * 10) / 10,
        target: reach(-half) && reach(half),
        hits: [-half, half].map((dy) => {
          const hit = document.elementFromPoint(cx, cy + dy);
          return hit ? `${hit.tagName}.${String(hit.className).slice(0, 30)}` : null;
        }).join(" / "),
        y: Math.round(r.top),
      });
    }
    return { floor, chips: rows.length, under: rows.filter((row) => row.painted < floor - 0.5 && !row.target), sample: rows.slice(0, 6) };
  });
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
