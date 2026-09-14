// INBOX 231: "these suggested questions in the popup agent are really ugly and
// that area needs a better modern and more professional redesign."
//
//   BASE=http://127.0.0.1:8801 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/starters.js          (THEME=dark for the other)
//
// The target from the entry: quiet rows with no border at rest, an icon in
// muted accent, a fill on hover only, group labels small without rules, one
// column below 480px. Each of those is a number here: the computed border and
// ground at rest and under the pointer, the glyph's colour against the panel,
// the heading's border, and the column count at 1440 and 390.
const { boot } = require('./lib.js');

// Colour is resolved and composited in the page, with `contrast.js`'s own
// canvas trick: `getComputedStyle` hands back `color(srgb ...)` for a
// `color-mix`, and the panel these rows sit on is translucent, so a naive
// rgb() parser measures neither the drawn glyph nor the ground behind it.
(async () => {
  const theme = process.env.THEME || 'light';
  const fails = [];
  const check = (label, ok, detail) => {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${theme} ${label}: ${detail}`);
    if (!ok) fails.push(label);
  };
  const { browser, page } = await boot({ viewport: { width: 1440, height: 900 } });

  await page.evaluate(() => { toggleAgentPalette(); renderAgentStarters(); });
  await page.waitForTimeout(600);

  const measure = async (width) => {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(300);
    await page.evaluate(() => renderAgentStarters());
    await page.waitForTimeout(200);
    // Hover the first row, so "a fill on hover only" is measured rather than
    // read off the stylesheet.
    await page.hover('.command-palette-examples > button.starter');
    await page.waitForTimeout(200);
    return page.evaluate(() => {
      const box = document.getElementById('command-palette-starters');
      const rows = [...box.querySelectorAll('button.starter')];
      const heads = [...box.querySelectorAll('.starter-verb')];
      const hovered = rows[0];
      const rest = rows[1];
      const panel = getComputedStyle(box.closest('.card') || box).backgroundColor;
      const cs = (el) => getComputedStyle(el);
      const cols = new Set(rows.map((r) => Math.round(r.getBoundingClientRect().left))).size;
      const r0 = rows[0].getBoundingClientRect();
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const cx = cv.getContext('2d', { willReadFrequently: true });
      const parse = (c) => {
        if (!c || c === 'transparent') return null;
        const m = c.match(/^rgba?\(([^)]+)\)$/);
        if (m) {
          const p = m[1].split(/[\s,/]+/).map(Number);
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
        const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const ratio = (a, b) => {
        const l1 = lum(a); const l2 = lum(b);
        return +((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
      };
      // **Composited, not "the first ancestor with a background".** This panel
      // is a translucent card over a scrim over the page, so the colour a
      // glyph is actually read against is the stack, and taking the first
      // layer alone reported a 0.549-alpha white as black.
      const over = (bg, fg) => ({
        r: fg.a * fg.r + (1 - fg.a) * bg.r,
        g: fg.a * fg.g + (1 - fg.a) * bg.g,
        b: fg.a * fg.b + (1 - fg.a) * bg.b,
        a: 1,
      });
      const bgOf = (el) => {
        const layers = [];
        for (let e = el; e; e = e.parentElement) {
          const c = parse(getComputedStyle(e).backgroundColor);
          if (c && c.a > 0) layers.push(c);
          if (c && c.a >= 1) break;
        }
        const root = parse(getComputedStyle(document.documentElement).backgroundColor);
        let ground = root && root.a >= 1 ? root : { r: 255, g: 255, b: 255, a: 1 };
        if (layers.length && layers[layers.length - 1].a >= 1) ground = layers.pop();
        for (let i = layers.length - 1; i >= 0; i -= 1) ground = over(ground, layers[i]);
        return ground;
      };
      const ground = bgOf(rest);
      const asText = (c) => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;
      return {
        glyphRatio: ratio(parse(cs(rest.querySelector('.ph-lead')).color), ground),
        labelRatio: ratio(parse(cs(rest).color), ground),
        ground: asText(ground),
        rows: rows.length,
        heads: heads.length,
        columns: cols,
        rowH: Math.round(r0.height),
        rowW: Math.round(r0.width),
        restBorder: cs(rest).borderTopColor,
        restBorderWidth: cs(rest).borderTopWidth,
        restBg: cs(rest).backgroundColor,
        hoverBg: cs(hovered).backgroundColor,
        hoverBorder: cs(hovered).borderTopColor,
        headBorder: cs(heads[0]).borderBottomWidth,
        headSize: cs(heads[0]).fontSize,
        glyph: cs(rest.querySelector('.ph-lead')).color,
        label: cs(rest).color,
        panel,
        align: cs(rest).justifyContent,
        //: The label must not be cut: the report's own complaint about the
        //: two-column grid on a narrow card.
        clipped: rows.filter((r) => r.scrollWidth > r.clientWidth + 1).length,
      };
    });
  };

  for (const width of [1440, 390]) {
    const m = await measure(width);
    console.log(`  ${width}: ${JSON.stringify(m)}`);
    const wantCols = width >= 480 ? 2 : 1;
    check(`${width} ${wantCols} column(s)`, m.columns === wantCols,
      `${m.rows} rows in ${m.columns} column(s), each ${m.rowW}x${m.rowH}, ${m.heads} group labels`);
    const transparent = (c) => /^rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)$/.test(c) || c === 'transparent';
    check(`${width} no edge and no ground at rest`, transparent(m.restBorder) && transparent(m.restBg),
      `border ${m.restBorderWidth} ${m.restBorder}, background ${m.restBg}`);
    check(`${width} the ground arrives with the pointer`,
      m.hoverBg !== m.restBg,
      `rest ${m.restBg} -> hover ${m.hoverBg}, border ${m.hoverBorder}`);
    check(`${width} the group label carries no rule`, parseFloat(m.headBorder) === 0,
      `border-bottom ${m.headBorder}, font-size ${m.headSize}`);
    check(`${width} the glyph reads against the panel`, m.glyphRatio >= 3,
      `glyph ${m.glyph} on ${m.ground} is ${m.glyphRatio}:1, the label beside it ${m.labelRatio}:1`);
    check(`${width} no label is cut off`, m.clipped === 0,
      `${m.clipped} of ${m.rows} rows overflow their own box`);
  }

  console.log(fails.length ? `FAILURES: ${fails.join(', ')}` : 'ALL OK');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
