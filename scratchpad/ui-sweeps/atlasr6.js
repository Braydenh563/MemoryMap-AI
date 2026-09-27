// Atlas round 6's proof sheet: per look, the large view's full drawing (the
// size the owner reviews it at), the bust avatar at 64, 120 and 200, and the
// corner companion in every pose it takes (stand, sit, hang, float, lean,
// walk, cheer, wave, sleep), each from the real `#nm-buddy` with animation
// off. Writes $SCRATCH/shots/atlas-r6-<look>-<theme>-<TAG>.png.
//
//   BASE=... SCRATCH=/tmp/x THEME=dark TAG=before LOOKS=masculine,feminine node atlasr6.js
const { boot } = require("./lib.js");

const POSES = [
  ["stand", "stand", []], ["sit", "sit", []], ["hang", "hang", []], ["float", "float", []], ["lean", "lean", []],
  ["walk", "stand", ["nmb-walking"]], ["cheer", "stand", ["nmb-act-cheer"]], ["wave", "stand", ["nmb-act-wave"]], ["sleep", "sit", ["nmb-sleep"]],
];

(async () => {
  const theme = process.env.THEME || "dark";
  const tag = process.env.TAG || "now";
  for (const look of (process.env.LOOKS || "masculine,feminine").split(",")) {
    const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
    await page.evaluate((look) => {
      document.documentElement.dataset.avatarMotion = "off";
      localStorage.setItem("atlas-look", look);
      localStorage.setItem("avatar-buddy", "atlas");
      const b = document.getElementById("avatar-buddy");
      if (b) { b.value = "atlas"; b.dispatchEvent(new Event("change", { bubbles: true })); }
      clearTimeout(atlasMoodTimer);
      syncNameMarkBuddy();
      clearTimeout(nmb.timer);
      nameMarkBuddySchedule = () => {};
      nameMarkBuddyTick = () => {};
      const ground = document.createElement("div");
      ground.id = "r6-ground";
      for (const [k, v] of Object.entries({ position: "fixed", left: "0px", top: "0px", width: "1400px", height: "900px", zIndex: "48", background: "var(--bg)" })) ground.style[k] = v;
      document.body.appendChild(ground);
    }, look);
    await page.waitForTimeout(800);
    const cells = [];
    // The large drawing and the busts, drawn onto the ground.
    for (const [label, size, level] of [["full 360", 360, "full"], ["bust 200", 200, "bust"], ["bust 120", 120, "bust"], ["bust 64", 64, "bust"]]) {
      await page.evaluate(([size, level]) => {
        const g = document.getElementById("r6-ground");
        g.replaceChildren();
        const svg = atlasDraw(size, "calm", level);
        svg.style.position = "absolute"; svg.style.left = "40px"; svg.style.top = "40px";
        g.appendChild(svg);
      }, [size, level]);
      await page.waitForTimeout(250);
      const box = await page.evaluate(() => { const r = document.querySelector("#r6-ground svg").getBoundingClientRect(); return { x: r.left, y: r.top, width: Math.max(80, r.width), height: Math.max(80, r.height) }; });
      cells.push([label, (await page.screenshot({ clip: box })).toString("base64"), size >= 200 ? 2 : 1]);
    }
    await page.evaluate(() => document.getElementById("r6-ground").replaceChildren());
    for (const [label, pose, classes] of POSES) {
      await page.evaluate(([pose, classes]) => {
        const buddy = document.getElementById("nm-buddy");
        buddy.className = "";
        for (const c of classes) buddy.classList.add(c);
        buddy.dataset.pose = pose;
        buddy.style.left = "0px"; buddy.style.top = "0px";
        buddy.style.transform = "translate(200px, 120px)";
        buddy.style.translate = "";
        buddy.style.zoom = "2.5";
        buddy.style.zIndex = "60";
        for (const grip of buddy.querySelectorAll(".nmb-size-grip")) grip.style.display = "none";
      }, [pose, classes]);
      await page.waitForTimeout(300);
      cells.push([label, (await page.screenshot({ clip: { x: 430, y: 250, width: 300, height: 330 } }).catch(async () => page.screenshot({ clip: { x: 560, y: 700, width: 300, height: 200 } }))).toString("base64"), 1]);
    }
    const sheet = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
    const bg = theme === "dark" ? "#141427" : "#f4f3f8";
    const card = theme === "dark" ? "#1d1d38" : "#ffffff";
    const ink = theme === "dark" ? "#e8e6f5" : "#26243a";
    await sheet.setContent(`<!doctype html><html><head><style>body{margin:0;padding:12px;background:${bg};color:${ink};font:13px system-ui,sans-serif}
    .g{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;align-items:start}
    figure{margin:0;background:${card};border-radius:10px;padding:6px}
    figure.w2{grid-column:span 2;grid-row:span 2}
    figure img{width:100%;height:auto;display:block}
    figcaption{text-align:center;font-weight:600;margin-top:4px}</style></head><body>
    <h3>Atlas ${look}, ${theme}, ${tag}</h3>
    <div class="g">${cells.map(([l, b, w]) => `<figure class="${w > 1 ? "w2" : ""}"><img src="data:image/png;base64,${b}"><figcaption>${l}</figcaption></figure>`).join("")}</div>
    </body></html>`);
    await sheet.waitForTimeout(500);
    const out = `${OUT}/atlas-r6-${look}-${theme}-${tag}.png`;
    await sheet.screenshot({ path: out, fullPage: true });
    console.log(out);
    await browser.close();
  }
})();
