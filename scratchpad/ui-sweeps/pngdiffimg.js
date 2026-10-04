// Side by side, 3x: PNG a, PNG b, and the pixels that differ by more than 8 in red.
// node pngdiffimg.js a.png b.png out.png
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [a, b, out] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const enc = (p) => `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
  const url = await page.evaluate(async ([x, y]) => {
    const load = (s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; });
    const [ia, ib] = await Promise.all([load(x), load(y)]);
    const w = ia.width; const h = ia.height; const S = 3;
    const c = document.createElement('canvas'); c.width = w * S * 3; c.height = h * S;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(ia, 0, 0, w * S, h * S); g.drawImage(ib, w * S, 0, w * S, h * S);
    const t = document.createElement('canvas'); t.width = w; t.height = h; const tg = t.getContext('2d');
    tg.drawImage(ia, 0, 0); const da = tg.getImageData(0, 0, w, h); tg.drawImage(ib, 0, 0); const db = tg.getImageData(0, 0, w, h);
    const o = tg.createImageData(w, h);
    for (let k = 0; k < da.data.length; k += 4) {
      const d = Math.max(Math.abs(da.data[k] - db.data[k]), Math.abs(da.data[k + 1] - db.data[k + 1]), Math.abs(da.data[k + 2] - db.data[k + 2]));
      o.data[k] = 255; o.data[k + 1] = d > 8 ? 0 : 255; o.data[k + 2] = d > 8 ? 0 : 255; o.data[k + 3] = 255;
    }
    tg.putImageData(o, 0, 0); g.drawImage(t, 0, 0, w, h, w * S * 2, 0, w * S, h * S);
    return c.toDataURL('image/png');
  }, [enc(a), enc(b)]);
  fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
  await browser.close();
})();
