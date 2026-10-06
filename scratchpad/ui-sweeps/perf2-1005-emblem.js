// perf2-1005 (audit FE-07): the emblem drawn on a 2D canvas against the p5
// sketch it replaced, pixel by pixel, at three sizes; and the boot's network
// list (no p5, no d3 before a tab asks for them).
//   BASE=http://127.0.0.1:8859 node perf2-1005-emblem.js
const { boot } = require("./lib.js");
(async () => {
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 }, scale: 2 });
  const requested = [];
  page.on("request", (r) => requested.push(r.url()));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4000);
  await page.fill("#lock-password", "testpassword123").catch(() => {});
  await page.click("#lock-submit").catch(() => {});
  await page.waitForTimeout(4000);
  const atBoot = requested.filter((u) => /p5\.min|d3\.v7/.test(u)).map((u) => u.split("/").pop());
  const compare = await page.evaluate(async () => {
    await new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "/vendor/p5.min.js";
      s.onload = resolve;
      document.head.appendChild(s);
    });
    const accentHex = typeof currentAccentHex === "function" ? currentAccentHex() : "#7c8cf8";
    const out = [];
    for (const size of [24, 52, 76]) {
      const mine = document.createElement("div");
      document.body.appendChild(mine);
      renderEmblem(mine, size, { animate: false });
      const a = mine.querySelector("canvas");
      const theirs = document.createElement("div");
      document.body.appendChild(theirs);
      await new Promise((resolve) => {
        new p5((p) => {
          let nodes = [];
          let baseHue = 230;
          p.setup = () => {
            p.createCanvas(size, size);
            p.colorMode(p.HSL, 360, 100, 100, 1);
            p.randomSeed(emblemSeed);
            baseHue = p.hue(p.color(accentHex));
            const count = 4 + Math.floor(p.random(3));
            nodes = Array.from({ length: count }, (_, i) => ({
              angle: (i / count) * p.TWO_PI + p.random(-0.3, 0.3),
              hue: (baseHue + p.random(-40, 40) + 360) % 360,
            }));
            p.draw();
            p.noLoop();
            resolve();
          };
          p.draw = () => {
            p.clear();
            p.translate(size / 2, size / 2);
            const r = size * 0.32;
            const dot = Math.max(4, size * 0.18);
            p.stroke(baseHue, 60, 60, 0.6);
            p.strokeWeight(Math.max(1, size / 34));
            for (let i = 0; i < nodes.length; i++) {
              for (let j = i + 1; j < nodes.length; j++) {
                p.line(Math.cos(nodes[i].angle) * r, Math.sin(nodes[i].angle) * r, Math.cos(nodes[j].angle) * r, Math.sin(nodes[j].angle) * r);
              }
            }
            p.noStroke();
            for (const n of nodes) {
              p.fill(n.hue, 75, 60, 1);
              p.circle(Math.cos(n.angle) * r, Math.sin(n.angle) * r, dot);
            }
            p.fill(baseHue, 70, 62, 1);
            p.circle(0, 0, dot * 0.85);
          };
        }, theirs);
      });
      const b = theirs.querySelector("canvas");
      const read = (c) => c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      const da = read(a);
      const db = read(b);
      let differ = 0;
      let worst = 0;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]), Math.abs(da[i + 3] - db[i + 3]));
        if (d > 24) differ += 1;
        worst = Math.max(worst, d);
      }
      out.push({ size, mine: `${a.width}x${a.height}`, p5: `${b.width}x${b.height}`, pixels: da.length / 4, differOver24: differ, share: +(differ / (da.length / 4)).toFixed(4), worst });
      mine.remove();
      theirs.remove();
    }
    return out;
  });
  console.log(JSON.stringify({ atBoot, compare }, null, 1));
  await browser.close();
})();
