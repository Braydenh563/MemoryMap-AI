// Atlas as the corner companion, in every pose and state the companion can
// set (avatars.js), captured one by one from the real `#nm-buddy` with
// animation off (the still frame each state holds) and stitched by the
// browser into one sheet: $SCRATCH/shots/atlas-poses-<theme>.png.
//
//   BASE=http://127.0.0.1:8817 SCRATCH=/tmp/x PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlasposes.js
// MOTION=always keeps the loops on (for a mid-animation frame).
const { boot } = require("./lib.js");

const STATES = [
  ["stand", "stand", []], ["sit", "sit", []], ["hang", "hang", []], ["float", "float", []], ["lean", "lean", []],
  ["sleep", "sit", ["nmb-sleep"]], ["drowsy", "stand", ["nmb-drowsy"]], ["music", "stand", ["nmb-music"]],
  ["night", "sit", ["nmb-night"]], ["reading", "stand", ["nmb-reading", "nmb-think"]], ["offline", "stand", ["nmb-offline"]],
  ["bell", "stand", ["nmb-act-bell"]], ["lantern", "float", ["nmb-act-lantern"]], ["carried", "float", ["nm-buddy-dragging"]],
  ["cheer", "stand", ["nmb-act-cheer"]], ["startle", "stand", ["nmb-act-startle"]], ["wake", "stand", ["nmb-act-wake"]],
];

(async () => {
  const scale = Number(process.env.SCALE || 3);
  const only = (process.env.STATES || "").split(",").filter(Boolean);
  const { page, browser, OUT } = await boot({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: scale });
  const theme = process.env.THEME || "light";
  await page.evaluate((motion) => {
    document.documentElement.dataset.avatarMotion = motion;
    localStorage.setItem("avatar-buddy", "persona");
    syncNameMarkBuddy();
    clearTimeout(nmb.timer);
    nameMarkBuddySchedule = () => {};
    nameMarkBuddyTick = () => {};
    clearTimeout(atlasMoodTimer);
  }, process.env.MOTION || "off");
  await page.waitForTimeout(600);
  const shots = [];
  for (const [label, pose, classes] of STATES.filter(([l]) => !only.length || only.includes(l))) {
    const ok = await page.evaluate(([pose, classes]) => {
      const buddy = document.getElementById("nm-buddy");
      if (!buddy || !buddy.querySelector(".atl-figure")) return false;
      buddy.className = "";
      for (const c of classes) buddy.classList.add(c);
      buddy.dataset.pose = pose;
      buddy.style.left = "560px";
      buddy.style.top = "340px";
      buddy.style.translate = "";
      return true;
    }, [pose, classes]);
    if (!ok) {
      console.log("no Atlas companion");
      break;
    }
    await page.waitForTimeout(350);
    const file = `${OUT}/pose-${label}.png`;
    await page.screenshot({ path: file, clip: { x: 530, y: 310, width: 124, height: 140 } });
    shots.push([label, file]);
  }
  // One sheet from the captures, drawn by the browser.
  const fs = require("fs");
  const data = shots.map(([label, file]) => [label, fs.readFileSync(file).toString("base64")]);
  const sheet = await browser.newPage({ viewport: { width: 1100, height: 520 } });
  const scaleLabel = scale;
  await sheet.setContent(`<body style="margin:0;background:${theme === "dark" ? "#18181b" : "#f4f3ef"};font:13px sans-serif;display:grid;grid-template-columns:repeat(${Math.min(9, Math.floor(1080 / (40 * scale)))},${40 * scale}px);gap:4px;padding:8px">${data
    .map(([l, b]) => `<figure style="margin:0;text-align:center"><img src="data:image/png;base64,${b}" width="${40 * scale}"><figcaption>${l}</figcaption></figure>`)
    .join("")}</body>`);
  const out = `${OUT}/atlas-poses-${theme}-x${scaleLabel}.png`;
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(shots.length, "states", out);
  await browser.close();
})();
