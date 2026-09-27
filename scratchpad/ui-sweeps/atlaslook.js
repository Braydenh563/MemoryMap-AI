// Settings, Appearance, Atlas look and Face looks in the running app: the
// Atlas look switches every Atlas (marks, companion, dashboard mark); Face
// looks leans the generated faces for names that say nothing either way;
// both survive a reset. Writes $SCRATCH/shots/atlas-looks.png (a row of
// generated faces before and after the lean).
//
//   BASE=http://127.0.0.1:8817 SCRATCH=/tmp/x PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlaslook.js
const { boot } = require("./lib.js");

(async () => {
  const { page, browser, OUT } = await boot({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });
  const facts = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    localStorage.setItem("avatar-buddy", "persona");
    syncNameMarkBuddy();
    const stage = document.createElement("div");
    stage.id = "look-stage";
    for (const [k, v] of Object.entries({ position: "fixed", left: "16px", top: "70px", zIndex: "9999", display: "flex", gap: "8px", alignItems: "end", padding: "8px", background: "var(--card)" })) stage.style[k] = v;
    document.body.appendChild(stage);
    stage.append(nameMarkLive("Atlas", 120), nameMark("Atlas", 46));
    const names = ["Robin", "Sam", "Alex", "Jordan", "Casey", "Riley"];
    for (const n of names) stage.appendChild(nameMark(n, 48));
    const read = () => ({
      atlas: [...document.querySelectorAll("#look-stage .nm-atlas")].map((s) => s.dataset.atlasLook),
      buddy: document.querySelector("#nm-buddy .nm-atlas")?.dataset.atlasLook || null,
      looks: names.map((n) => nameMood(n).look),
    });
    const before = read();
    const set = (id, value) => {
      const el = document.getElementById(id);
      el.value = value;
      el.dispatchEvent(new Event("change"));
    };
    set("atlas-look", "feminine");
    set("face-look", "feminine");
    await wait(400);
    const after = read();
    return { before, after, rows: ["atlas-look-row", "face-look-row"].every((id) => document.getElementById(id)) };
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/atlas-looks.png`, clip: { x: 0, y: 60, width: 720, height: 170 } });
  await page.evaluate(() => {
    for (const key of ["atlas-look", "face-look"]) localStorage.removeItem(key);
  });
  console.log(JSON.stringify(facts));
  await browser.close();
})();
