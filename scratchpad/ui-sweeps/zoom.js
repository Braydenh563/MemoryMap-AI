// Zoom, reflow, text spacing and focus visibility (WCAG 2.2: 1.4.4, 1.4.10,
// 1.4.12, 2.4.11), INBOX 433.
//
//   BASE=http://127.0.0.1:8781 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/zoom.js
//
// Browser zoom is measured the way WCAG defines it, in CSS pixels: 200% of a
// 1280x800 window is a 640x400 viewport, 400% is 320x200 (1.4.10's reflow
// width). A real zoom also raises devicePixelRatio, which only changes how
// sharp things are, not where they go. Per surface and zoom:
//
//   hscroll   the page scrolls sideways (1.4.10 allows it only for content
//             that needs two dimensions: maps, boards, the graph, tables)
//   offscreen a visible control starts past the right edge with no scroller
//             that could bring it in
//   clipped   with WCAG's text spacing applied (line height 1.5, paragraphs
//             2em, letters 0.12em, words 0.16em), an element that clips its
//             text (overflow hidden or clip) now has text past its box
//   obscured  Tab through the first TABS controls: the focused one is
//             entirely covered by something else (2.4.11: sticky bars,
//             the companion, a toast)
//
// Prints findings only, then a count per zoom. ONLY= narrows the surfaces.
const { boot } = require('./lib.js');

const TABS = ['dashboard', 'notes', 'library', 'chat', 'graph', 'timeline', 'reminders', 'documents', 'whiteboard'];
const TWO_D = new Set(['graph', 'whiteboard']);
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const TAB_PRESSES = Number(process.env.TABS || 25);
const ZOOMS = [
  { name: '200%', width: 640, height: 400 },
  { name: '400%', width: 320, height: 256 },
];
const SPACING = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
p { margin-bottom: 2em !important; }`;

async function measure(page) {
  return page.evaluate(() => {
    const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true, opacityProperty: true });
    const desc = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
    const inScroller = (e) => {
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'auto' || o === 'scroll') return true;
        if (o === 'hidden' || o === 'clip') return true; // clipped on purpose (a strip with a menu)
      }
      return false;
    };
    const page = document.querySelector('.tab-page:not(.hidden)');
    const hscroll = document.documentElement.scrollWidth > innerWidth + 1;
    const offscreen = [...(page || document).querySelectorAll('button, a[href], input, select, textarea, [role="button"]')]
      .filter((e) => vis(e) && !inScroller(e))
      .filter((e) => { const r = e.getBoundingClientRect(); return r.width && r.left >= innerWidth - 1; })
      .slice(0, 5).map(desc);
    return { hscroll, offscreen };
  });
}

async function clippedText(page) {
  return page.evaluate(() => {
    const vis = (e) => e.checkVisibility && e.checkVisibility({ visibilityProperty: true, opacityProperty: true });
    const desc = (e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : ''}`;
    const root = document.querySelector('.tab-page:not(.hidden)') || document.body;
    return [...root.querySelectorAll('*')].filter((e) => {
      if (!vis(e) || !e.textContent.trim() || e.children.length > 3) return false;
      const cs = getComputedStyle(e);
      if (!/^(hidden|clip)$/.test(cs.overflowY) && !/^(hidden|clip)$/.test(cs.overflowX)) return false;
      //: An ellipsis is a stated truncation with the whole text a title or a
      //: click away, not lost text; a line clamp the same.
      if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') return false;
      if (e.matches('.visually-hidden, [class*="sr-only"], textarea, input, svg, svg *, canvas')) return false;
      //: A word kept for screen readers and hidden by the clip recipe (a dock
      //: label at a narrow width) is a 1px box on purpose, not lost text.
      if (e.clientWidth <= 1 && e.clientHeight <= 1) return false;
      //: Per axis: a feed that scrolls down and clips sideways (`overflow-x:
      //: hidden; overflow-y: auto`, the Timeline's and Chat's) is a scroller
      //: on the axis its text runs past, not a clip (INBOX 433).
      const clipY = /^(hidden|clip)$/.test(cs.overflowY), clipX = /^(hidden|clip)$/.test(cs.overflowX);
      return (clipY && e.scrollHeight > e.clientHeight + 2) || (clipX && e.scrollWidth > e.clientWidth + 2);
    }).slice(0, 6).map((e) => `${desc(e)} ${e.scrollWidth}x${e.scrollHeight}>${e.clientWidth}x${e.clientHeight}`);
  });
}

async function obscured(page) {
  await page.evaluate(() => { document.activeElement && document.activeElement.blur(); window.scrollTo(0, 0); });
  const hits = [];
  for (let i = 0; i < TAB_PRESSES; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return null;
      const b = e.getBoundingClientRect();
      if (!b.width || !b.height) return null;
      //: Entirely obscured is the AA bar (2.4.11): every one of five points
      //: on the control lands on something that is neither it nor inside it.
      const pts = [[0.5, 0.5], [0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]];
      const covered = pts.every(([x, y]) => {
        const px = b.left + b.width * x, py = b.top + b.height * y;
        if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) return true;
        const top = document.elementFromPoint(px, py);
        return top && top !== e && !e.contains(top) && !top.contains(e);
      });
      if (!covered) return null;
      const c = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2)), Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2)));
      const d = (x) => x ? `${x.tagName.toLowerCase()}${x.id ? '#' + x.id : ''}${typeof x.className === 'string' && x.className.trim() ? '.' + x.className.trim().split(/\s+/)[0] : ''}` : 'offscreen';
      return `${d(e)} under ${d(c)}`;
    });
    if (r && !hits.includes(r)) hits.push(r);
  }
  return hits;
}

(async () => {
  let total = 0;
  for (const z of ZOOMS) {
    const { browser, page } = await boot({ viewport: { width: z.width, height: z.height } });
    const out = [];
    for (const t of TABS) {
      if (ONLY.length && !ONLY.includes(t)) continue;
      await page.evaluate((name) => switchTab(name), t); await page.waitForTimeout(900);
      const m = await measure(page);
      if (m.hscroll && !TWO_D.has(t)) out.push(`[${t}] hscroll: the page scrolls sideways`);
      if (m.offscreen.length) out.push(`[${t}] offscreen: ${m.offscreen.join(', ')}`);
      //: The app's CSP refuses a <style> tag (style-src 'self'), as it should;
      //: a constructed sheet goes through the CSSOM, which it allows.
      await page.evaluate((css) => { const s = new CSSStyleSheet(); s.replaceSync(css); window.__spacing = s; document.adoptedStyleSheets = [...document.adoptedStyleSheets, s]; }, SPACING);
      await page.waitForTimeout(250);
      const c = await clippedText(page);
      if (c.length) out.push(`[${t}] clipped with text spacing: ${c.join(', ')}`);
      await page.evaluate(() => { document.adoptedStyleSheets = document.adoptedStyleSheets.filter((x) => x !== window.__spacing); });
      const o = await obscured(page);
      if (o.length) out.push(`[${t}] obscured focus: ${o.slice(0, 4).join('; ')}`);
    }
    console.log(`== ${z.name} (${z.width}x${z.height}): ${out.length} findings`);
    out.forEach((l) => console.log('  ' + l));
    total += out.length;
    await browser.close();
  }
  process.exit(total ? 1 : 0);
})();
