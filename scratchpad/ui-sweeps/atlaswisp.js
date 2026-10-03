// The masculine Atlas lower body (INBOX 435 (3), wrapup-0927 item 7: one
// thick S-curved main wisp with thinner side strands, not a tripod of
// spikes). Captures the companion in every pose that shows the lower body,
// at Medium and Large, and the large viewer, into one sheet per theme, and
// prints the lower body's extent in the figure's units (the box is 0..64 by
// 0..92; the feminine skirt already reaches x 9..53 and y 102).
//
//   BASE=http://127.0.0.1:8796 SCRATCH=/tmp/x LOOK_ATLAS=masculine THEME=light \
//     PREFIX=after PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node atlaswisp.js
//
// Shots land in $SCRATCH/shots/atlas-tail/<PREFIX>-<theme>-*.png. Animation
// is off (the still frame each pose holds); MOTION=always for a live frame.
const fs = require("fs");
const { boot, OUT } = require("./lib.js");

const POSES = [
  ["stand", "stand", []], ["walk", "stand", ["nmb-walking"]], ["float", "float", []], ["sit", "sit", []],
  ["hang", "hang", []], ["lean", "lean", []], ["lie", "lie", []], ["lie-2", "lie-2", []], ["curl", "curl", []],
  ["sleep", "sit", ["nmb-sleep"]], ["carried", "float", ["nm-buddy-dragging"]], ["meditate", "sit", ["nmb-act-meditate"]],
];

(async () => {
  const look = process.env.LOOK_ATLAS || "masculine";
  const theme = process.env.THEME || "light";
  const prefix = process.env.PREFIX || "now";
  const dir = `${OUT}/atlas-tail`;
  fs.mkdirSync(dir, { recursive: true });
  const { page, browser } = await boot({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 3 });
  await page.evaluate(([look, motion]) => {
    localStorage.setItem("atlas-look", look);
    document.documentElement.dataset.avatarMotion = motion;
    localStorage.setItem("avatar-buddy", "persona");
    syncNameMarkBuddy();
    clearTimeout(nmb.timer);
    nameMarkBuddySchedule = () => {};
    nameMarkBuddyTick = () => {};
    clearTimeout(atlasMoodTimer);
  }, [look, process.env.MOTION || "off"]);
  await page.waitForTimeout(700);
  const extent = await page.evaluate(() => {
    const out = {};
    for (const svg of document.querySelectorAll("#nm-buddy svg.atl-layer")) {
      const g = svg.querySelector(".atl-lower");
      if (!g) continue;
      const b = g.getBBox();
      out[svg.dataset.atlasLayer] = { x0: +b.x.toFixed(1), x1: +(b.x + b.width).toFixed(1), y0: +b.y.toFixed(1), y1: +(b.y + b.height).toFixed(1), paths: g.querySelectorAll("path").length };
    }
    return out;
  });
  console.log(JSON.stringify({ look, theme, extent }));
  const shots = [];
  //: QUICK=1 skips the poses: the large view and its close-up only.
  for (const scale of process.env.QUICK ? [] : [1, 1.3]) {
    //: ONLY=stand,sit narrows the poses.
    const only = (process.env.ONLY || "").split(",").filter(Boolean);
    for (const [label, pose, classes] of POSES.filter(([l]) => !only.length || only.includes(l))) {
      await page.evaluate(([pose, classes, scale]) => {
        const buddy = document.getElementById("nm-buddy");
        nameMarkBuddySetSize(scale, false);
        buddy.className = "";
        for (const c of classes) buddy.classList.add(c);
        buddy.dataset.pose = pose;
        buddy.style.left = "560px";
        buddy.style.top = "340px";
        buddy.style.translate = "";
        //: The companion is placed by a transform (avatars.js); a still
        //: frame wants it at a known spot.
        buddy.style.transform = "none";
      }, [pose, classes, scale]);
      await page.waitForTimeout(450);
      const r = await page.evaluate(() => { const b = document.getElementById("nm-buddy").getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
      const file = `${dir}/${prefix}-${theme}-${label}-x${scale}.png`;
      await page.screenshot({ path: file, clip: { x: Math.round(r[0] - 95), y: Math.round(r[1] - 110), width: 190, height: 220 } });
      shots.push([`${label} ${scale === 1 ? "M" : "L"}`, file]);
      if (label !== "stand" || scale !== 1.3) continue;
      //: Large, standing: a close-up of the joins (torso to trunk, trunk
      //: to each sub-wisp), and the widths in screen px, measured from the
      //: lower layer's own box: the torso's width at the hips (y 55) against
      //: the trunk's where it leaves the torso (y 56), and the trunk against
      //: each sub-wisp where that one branches.
      const m = await page.evaluate(() => {
        const svg = document.querySelector("#nm-buddy svg.atl-layer-lower");
        const box = svg.getBoundingClientRect();
        const k = box.width / 64;
        const spec = ATLAS_LOOKS.masculine;
        const sample = (part) => Array.from({ length: 161 }, (_, i) => [...atlasSegsAt(part.seg, i / 160), part.width(i / 160)]);
        const parts = spec.lowerPaths;
        //: A drawing from before the trail (OVERRIDE_JS) has no widths to
        //: read: the close-up only.
        if (!parts[0].width) return { box: [box.x, box.y, box.width, box.height] };
        const trunk = sample(parts.find((p) => !p.side));
        //: The torso's flank at y 55, on its own curve (the masculine
        //: torso's second and fourth curves, atlas.js `torso`).
        const flank = (side) => {
          const seg = side < 0 ? [22, 47.8, 22.6, 52.4, 24.4, 57.4, 27.2, 61] : [40, 47.8, 39.4, 52.4, 37.6, 57.4, 34.8, 61];
          let best = null;
          for (let i = 0; i <= 200; i += 1) {
            const q = atlasSegsAt([seg], i / 200);
            if (!best || Math.abs(q[1] - 55) < Math.abs(best[1] - 55)) best = q;
          }
          return best[0];
        };
        const hips = flank(1) - flank(-1);
        const top = trunk.reduce((a, q) => (Math.abs(q[1] - 56) < Math.abs(a[1] - 56) ? q : a))[2];
        const branches = parts.filter((p) => p.side).map((p) => {
          const root = atlasSegsAt(p.seg, 0);
          const at = trunk.reduce((a, q) => (Math.hypot(q[0] - root[0], q[1] - root[1]) < Math.hypot(a[0] - root[0], a[1] - root[1]) ? q : a));
          return { y: +root[1].toFixed(1), trunkPx: +(at[2] * k).toFixed(1), subPx: +(p.width(0) * k).toFixed(1), ratio: +(at[2] / p.width(0)).toFixed(2) };
        });
        return { pxPerUnit: +k.toFixed(3), hipsPx: +(hips * k).toFixed(1), topPx: +(top * k).toFixed(1), branches, box: [box.x, box.y, box.width, box.height] };
      });
      console.log(JSON.stringify({ large: m }));
      const [bx, by, bw] = m.box;
      const u = bw / 64;
      await page.screenshot({ path: `${dir}/${prefix}-${theme}-joins-x1.3.png`, clip: { x: Math.round(bx + 12 * u), y: Math.round(by + 44 * u), width: Math.round(38 * u), height: Math.round(58 * u) } });
    }
  }
  await page.evaluate(() => { document.getElementById("nm-buddy")?.classList.add("hidden"); openNameMarkViewer("Atlas"); });
  await page.waitForTimeout(1200);
  const vfile = `${dir}/${prefix}-${theme}-viewer.png`;
  await page.screenshot({ path: vfile, clip: { x: 400, y: 100, width: 400, height: 600 } });
  //: A close-up of the lower body in the large view, where the shape reads.
  await page.screenshot({ path: `${dir}/${prefix}-${theme}-close.png`, clip: { x: 500, y: 320, width: 200, height: 150 } });
  if (!shots.length) { console.log(vfile); await browser.close(); return; }
  const data = shots.map(([l, f]) => [l, fs.readFileSync(f).toString("base64")]);
  const sheet = await browser.newPage({ viewport: { width: 1500, height: 600 } });
  await sheet.setContent(`<body style="margin:0;background:${theme === "dark" ? "#18181b" : "#f4f3ef"};font:13px sans-serif;display:grid;grid-template-columns:repeat(12,120px);gap:4px;padding:8px">${data
    .map(([l, b]) => `<figure style="margin:0;text-align:center"><img src="data:image/png;base64,${b}" width="120"><figcaption>${l}</figcaption></figure>`)
    .join("")}</body>`);
  const out = `${dir}/${prefix}-${theme}-sheet.png`;
  await sheet.screenshot({ path: out, fullPage: true });
  console.log(shots.length, "shots", out, vfile);
  await browser.close();
})();
