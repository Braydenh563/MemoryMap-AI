// Renders the raster icons from frontend/favicon.svg with Chromium, so the
// PNGs and the ICO can never be a different drawing from the SVG.
//
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/brand-icons.js
//
// Writes frontend/icon-512.png, frontend/apple-touch-icon.png (180) and
// frontend/icon.ico (16, 32, 48 and 256, each a PNG inside the ICO, which
// every Windows since Vista reads), and prints each file's size.
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');

async function render(page, svg, size) {
  const src = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent"><img id="i" width="${size}" height="${size}" src="${src}"></body></html>`
  );
  await page.waitForFunction(() => document.getElementById('i').complete);
  return page.locator('#i').screenshot({ omitBackground: true });
}

function ico(images) {
  const head = Buffer.alloc(6 + 16 * images.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = head.length;
  images.forEach(({ size, png }, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, at);
    head.writeUInt8(size >= 256 ? 0 : size, at + 1);
    head.writeUInt8(0, at + 2);
    head.writeUInt8(0, at + 3);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(png.length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += png.length;
  });
  return Buffer.concat([head, ...images.map((x) => x.png)]);
}

(async () => {
  const svg = fs.readFileSync(path.join(FRONTEND, 'favicon.svg'), 'utf8');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  const out = {};
  for (const size of [16, 32, 48, 180, 256, 512]) out[size] = await render(page, svg, size);
  await browser.close();
  fs.writeFileSync(path.join(FRONTEND, 'icon-512.png'), out[512]);
  fs.writeFileSync(path.join(FRONTEND, 'apple-touch-icon.png'), out[180]);
  fs.writeFileSync(path.join(FRONTEND, 'icon.ico'), ico([16, 32, 48, 256].map((size) => ({ size, png: out[size] }))));
  const dir = process.env.SCRATCH;
  if (dir) for (const size of [16, 32]) fs.writeFileSync(path.join(dir, `icon-${size}.png`), out[size]);
  for (const f of ['icon-512.png', 'apple-touch-icon.png', 'icon.ico']) {
    console.log(f, fs.statSync(path.join(FRONTEND, f)).size);
  }
})().catch((e) => { console.error(e); process.exit(1); });
