// Atlas's two looks as the corner companion, in the poses and acts whose arms
// and lower body INBOX 554, 556 and 564 are about, one sheet per look:
// $SCRATCH/shots/atlasmo-<look>-<TAG>.png. Animation off (each state's still
// frame) unless MOTION=always.
//
//   BASE=http://127.0.0.1:8847 SCRATCH=/tmp/x TAG=before PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlasmo1005-sheet.js
// REF_DIR=dir serves atlas.js and 08-consistency.css from there.
const { boot } = require("./lib.js");
const fs = require("fs");

const STATES = [
  ["stand", "stand", []], ["sit", "sit", []], ["hang", "hang", []], ["float", "float", []], ["lean", "lean", []],
  ["lie", "lie", []], ["curl", "curl", []], ["wave", "stand", ["nmb-act-wave"]], ["point", "stand", ["nmb-act-point"]],
  ["reach", "stand", ["nmb-act-reach"]], ["shrug", "stand", ["nmb-act-shrug"]], ["fold", "stand", ["nmb-act-fold"]],
  ["hip", "stand", ["nmb-act-hip"]], ["clasp", "stand", ["nmb-act-clasp"]], ["bell", "stand", ["nmb-act-bell"]],
  ["carried", "float", ["nm-buddy-dragging"]], ["cheer", "stand", ["nmb-act-cheer"]], ["think", "stand", ["nmb-think"]],
];

(async () => {
  const scale = Number(process.env.SCALE || 3);
  const tag = process.env.TAG || "now";
  if (process.env.REF_DIR) {
    process.env.OVERRIDE_JS = `atlas.js=${process.env.REF_DIR}/atlas.js`;
    process.env.OVERRIDE_CSS = `08-consistency.css=${process.env.REF_DIR}/08-consistency.css`;
  }
  const only = (process.env.LOOKS || "feminine,masculine").split(",");
  for (const look of only) {
    const { page, browser, OUT } = await boot({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: scale });
    await page.evaluate(([motion, look]) => {
      document.documentElement.dataset.avatarMotion = motion;
      localStorage.setItem("atlas-look", look);
      try { clearTimeout(atlasMoodTimer); } catch (e) {}
    }, [process.env.MOTION || "off", look]);
    const shots = [];
    const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
    for (const [label, pose, classes] of STATES.filter(([l]) => !ONLY.length || ONLY.includes(l))) {
      await page.evaluate(([pose, classes]) => {
        document.getElementById("mo-box")?.remove();
        document.getElementById("nm-buddy")?.remove();
        const box = document.createElement("div"); box.id = "mo-box";
        Object.assign(box.style, { position: "fixed", left: "0", top: "0", width: "124px", height: "140px", zIndex: "9999", overflow: "hidden", background: "#f3f4fa" });
        const holder = document.createElement("div"); holder.id = "nm-buddy";
        Object.assign(holder.style, { position: "absolute", left: "30px", top: "26px", width: "64px", height: "92px" });
        if (pose !== "stand") holder.dataset.pose = pose;
        for (const c of classes) holder.classList.add(c);
        const fig = atlasFigure(); Object.assign(fig.style, { position: "relative", display: "block", width: "64px", height: "92px" });
        holder.append(fig); box.append(holder); document.body.append(box);
      }, [pose, classes]);
      await page.waitForTimeout(Number(process.env.WAIT || 900));
      const file = `${OUT}/atlasmo-${look}-${label}.png`;
      await (await page.$("#mo-box")).screenshot({ path: file });
      shots.push([label, file]);
    }
    const data = shots.map(([l, f]) => [l, fs.readFileSync(f).toString("base64")]);
    const sheet = await browser.newPage({ viewport: { width: 1100, height: 520 } });
    await sheet.setContent(`<body style="margin:0;background:#f4f3ef;font:13px sans-serif;display:grid;grid-template-columns:repeat(9,${40 * scale}px);gap:4px;padding:8px">${data.map(([l, b]) => `<figure style="margin:0;text-align:center"><img src="data:image/png;base64,${b}" width="${40 * scale}"><figcaption>${l}</figcaption></figure>`).join("")}</body>`);
    const out = `${OUT}/atlasmo-${look}-${tag}.png`;
    await sheet.screenshot({ path: out, fullPage: true });
    console.log(look, shots.length, out);
    await browser.close();
  }
})();
