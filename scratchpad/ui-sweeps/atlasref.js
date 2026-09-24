// Atlas laid out like the owner's reference sheet: a hero, a row of poses
// taken from the real corner companion, the twelve reference expressions
// as head marks, and the 24px icon. ATLAS_LOOK=masculine|feminine,
// THEME=light|dark. Writes $SCRATCH/shots/atlas-ref-<look>-<theme>.png.
//
//   BASE=http://127.0.0.1:8817 ATLAS_LOOK=feminine THEME=dark SCRATCH=/tmp/x \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlasref.js
const { boot } = require("./lib.js");
const fs = require("fs");

const EXPRESSIONS = ["calm", "happy", "delighted", "laughing", "thinking", "surprised", "confused", "sleepy", "sad", "proud", "shy", "determined"];
const POSES = [
  ["float", "float", []], ["wave", "stand", ["nmb-act-wave"]], ["sit", "sit", []], ["hang", "hang", []],
  ["peek", "stand", ["nmb-act-peek"]], ["asleep", "sit", ["nmb-sleep"]], ["music", "stand", ["nmb-music"]], ["bell", "stand", ["nmb-act-bell"]],
];

(async () => {
  const look = process.env.ATLAS_LOOK || "masculine";
  const theme = process.env.THEME || "light";
  const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  await page.evaluate((look) => {
    document.documentElement.dataset.avatarMotion = "off";
    localStorage.setItem("atlas-look", look);
    localStorage.setItem("avatar-buddy", "persona");
    clearTimeout(atlasMoodTimer);
    atlasApply = ((apply) => (svg, mood) => apply(svg, svg.dataset.keep || mood))(atlasApply);
    syncNameMarkBuddy();
    //: A plain ground behind the companion, so a pose is captured alone.
    const ground = document.createElement("div");
    for (const [k, v] of Object.entries({ position: "fixed", left: "600px", top: "340px", width: "200px", height: "220px", zIndex: "49", background: "var(--card)" })) ground.style[k] = v;
    document.body.appendChild(ground);
    clearTimeout(nmb.timer);
    nameMarkBuddySchedule = () => {};
    nameMarkBuddyTick = () => {};
  }, look);
  await page.waitForTimeout(500);
  // The poses, one capture each from the companion.
  const poses = [];
  for (const [label, pose, classes] of POSES) {
    await page.evaluate(([pose, classes]) => {
      const buddy = document.getElementById("nm-buddy");
      buddy.className = "";
      for (const c of classes) buddy.classList.add(c);
      buddy.dataset.pose = pose;
      buddy.style.left = "660px";
      buddy.style.top = "400px";
      buddy.style.translate = "";
    }, [pose, classes]);
    await page.waitForTimeout(300);
    const buf = await page.screenshot({ clip: { x: 630, y: 370, width: 124, height: 140 } });
    poses.push([label, buf.toString("base64")]);
  }
  // The hero, the expressions and the icon, drawn on a clean stage.
  const stage = await page.evaluate((expressions) => {
    const draw = (size, mood) => {
      const svg = atlasDraw(size, mood);
      svg.dataset.keep = mood;
      return svg.outerHTML;
    };
    return {
      hero: draw(300, "happy"),
      faces: expressions.map((mood) => [mood, draw(72, mood)]),
      icon: draw(24, "calm"),
      iconBig: draw(64, "calm"),
      css: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
      attrs: [...document.documentElement.attributes].map((a) => [a.name, a.value]),
    };
  }, EXPRESSIONS);
  const sheet = await browser.newPage({ viewport: { width: 1320, height: 760 }, deviceScaleFactor: 1.5 });
  const bg = theme === "dark" ? "#141427" : "#f4f3f8";
  const card = theme === "dark" ? "#1d1d38" : "#ffffff";
  const ink = theme === "dark" ? "#e8e6f5" : "#26243a";
  await sheet.setContent(`<!doctype html><html ${stage.attrs.map(([k, v]) => `${k}="${v}"`).join(" ")} data-mode="${theme}" data-theme="${theme}" data-avatar-motion="off"><head>${stage.css.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}
  <style>body{margin:0!important;padding:18px!important;display:block!important;background:${bg};color:${ink};font:13px system-ui,sans-serif}
  .ar-grid{display:grid;grid-template-columns:340px 1fr;gap:16px}
  .ar-hero,.ar-panel{background:${card};border-radius:14px;padding:12px}
  .ar-hero{display:grid;place-items:center}
  .ar-row{display:flex;flex-wrap:wrap;gap:6px}
  figure{margin:0;text-align:center}
  .ar-faces figure{background:${bg};border-radius:10px;padding:6px 4px 2px}
  h3{margin:0 0 8px;font-size:14px}</style></head><body>
  <div class="ar-grid">
    <div class="ar-hero">${stage.hero}<div>Atlas, ${process.env.ATLAS_LOOK || "masculine"}</div></div>
    <div>
      <div class="ar-panel"><h3>Poses</h3><div class="ar-row">${poses.map(([l, b]) => `<figure><img src="data:image/png;base64,${b}" width="112"><figcaption>${l}</figcaption></figure>`).join("")}</div></div>
      <div class="ar-panel" style="margin-top:12px"><h3>Expressions</h3><div class="ar-row ar-faces">${stage.faces.map(([m, s]) => `<figure>${s}<figcaption>${m}</figcaption></figure>`).join("")}</div></div>
      <div class="ar-panel" style="margin-top:12px"><h3>Icon</h3><div class="ar-row" style="align-items:end;gap:16px">${stage.iconBig}${stage.icon}<span>64px and 24px</span></div></div>
    </div>
  </div></body></html>`);
  await sheet.waitForTimeout(800);
  const out = `${OUT}/atlas-ref-${look}-${theme}.png`;
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(out);
  await browser.close();
})();
