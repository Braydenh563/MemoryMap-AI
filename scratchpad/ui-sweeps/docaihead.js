// The document AI assistant's head and its Edit / Write / Remove control,
// measured (the owner, 2026-09-24: "redesign the top section of this panel,
// it is poorly structured").
//
// Head: every control's box, one row, one height, the title's centre line
// against theirs. Verb control: its width against the card's, each segment's
// width, and the paint of the chosen and the unchosen ones (an unchosen
// segment must not read as disabled: its ink against the card's ground).
//
//   BASE=http://127.0.0.1:8810 node scratchpad/ui-sweeps/docaihead.js
//   THEME=dark SIZE=390x844 node scratchpad/ui-sweeps/docaihead.js
const { boot } = require('./lib.js');
const { openDoc } = require('./docopen.js');

const [W, H] = (process.env.SIZE || '1440x900').split('x').map(Number);
const out = [];
const check = (name, ok, detail) => out.push({ name, ok: !!ok, detail });

function lum(rgb) {
  const m = rgb.match(/[\d.]+/g).map(Number);
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
}
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

(async () => {
  const phone = W <= 600;
  const { browser, page } = await boot({ viewport: { width: W, height: H }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
  await openDoc(page, { title: 'AI head', content: 'Some words.' });
  await page.evaluate(() => openDocAiPanel());
  await page.waitForTimeout(500);
  const m = await page.evaluate(() => {
    const card = document.querySelector('.doc-ai-card');
    const box = (el) => { const r = el.getBoundingClientRect(); return { top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
    const title = card.querySelector('h2');
    const head = [...card.querySelectorAll('[data-help-for="doc-ai-verb-help"], #doc-ai-history, #doc-ai-close')];
    const verb = document.getElementById('doc-ai-verb');
    const ground = (el) => {
      let e = el;
      while (e) { const bg = getComputedStyle(e).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg) && !/, 0\)$/.test(bg)) return bg; e = e.parentElement; }
      return 'rgb(255, 255, 255)';
    };
    const segs = [...verb.querySelectorAll('label')].map((l) => {
      const cs = getComputedStyle(l);
      return { text: l.textContent.trim(), ...box(l), color: cs.color, bg: cs.backgroundColor, ground: ground(l.parentElement), weight: cs.fontWeight,
        checked: l.querySelector('input').checked, opacity: cs.opacity };
    });
    const cardInner = card.getBoundingClientRect().width - parseFloat(getComputedStyle(card).paddingLeft) - parseFloat(getComputedStyle(card).paddingRight);
    return { title: box(title), titleFont: getComputedStyle(title).fontSize, head: head.map((el) => ({ id: el.id || 'help', ...box(el) })),
      verb: box(verb), cardInner: +cardInner.toFixed(1), segs, firstControlTop: box(verb).top - box(card).top };
  });
  console.log(JSON.stringify(m, null, 1));
  const heights = new Set(m.head.filter((h) => h.id !== 'help').map((h) => h.h));
  const centre = (b) => (b.top + b.bottom) / 2;
  check('head: one row', m.head.every((h) => Math.abs(centre(h) - centre(m.title)) <= 2), m.head.map((h) => centre(h) - centre(m.title)));
  check('head: History and Close one height', heights.size === 1, [...heights]);
  check('verbs: full width', Math.abs(m.verb.w - m.cardInner) <= 2, { verb: m.verb.w, card: m.cardInner });
  const widths = m.segs.map((s) => s.w);
  check('verbs: equal segments', Math.max(...widths) - Math.min(...widths) <= 1, widths);
  const off = m.segs.filter((s) => !s.checked);
  const on = m.segs.find((s) => s.checked);
  const offContrast = off.map((s) => +contrast(s.color, s.ground).toFixed(2));
  check('verbs: unchosen read as enabled (ink 4.5:1 or more)', offContrast.every((c) => c >= 4.5), offContrast);
  check('verbs: the chosen one is filled', on && on.bg !== off[0].bg, on);
  if (process.env.SHOT) {
    const card = await page.$('.doc-ai-card');
    await card.screenshot({ path: `${process.env.SCRATCH || '.'}/docaihead-${W}${process.env.THEME || ''}.png` });
  }
  await browser.close();
  const failed = out.filter((c) => !c.ok);
  for (const c of out) console.log(c.ok ? 'ok  ' : 'FAIL', c.name, c.ok ? '' : JSON.stringify(c.detail));
  console.log(`${out.length - failed.length} of ${out.length}`);
  process.exit(process.env.REPORT ? 0 : failed.length ? 1 : 0);
})();
