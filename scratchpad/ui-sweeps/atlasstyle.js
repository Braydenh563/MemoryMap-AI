// Settings, Appearance, Atlas style: switching Character and Classic globe
// redraws every Atlas on the page (marks, companion, dashboard mark), the
// classic companion floats with head props, and moods still reach both.
// Writes $SCRATCH/shots/atlas-style.png.
//
//   BASE=http://127.0.0.1:8817 SCRATCH=/tmp/x PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlasstyle.js
const { boot } = require("./lib.js");

(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const facts = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    localStorage.setItem("avatar-buddy", "persona");
    localStorage.setItem("dash-mark", "persona");
    syncNameMarkBuddy();
    paintDashEmblem();
    const stage = document.createElement("div");
    stage.id = "atl-style";
    for (const [k, v] of Object.entries({ position: "fixed", left: "16px", top: "90px", zIndex: "9999", display: "flex", gap: "8px", alignItems: "end", padding: "8px", background: "var(--card)" })) stage.style[k] = v;
    document.body.appendChild(stage);
    stage.append(nameMarkLive("Atlas", 120), nameMarkLive("Atlas", 46), nameMark("Atlas", 20));
    const read = () => ({
      marks: [...document.querySelectorAll("#atl-style svg.nm-atlas")].map((s) => s.classList.contains("atl-classic") ? "classic" : "character"),
      buddy: document.querySelector("#nm-buddy .atl-classic-box") ? "classic" : document.querySelector("#nm-buddy .atl-figure") ? "character" : "none",
      dash: document.querySelector("#dash-hero-emblem .nm-atlas") ? (document.querySelector("#dash-hero-emblem .atl-classic") ? "classic" : "character") : "none",
    });
    const before = read();
    const select = document.getElementById("atlas-style");
    select.value = "classic";
    select.dispatchEvent(new Event("change"));
    await wait(300);
    const after = read();
    setAtlasMood("happy");
    const mood = [...document.querySelectorAll("#atl-style svg.nm-atlas")].map((s) => s.dataset.atlasMood);
    const buddy = document.getElementById("nm-buddy");
    buddy.style.left = "400px";
    buddy.style.top = "100px";
    buddy.classList.add("nmb-music");
    return { before, after, mood, row: Boolean(document.getElementById("atlas-style-row")) };
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/atlas-style.png`, clip: { x: 0, y: 60, width: 520, height: 200 } });
  await page.evaluate(() => {
    const select = document.getElementById("atlas-style");
    select.value = "character";
    select.dispatchEvent(new Event("change"));
    localStorage.removeItem("atlas-style");
  });
  console.log(JSON.stringify(facts));
  await browser.close();
})();
