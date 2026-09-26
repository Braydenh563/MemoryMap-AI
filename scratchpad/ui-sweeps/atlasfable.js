// Atlas's preview sheet laid out like the owner's reference art: a hero at
// 300px, a row of the companion's poses (stand, float, wave, sit on a
// ledge, hang one-handed, peek from behind a wall, asleep curled,
// headphones, bell), the twelve reference expressions at 104px, and the
// icon at 64 and 24px. ATLAS_LOOK=masculine|feminine, THEME=light|dark,
// ACCENT=#hex. Writes $SCRATCH/shots/atlas-fable-<look>-<theme>[-<accent>].png.
//
//   BASE=http://127.0.0.1:8820 ATLAS_LOOK=feminine THEME=dark SCRATCH=/tmp/x \
//     PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlasfable.js
const { boot } = require("./lib.js");

const EXPRESSIONS = ["calm", "happy", "delighted", "laughing", "thinking", "surprised", "confused", "sleepy", "sad", "proud", "shy", "determined"];
const POSES = [
  ["stand", "stand", []], ["float", "float", []], ["wave", "stand", ["nmb-act-wave"]], ["sit", "sit", []],
  ["hang", "hang", ["nmb-act-onehand"]], ["peek", "stand", ["nmb-act-peek"]], ["asleep", "sit", ["nmb-sleep"]],
  ["music", "stand", ["nmb-music"]], ["bell", "stand", ["nmb-act-bell"]], ["lantern", "float", ["nmb-act-lantern"]],
  ["cheer", "stand", ["nmb-act-cheer"]], ["night", "sit", ["nmb-night"]], ["reading", "stand", ["nmb-reading", "nmb-think"]],
  ["offline", "stand", ["nmb-offline"]],
];

(async () => {
  const look = process.env.ATLAS_LOOK || "masculine";
  const theme = process.env.THEME || "light";
  const accent = process.env.ACCENT || "";
  const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  await page.evaluate(([look, accent]) => {
    document.documentElement.dataset.avatarMotion = "off";
    localStorage.setItem("atlas-look", look);
    localStorage.setItem("avatar-buddy", "persona");
    if (accent) document.documentElement.style.setProperty("--accent", accent);
    clearTimeout(atlasMoodTimer);
    atlasApply = ((apply) => (svg, mood) => apply(svg, svg.dataset.keep || mood))(atlasApply);
    syncNameMarkBuddy();
    //: A plain ground behind the companion, so a pose is captured alone.
    const ground = document.createElement("div");
    for (const [k, v] of Object.entries({ position: "fixed", left: "560px", top: "300px", width: "260px", height: "260px", zIndex: "49", background: "var(--card)" })) ground.style[k] = v;
    document.body.appendChild(ground);
    clearTimeout(nmb.timer);
    nameMarkBuddySchedule = () => {};
    nameMarkBuddyTick = () => {};
  }, [look, accent]);
  await page.waitForTimeout(500);
  const poses = [];
  for (const [label, pose, classes] of POSES) {
    await page.evaluate(([pose, classes]) => {
      const buddy = document.getElementById("nm-buddy");
      buddy.className = "";
      for (const c of classes) buddy.classList.add(c);
      buddy.dataset.pose = pose;
      //: The companion is placed by one transform on its host (avatars.js).
      buddy.style.left = "0px";
      buddy.style.top = "0px";
      buddy.style.transform = "translate(660px, 400px)";
      buddy.style.translate = "";
    }, [pose, classes]);
    await page.waitForTimeout(300);
    const buf = await page.screenshot({ clip: { x: 626, y: 366, width: 132, height: 148 } });
    poses.push([label, buf.toString("base64")]);
  }
  const stage = await page.evaluate((expressions) => {
    const draw = (size, mood, level) => {
      const svg = atlasDraw(size, mood, level);
      svg.dataset.keep = mood;
      return svg.outerHTML;
    };
    return {
      hero: draw(300, "happy"),
      faces: expressions.map((mood) => [mood, draw(104, mood, "head")]),
      icon: draw(24, "calm"),
      iconBig: draw(64, "calm"),
      inline: draw(20, "calm"),
      defs: [...document.querySelectorAll("svg.atl-defs")].map((d) => d.outerHTML).join(""),
      css: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href),
      attrs: [...document.documentElement.attributes].map((a) => [a.name, a.value]),
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent"),
    };
  }, EXPRESSIONS);
  const sheet = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1.5 });
  const bg = theme === "dark" ? "#141427" : "#f4f3f8";
  const card = theme === "dark" ? "#1d1d38" : "#ffffff";
  const ink = theme === "dark" ? "#e8e6f5" : "#26243a";
  await sheet.setContent(`<!doctype html><html ${stage.attrs.map(([k, v]) => `${k}="${v}"`).join(" ")} data-mode="${theme}" data-theme="${theme}" data-avatar-motion="off"><head>${stage.css.map((h) => `<link rel="stylesheet" href="${h}">`).join("")}
  <style>:root{--accent:${stage.accent.trim()}}body{margin:0!important;padding:18px!important;display:block!important;background:${bg};color:${ink};font:13px system-ui,sans-serif}
  .ar-grid{display:grid;grid-template-columns:360px 1fr;gap:16px}
  .ar-hero,.ar-panel{background:${card};border-radius:14px;padding:12px}
  .ar-hero{display:grid;place-items:center;align-content:center}
  .ar-row{display:flex;flex-wrap:wrap;gap:6px}
  figure{margin:0;text-align:center}
  .ar-faces figure{background:${bg};border-radius:10px;padding:6px 4px 2px}
  h3{margin:0 0 8px;font-size:14px}</style></head><body>
  ${stage.defs}<div class="ar-grid">
    <div class="ar-hero">${stage.hero}<div>Atlas, ${look}${accent ? ", " + accent : ""}</div></div>
    <div>
      <div class="ar-panel"><h3>Poses</h3><div class="ar-row">${poses.map(([l, b]) => `<figure><img src="data:image/png;base64,${b}" width="132"><figcaption>${l}</figcaption></figure>`).join("")}</div></div>
      <div class="ar-panel" style="margin-top:12px"><h3>Expressions</h3><div class="ar-row ar-faces">${stage.faces.map(([m, s]) => `<figure>${s}<figcaption>${m}</figcaption></figure>`).join("")}</div></div>
      <div class="ar-panel" style="margin-top:12px"><h3>Icon</h3><div class="ar-row" style="align-items:end;gap:16px">${stage.iconBig}${stage.icon}${stage.inline}<span>64, 24 and 20px</span></div></div>
    </div>
  </div></body></html>`);
  await sheet.waitForTimeout(800);
  const out = `${OUT}/atlas-fable-${look}-${theme}${accent ? "-" + accent.slice(1) : ""}${process.env.TAG ? "-" + process.env.TAG : ""}.png`;
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(out);
  await browser.close();
})();
