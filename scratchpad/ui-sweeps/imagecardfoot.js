// The foot of the Library image cards, block by block (INBOX 115 and 118).
//
// `imagecardrow.js` beside this measures the row: six cards, their heights,
// their caption line counts. This one measures what is *under* the picture on
// each of them, which is what both reports are about: every block in the
// card's flow with its class, its height and its words, the gap left under
// the last one, and the computed shape of the two blocks that carry a fact
// (the count and the fold) so "unstyled paragraph" is a number rather than an
// impression.
//
//   BASE=http://127.0.0.1:8897 SCRATCH=/tmp/mm-cards2 THEME=dark WIDTH=1440 \
//   PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node scratchpad/ui-sweeps/imagecardfoot.js
const { boot } = require('./lib.js');

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8DAwMDAxMDAwAAADwEBAAyEAvUAAAAASUVORK5CYII=';
const CAPTIONS = [
  '',
  'A receipt.',
  'A photograph of a lecture slide with a title and three bullet points under it.',
  'A whiteboard photographed at an angle, covered in boxes and arrows sketched in blue marker, with a laptop and two coffee cups on the table below it.',
  'A scanned page from a notebook, ruled, with a long hand-written list down the left margin and a diagram of a pipeline drawn across the middle of it in two colours, annotated at every arrow.',
  'A screenshot of a settings dialog.',
];
const OCR = 'INGEST -> PARSE -> STORE\nnightly batch?\nask Priya about the retry budget';

const probe = () => {
  const tiles = [...document.querySelectorAll('.library-image-tile')];
  const seen = (el) => {
    if (!el || !el.offsetParent) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const blocks = (root, tile) =>
    [...root.children].filter(seen).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        cls: el.className.toString().split(' ').filter((c) => c.startsWith('library-')).join('.') || el.tagName.toLowerCase(),
        h: +r.height.toFixed(1),
        top: +(r.top - tile.getBoundingClientRect().top).toFixed(1),
        text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
      };
    });
  return tiles.map((t) => {
    const r = t.getBoundingClientRect();
    const fr = t.querySelector('.library-image-frame')?.getBoundingClientRect();
    const fields = t.querySelector('.library-image-fields');
    const uses = t.querySelector('.library-image-uses');
    const fold = t.querySelector('.library-image-reading > summary');
    const cs = (el, props) =>
      el && seen(el)
        ? Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]))
        : null;
    const last = [...t.children].filter(seen).pop();
    const lastInner = fields && seen(fields) ? [...fields.children].filter(seen).pop() : null;
    const bottom = lastInner
      ? lastInner.getBoundingClientRect().bottom
      : last
        ? last.getBoundingClientRect().bottom
        : r.bottom;
    return {
      card: +r.height.toFixed(1),
      cardBottom: +r.bottom.toFixed(1),
      picture: fr ? +fr.height.toFixed(1) : null,
      foot: fr ? +(r.bottom - fr.bottom).toFixed(1) : null,
      tail: +(r.bottom - bottom).toFixed(1),
      rows: fields ? blocks(fields, t) : [],
      usesStyle: cs(uses, ['fontSize', 'marginTop', 'marginBottom', 'color', 'display']),
      foldStyle: cs(fold, ['fontSize', 'background', 'paddingTop', 'paddingLeft']),
      foldBox: fold && seen(fold)
        ? {
            w: +fold.getBoundingClientRect().width.toFixed(1),
            h: +fold.getBoundingClientRect().height.toFixed(1),
          }
        : null,
      atRest: [...t.querySelectorAll('button, input, summary, a')].filter(seen).length,
    };
  });
};

// Contrast, on the cards only. `contrast.js` walks the seven top-level tabs
// and stops at whichever Library sub-tab happens to be showing, so the type on
// a picture card, two steps down the scale from the page's prose, is not in
// its report. Same algorithm (computed colours composited up the tree, WCAG
// 4.5 or 3 for large), the tiles as its scope.
const contrast = () => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = (c) => {
    if (!c || c === 'transparent') return null;
    const m = c.match(/^rgba?\(([^)]+)\)$/);
    if (m) {
      const p = m[1].split(/[\s,\/]+/).map(Number);
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = '#000';
    cx.fillStyle = c;
    cx.fillRect(0, 0, 1, 1);
    const d = cx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  // `contrast.js` gives up at the first background *image* and calls the
  // result a gradient: on a picture card that is every element, because the
  // page's own art is a gradient behind the glass, so the cards came back
  // "0 checked". This composites the translucent fills down instead, the tile
  // over the panel over the page, and lands on the body colour, which is the
  // same approximation that sweep's "~" already marks as translucent.
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const bgOf = (el) => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0) {
        stack.push(c);
        if (c.a >= 0.999) break;
      }
    }
    const base = parse(getComputedStyle(document.body).backgroundColor);
    let out = base && base.a >= 0.999 ? base : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i -= 1) out = over(stack[i], out);
    return out;
  };
  const out = [];
  for (const el of document.querySelectorAll('.library-image-tile *')) {
    if (!el.checkVisibility || !el.checkVisibility()) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim())
      .map((n) => n.textContent.trim()).join(' ');
    if (!text) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg || fg.a < 1) continue;
    const bg = bgOf(el);
    if (!bg) continue;
    const size = parseFloat(cs.fontSize);
    const need = size >= 18.66 || (parseInt(cs.fontWeight, 10) >= 700 && size >= 14) ? 3 : 4.5;
    const r = ratio(fg, bg);
    out.push({
      cls: el.className.toString().split(' ')[0] || el.tagName.toLowerCase(),
      size,
      ratio: +r.toFixed(2),
      pass: r >= need,
      text: text.slice(0, 24),
    });
  }
  return out;
};

(async () => {
  const width = Number(process.env.WIDTH || 1440);
  const { browser, page, OUT } = await boot({ viewport: { width, height: 900 } });
  const say = (k, v) => console.log(`${k}: ${JSON.stringify(v)}`);

  // Seed once per data dir: a second run against the same dir would otherwise
  // add six more cards and measure a gallery nobody has.
  const seeded = await page.evaluate(async () => {
    const r = await api('/media');
    const rows = Array.isArray(r) ? r : r.items || r.media || r.files || [];
    return rows.length;
  });
  if (!seeded) {
    await page.evaluate(async ({ b64, captions, ocr }) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ids = [];
      for (let i = 0; i < captions.length; i += 1) {
        const fd = new FormData();
        fd.append('file', new File([bytes], `card-${i}.png`, { type: 'image/png' }));
        fd.append('direct', 'true');
        const res = await fetch('/media/upload', {
          method: 'POST', body: fd,
          headers: { 'X-Auth-Token': authToken(), 'X-Workspace-ID': activeSpaceId() },
        });
        ids.push(await res.json());
      }
      for (let i = 0; i < captions.length; i += 1) {
        if (captions[i]) {
          await api(`/media/${ids[i].id}/caption`, { method: 'POST', body: JSON.stringify({ text: captions[i] }) });
        }
      }
      await api(`/media/${ids[3].id}/vision-ocr`, { method: 'POST', body: JSON.stringify({ text: ocr }) });
      await api(`/media/${ids[4].id}/vision-ocr`, { method: 'POST', body: JSON.stringify({ text: ocr }) });
      await api('/entries', { method: 'POST', body: JSON.stringify({ content: `# Foot sweep\n\n![a](${ids[3].url})\n\n![b](${ids[1].url})`, tags: ['sweep'] }) });
      await api('/entries', { method: 'POST', body: JSON.stringify({ content: `# Foot sweep two\n\n![a](${ids[3].url})`, tags: ['sweep'] }) });
    }, { b64: PNG, captions: CAPTIONS, ocr: OCR });
  }

  await page.evaluate(() => switchTab('library'));
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('#library-subtabs button, [data-subtab]')]
      .find((e) => /image/i.test(e.textContent || e.dataset.subtab || ''));
    if (b) b.click();
  });
  await page.waitForTimeout(1600);
  const rows = await page.evaluate(probe);
  say('width', width);
  say('heights', rows.map((r) => r.card));
  say('bottoms', rows.map((r) => r.cardBottom));
  say('pictures', rows.map((r) => r.picture));
  say('tails', rows.map((r) => r.tail));
  say('atRest', rows.map((r) => r.atRest));
  for (const [i, row] of rows.entries()) say(`card${i}`, { foot: row.foot, fold: row.foldBox, rows: row.rows });
  const seenText = await page.evaluate(contrast);
  const low = seenText.filter((t) => !t.pass);
  say('contrastChecked', seenText.length);
  say('contrastLow', low);
  say('usesStyle', rows.map((r) => r.usesStyle).find(Boolean) || null);
  say('foldStyle', rows.map((r) => r.foldStyle).find(Boolean) || null);
  await page.screenshot({ path: `${OUT}/imagecardfoot-${width}-${process.env.THEME || 'light'}.png` });
  console.log('shots in ' + OUT);
  await browser.close();
})();
