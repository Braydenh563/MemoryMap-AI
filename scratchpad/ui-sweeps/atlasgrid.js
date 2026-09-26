// Atlas's poses beside the owner's sprite grid (65.webp, cropped per cell
// into $SCRATCH/ref65-<pose>.png): each cell is the reference on the left
// and the companion's figure in that state on the right, so a silhouette
// can be read against its model. ATLAS_LOOK=masculine|feminine,
// THEME=light|dark, TAG; ZOOM=2.5 renders the figure larger (fewer per
// row) and POSES=sit,float,... picks cells. Writes $SCRATCH/shots/atlas-r2-grid-<look>-<theme>[-<tag>].png.
//
//   BASE=http://127.0.0.1:8820 SCRATCH=/tmp/x PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlasgrid.js
const { boot } = require("./lib.js");
const fs = require("fs");

//: [label, reference cell, data-pose, classes on #nm-buddy]
const POSES = [
  ["stand", "stand", "stand", []], ["sit", "sit", "sit", []], ["hang", "hang", "hang", []], ["float", "float", "float", []],
  ["sleep", "sleep", "sit", ["nmb-sleep"]], ["drowsy", "drowsy", "stand", ["nmb-music", "nmb-drowsy"]], ["night", "night", "sit", ["nmb-night"]], ["reading", "reading", "stand", ["nmb-reading", "nmb-think"]],
  ["cheer", "cheer", "stand", ["nmb-act-cheer"]], ["startle", "startle", "stand", ["nmb-act-startle"]], ["wake", "wake", "stand", ["nmb-act-wake"]], ["lantern", "lantern", "stand", ["nmb-act-lantern"]],
  ["offline", "offline", "stand", ["nmb-offline"]], ["meditate", "meditate", "float", ["nmb-act-meditate"]], ["juggling", "juggling", "stand", ["nmb-act-juggle"]], ["starry map", "map", "stand", ["nmb-act-map"]],
  ["wave", "", "stand", ["nmb-act-wave"]], ["bell", "", "stand", ["nmb-act-bell"]], ["peek", "", "stand", ["nmb-act-peek"]],
];

(async () => {
  const look = process.env.ATLAS_LOOK || "masculine";
  const theme = process.env.THEME || "light";
  const scratch = process.env.SCRATCH || ".";
  const zoom = Number(process.env.ZOOM || 1);
  const only = process.env.POSES ? process.env.POSES.split(",") : null;
  const poses = only ? POSES.filter(([l]) => only.includes(l)) : POSES;
  const { page, browser, OUT } = await boot({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
  await page.evaluate((look) => {
    document.documentElement.dataset.avatarMotion = "off";
    localStorage.setItem("atlas-look", look);
    localStorage.setItem("avatar-buddy", "persona");
    clearTimeout(atlasMoodTimer);
    atlasApply = ((apply) => (svg, mood) => apply(svg, svg.dataset.keep || mood))(atlasApply);
    syncNameMarkBuddy();
    const ground = document.createElement("div");
    for (const [k, v] of Object.entries({ position: "fixed", left: "560px", top: "300px", width: "600px", height: "560px", zIndex: "49", background: "var(--card)" })) ground.style[k] = v;
    document.body.appendChild(ground);
    clearTimeout(nmb.timer);
    nameMarkBuddySchedule = () => {};
    nameMarkBuddyTick = () => {};
  }, look);
  await page.waitForTimeout(500);
  const cells = [];
  for (const [label, ref, pose, classes] of poses) {
    await page.evaluate(([pose, classes, zoom]) => {
      const buddy = document.getElementById("nm-buddy");
      buddy.className = "";
      for (const c of classes) buddy.classList.add(c);
      buddy.dataset.pose = pose;
      //: The companion is placed by one transform on its host (avatars.js);
      //: CSS zoom scales the offsets too, so the box is placed in zoomed px.
      buddy.style.left = "0px";
      buddy.style.top = "0px";
      buddy.style.transform = `translate(${660 / zoom}px, ${400 / zoom}px)`;
      buddy.style.translate = "";
      buddy.style.zoom = String(zoom);
      //: The companion's size grip (avatars.js) is its own control, not
      //: the drawing: hidden so the cells compare drawings (an element
      //: style, since the app's CSP refuses an inline stylesheet).
      for (const grip of buddy.querySelectorAll(".nmb-size-grip")) grip.style.display = "none";
    }, [pose, classes, zoom]);
    await page.waitForTimeout(300);
    const buf = await page.screenshot({ clip: { x: 610, y: 350, width: 164 * zoom, height: 164 * zoom } });
    const refFile = ref ? `${scratch}/ref65-${ref}.png` : "";
    const refB64 = refFile && fs.existsSync(refFile) ? fs.readFileSync(refFile).toString("base64") : "";
    cells.push([label, buf.toString("base64"), refB64]);
  }
  const sheet = await browser.newPage({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: 1.5 });
  const bg = theme === "dark" ? "#141427" : "#f4f3f8";
  const card = theme === "dark" ? "#1d1d38" : "#ffffff";
  const ink = theme === "dark" ? "#e8e6f5" : "#26243a";
  await sheet.setContent(`<!doctype html><html><head><style>body{margin:0;padding:16px;background:${bg};color:${ink};font:12px system-ui,sans-serif}
  .g{display:grid;grid-template-columns:repeat(${zoom > 1 ? 2 : 4},1fr);gap:10px}
  figure{margin:0;background:${card};border-radius:10px;padding:6px;display:grid;grid-template-columns:1fr 1fr;gap:4px;align-items:center}
  figure img{width:100%;height:auto;display:block;border-radius:6px}
  figcaption{grid-column:1/3;text-align:center;font-weight:600}
  .none{height:100%;min-height:120px;display:grid;place-items:center;color:#888;font-size:11px}</style></head><body>
  <div class="g">${cells.map(([l, b, r]) => `<figure>${r ? `<img src="data:image/png;base64,${r}">` : `<div class="none">no cell</div>`}<img src="data:image/png;base64,${b}"><figcaption>${l}</figcaption></figure>`).join("")}</div>
  </body></html>`);
  await sheet.waitForTimeout(600);
  const out = `${OUT}/atlas-r2-grid-${look}-${theme}${process.env.TAG ? "-" + process.env.TAG : ""}.png`;
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(out);
  await browser.close();
})();
