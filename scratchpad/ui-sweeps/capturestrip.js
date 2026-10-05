// The Capture box's shared parts after INBOX 616: the title as large
// borderless text, the strip one icon-only row that never folds, no drawn
// separators, no words. Exit 1 on a finding. SHOT=1 writes the composer.
//   BASE=http://127.0.0.1:8877 VIEWPORT=390x844 THEME=dark node capturestrip.js
const { boot } = require("./lib.js");
const [vw, vh] = (process.env.VIEWPORT || "1440x900").split("x").map(Number);
(async () => {
  const touch = vw < 600;
  const { page, browser, OUT } = await boot({ viewport: { width: vw, height: vh }, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  await page.evaluate(() => { switchTab("notes"); window.showNotesSection && showNotesSection("capture"); });
  await page.waitForTimeout(1500);
  // The strip's own group (More) mounts with the library bundle; without it
  // Capture's strip wraps rather than clip (LIB=0 measures that state).
  if (process.env.LIB !== "0") await page.evaluate(() => ensureModule("library")).catch(() => {});
  await page.waitForTimeout(800);
  const m = await page.evaluate(() => {
    const vis = (e) => e && e.checkVisibility() && e.getBoundingClientRect().width > 1;
    const bar = document.getElementById("note-toolbar");
    const title = document.getElementById("entry-title");
    const shown = [...bar.children].filter(vis);
    return {
      titleSize: parseFloat(getComputedStyle(title).fontSize),
      collapsed: bar.classList.contains("is-collapsed"),
      rows: new Set(shown.filter((c) => !c.matches(".doc-toolbar-sep")).map((c) => Math.round((c.getBoundingClientRect().top + c.getBoundingClientRect().bottom) / 24))).size,
      seps: [...bar.querySelectorAll(".doc-toolbar-sep")].filter((s) => vis(s) && getComputedStyle(s).backgroundColor !== "rgba(0, 0, 0, 0)").length,
      words: [...bar.querySelectorAll(".toolbar-word, .doc-toolbar-collapsed-name")].filter((w) => vis(w) && w.getBoundingClientRect().width > 2).map((w) => w.textContent.trim()),
      letters: [...bar.querySelectorAll("button > strong, button > em, button > s")].filter(vis).length,
      tools: shown.length,
      h: Math.round(bar.getBoundingClientRect().height),
      sw: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
  const f = [];
  if (m.titleSize < 18) f.push(`title ${m.titleSize}px`);
  if (m.collapsed) f.push("strip folded");
  if (m.rows > 1) f.push(`strip on ${m.rows} rows`);
  if (m.seps) f.push(`${m.seps} drawn separators`);
  if (m.words.length) f.push(`words ${m.words}`);
  if (m.letters) f.push(`${m.letters} typed letters`);
  if (m.sw > 0) f.push(`sideways ${m.sw}`);
  console.log(`capturestrip ${vw} ${process.env.THEME || "light"}: ${JSON.stringify(m)}\n  ${f.length} findings${f.length ? ": " + f.join("; ") : ""}`);
  if (process.env.SHOT) await page.locator(".note-composer").first().screenshot({ path: `${OUT}/capturestrip-${vw}-${process.env.THEME || "light"}.png` });
  await browser.close();
  process.exit(f.length ? 1 : 0);
})();
