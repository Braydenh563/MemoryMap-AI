// INBOX 270, the owner: "also can you improve/redesign the ui and layout of the
// guide popup panel at all??"
//
// The guide popup is the Atlas help chat: `openHelpChat()` in settings.js puts
// the one `#help-chat-group` into a `sheet-corner` sheet. This probe measures
// it rather than looking at it (CLAUDE.md section 5: "a screenshot you look at
// is not a measurement"), so a redesign can be argued from numbers:
//
//   - the card's box at 1440x900 and 390x844, and what share of its height is
//     chrome (head, starters, composer) against transcript;
//   - whether the transcript actually scrolls, and whether anything overflows
//     the card or is clipped;
//   - the contrast of every visible text colour against the first opaque
//     ground above it, as a WCAG ratio (the same maths contrast.js uses, so
//     the numbers are comparable);
//   - the focus order the Tab key gives, and whether Escape and a press on the
//     scrim both close the panel.
//
//   BASE=http://127.0.0.1:8866 node scratchpad/ui-sweeps/guidepanel.js
const { boot } = require('./lib.js');

const MEASURE = () => {
  const sheet = document.querySelector('[data-sheet="guide"]');
  if (!sheet) return { open: false };
  const card = sheet.querySelector('.sheet-card');
  const box = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height),
      right: Math.round(window.innerWidth - b.right), bottom: Math.round(window.innerHeight - b.bottom) };
  };
  const cardBox = card.getBoundingClientRect();

  // --- contrast, the same maths as contrast.js ---
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const parse = (c) => {
    if (!c || c === 'transparent') return null;
    const m = c.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[\s,/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; }
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c;
    if (cx.fillStyle === '#000000' && !/black|#000/.test(c)) return null;
    cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data;
    return { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
  };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const bgOf = (el) => { let translucent = false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { c: null, translucent, gradient: true };
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { if (c.a < 1) translucent = true; if (c.a >= 0.9) return { c, translucent }; }
    }
    const root = parse(getComputedStyle(document.body).backgroundColor);
    return { c: root && root.a > 0 ? root : { r: 255, g: 255, b: 255, a: 1 }, translucent: true };
  };
  const low = [];
  for (const el of card.querySelectorAll('*')) {
    if (!el.checkVisibility || !el.checkVisibility()) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!text) continue;
    const cs = getComputedStyle(el); const fg = parse(cs.color);
    if (!fg || fg.a < 1) continue;
    const { c: bg, gradient, translucent } = bgOf(el);
    if (gradient || !bg) continue;
    const r = ratio(fg, bg); const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = (size >= 18.66 || (bold && size >= 14)) ? 3 : 4.5;
    if (r < need) low.push(`${r.toFixed(2)}${translucent ? '~' : ''} <${el.tagName.toLowerCase()}${el.id ? '#' + el.id : '.' + [...el.classList].slice(0, 2).join('.')}> "${text.slice(0, 28)}" needs ${need}`);
  }

  // --- overflow and clipping ---
  const wider = [];
  for (const el of card.querySelectorAll('*')) {
    const b = el.getBoundingClientRect();
    if (b.width === 0) continue;
    if (b.right > cardBox.right + 1 || b.left < cardBox.left - 1) wider.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : '.' + [...el.classList].slice(0, 2).join('.')} ${Math.round(b.width)}px`);
  }
  const clipped = [];
  for (const el of card.querySelectorAll('*')) {
    if (el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY === 'hidden') clipped.push(`${el.id || el.className} ${el.scrollHeight}>${el.clientHeight}`);
  }

  const log = card.querySelector('#help-chat-messages');
  const parts = {};
  for (const [name, sel] of Object.entries({
    head: '.sheet-head', starters: '.atlas-starters', log: '#help-chat-messages',
    composer: '.atlas-composer', empty: '#help-chat-empty', input: '#help-chat-input', group: '#help-chat-group',
  })) parts[name] = box(card.querySelector(sel));

  const cs = getComputedStyle(card);
  const chrome = (parts.head ? parts.head.h : 0) + (parts.starters ? parts.starters.h : 0) + (parts.composer ? parts.composer.h : 0);
  return {
    open: true,
    card: box(card), overlay: box(sheet),
    cardStyle: { pad: cs.padding, radius: cs.borderRadius, gap: cs.gap, bg: cs.backgroundColor, backdrop: cs.backdropFilter },
    parts,
    chromeHeight: chrome,
    chromeShare: parts.card === null ? null : Math.round((chrome / cardBox.height) * 100),
    logScrolls: log ? log.scrollHeight > log.clientHeight + 1 : null,
    logScroll: log ? { scrollHeight: log.scrollHeight, clientHeight: log.clientHeight, overflowY: getComputedStyle(log).overflowY } : null,
    cardScrolls: card.scrollHeight > card.clientHeight + 1,
    wider, clipped, lowContrast: low,
    glass: card.classList.contains('glass'),
    classes: card.className,
    focusOrder: [...card.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => el.checkVisibility && el.checkVisibility())
      .map((el) => el.id || el.getAttribute('aria-label') || el.className.toString().slice(0, 24)),
    activeId: document.activeElement ? (document.activeElement.id || document.activeElement.className.toString().slice(0, 28)) : null,
  };
};

(async () => {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { browser, page } = await boot({ viewport: { width: w, height: h } });
    await page.evaluate(() => openHelpChat());
    await page.waitForTimeout(600);
    const m = await page.evaluate(MEASURE);
    console.log(`\n===== ${w}x${h} =====`);
    if (!m.open) { console.log('  the guide sheet did not open'); await browser.close(); continue; }
    console.log('  card        ', JSON.stringify(m.card));
    console.log('  card style  ', JSON.stringify(m.cardStyle));
    console.log('  classes     ', m.classes, m.glass ? '(glass)' : '(no glass class)');
    for (const [k, v] of Object.entries(m.parts)) console.log(`  ${k.padEnd(12)}`, JSON.stringify(v));
    console.log('  chrome      ', m.chromeHeight + 'px of ' + m.card.h + 'px = ' + m.chromeShare + '% chrome, transcript ' + (m.parts.log ? m.parts.log.h : 0) + 'px');
    console.log('  log scrolls ', m.logScrolls, JSON.stringify(m.logScroll));
    console.log('  card scrolls', m.cardScrolls);
    console.log('  overflow    ', m.wider.length ? m.wider.join(', ') : 'none');
    console.log('  clipped     ', m.clipped.length ? m.clipped.join(', ') : 'none');
    console.log('  contrast    ', m.lowContrast.length ? m.lowContrast.join('\n                ') : 'all text at or above its threshold');
    console.log('  focus order ', m.focusOrder.join(' > '));
    console.log('  focus on open', m.activeId);

    // Does the head's own text fit, or is it quietly ellipsised?
    const headFit = await page.evaluate(() => {
      const out = {};
      for (const sel of ['.atlas-head-name', '.atlas-head-line', '.sheet-title']) {
        const el = document.querySelector('[data-sheet="guide"] ' + sel);
        if (el) out[sel] = { scrollW: el.scrollWidth, clientW: el.clientWidth, over: el.scrollWidth > el.clientWidth + 1 };
      }
      return out;
    });
    console.log('  head fit    ', JSON.stringify(headFit));

    // The '?' popover: opened, does it stay inside the card?
    const helpBox = await page.evaluate(() => {
      const card = document.querySelector('[data-sheet="guide"] .sheet-card');
      card.querySelector('[data-help-for="help-chat-help"]').click();
      const body = document.getElementById('help-chat-help');
      const b = body.getBoundingClientRect(); const c = card.getBoundingClientRect();
      return { hidden: body.classList.contains('hidden'), y: Math.round(b.y), h: Math.round(b.height),
        belowCard: Math.round(b.bottom - c.bottom), cardH: Math.round(c.height),
        order: [...card.querySelectorAll('.atlas-composer, #help-chat-help, #help-chat-messages')].map((e) => e.id || e.className.split(' ')[0]) };
    });
    console.log('  help popover', JSON.stringify(helpBox));
    await page.evaluate(() => document.querySelector('[data-sheet="guide"] [data-help-for="help-chat-help"]').click());

    // Is the composer usable with no model configured? (this sandbox has none)
    const composerState = await page.evaluate(() => {
      const i = document.getElementById('help-chat-input');
      const s = document.getElementById('help-chat-send');
      return { inputDisabled: i.disabled, sendDisabled: s.disabled, title: i.title || null };
    });
    console.log('  composer    ', JSON.stringify(composerState));

    // A long transcript, through the app's own append path (which is what
    // stands the starters down), not by pushing nodes into the log.
    await page.evaluate(() => {
      for (let i = 0; i < 8; i++) {
        renderHelpChatMessage(i % 2 ? 'assistant' : 'user',
          'Message ' + i + ': the quick brown fox jumps over the lazy dog and keeps going for a line or two.');
      }
    });
    await page.waitForTimeout(300);
    const full = await page.evaluate(MEASURE);
    console.log('  --- with eight messages ---');
    console.log('  card        ', JSON.stringify(full.card));
    console.log('  log scrolls ', full.logScrolls, JSON.stringify(full.logScroll));
    console.log('  composer    ', JSON.stringify(full.parts.composer));
    console.log('  overflow    ', full.wider.length ? full.wider.join(', ') : 'none');
    console.log('  chrome      ', full.chromeHeight + 'px of ' + full.card.h + 'px = ' + full.chromeShare + '%');

    // Escape, and a press on the scrim: both are the recipe's ways out.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const afterEsc = await page.evaluate(() => !document.querySelector('[data-sheet="guide"]'));
    await page.evaluate(() => openHelpChat());
    await page.waitForTimeout(400);
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);
    const afterBackdrop = await page.evaluate(() => !document.querySelector('[data-sheet="guide"]'));
    console.log('  escape closes', afterEsc, ' backdrop closes', afterBackdrop);
    await browser.close();
  }
})();
