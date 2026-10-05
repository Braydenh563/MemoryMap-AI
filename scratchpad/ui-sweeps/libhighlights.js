// The Library's Highlights chip (BACKLOG 109.4): every ==passage== in a note,
// with its note. Measures at 1440 and 390: the chip shows with the right count,
// "Everything" does not list passages, the cards read as passages (title is the
// passage, foot says which note), no card carries a tick, nothing sideways, and
// pressing a card opens its note (flashEntry sets the note list to it).
//
//   BASE=http://127.0.0.1:8791 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/libhighlights.js
const { boot } = require("./lib.js");

async function run(viewport, phone) {
  const { browser, page } = await boot({ viewport, hasTouch: phone, isMobile: phone });
  const stamp = Date.now();
  await page.evaluate(async (s) => {
    const post = (c) => api("/entries", { method: "POST", body: JSON.stringify({ content: c }) });
    await post(`# Harbour ${s}\nthe ==pier was lovely== and ==red|tide at six==`);
    await post(`plain note ${s}, if a == b`);
  }, stamp);
  await page.click('[data-tab="library"]');
  await page.waitForFunction(
    () => [...document.querySelectorAll("#library-filters .library-chip")].some((c) => /^Highlights/.test(c.textContent.trim())),
    null, { timeout: 10000, polling: 200 });
  const chip = await page.evaluate(() => {
    const el = [...document.querySelectorAll("#library-filters .library-chip")].find((c) => /^Highlights/.test(c.textContent.trim()));
    return el ? { text: el.textContent.trim(), count: Number(el.querySelector(".library-chip-count").textContent) } : null;
  });
  const everything = await page.evaluate(() =>
    [...document.querySelectorAll("#library-grid .library-card")].some((c) => /^Highlight/.test(c.title)));
  await page.evaluate(() => {
    [...document.querySelectorAll("#library-filters .library-chip")].find((c) => /^Highlights/.test(c.textContent.trim())).click();
  });
  await page.waitForTimeout(900);
  const view = await page.evaluate((s) => {
    const cards = [...document.querySelectorAll("#library-grid .library-card")];
    return {
      n: cards.length,
      titles: cards.map((c) => (c.querySelector(".library-card-title")?.textContent || "").trim()),
      foot: cards.map((c) => (c.querySelector(".library-card-meta")?.textContent || "").trim()),
      ticks: document.querySelectorAll("#library-grid .library-card-tick").length,
      sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      menu: document.querySelectorAll("#library-grid .library-card-menu").length,
      stamp: s,
    };
  }, stamp);
  await page.click("#library-grid .library-card .library-card-title, #library-grid .library-card");
  await page.waitForTimeout(1200);
  const opened = await page.evaluate(() => {
    const on = document.querySelector('[data-tab="notes"]');
    return { notesTab: !!on && (on.classList.contains("active") || on.getAttribute("aria-selected") === "true") };
  });
  const checks = {
    chipShown: !!chip && chip.count >= 2,
    notInEverything: !everything,
    passagesAsTitles: view.titles.includes("pier was lovely") && view.titles.includes("tide at six"),
    footNamesTheNote: view.foot.some((f) => f.includes(`Harbour ${stamp}`)),
    noTicks: view.ticks === 0,
    noMenus: view.menu === 0,
    noSideways: !view.sideways,
    opensTheNote: opened.notesTab,
  };
  console.log(phone ? "390" : "1440", JSON.stringify({ chip, n: view.n, checks }));
  await browser.close();
  return Object.values(checks).every(Boolean);
}

(async () => {
  const a = await run({ width: 1440, height: 900 }, false);
  const b = await run({ width: 390, height: 844 }, true);
  console.log(a && b ? "PASS" : "FAIL");
  process.exit(a && b ? 0 : 1);
})();
