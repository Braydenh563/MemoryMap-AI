// INBOX 270 part 4, the owner: "also can you improve/redesign the ui and
// layout of the guide popup panel at all??"
//
// The guide popup is the Atlas help chat: `openHelpChat()` in settings.js puts
// the one `#help-chat-group` into a `sheet-corner` sheet. This sweep started as
// a probe that printed numbers (be58073); with the redesign it asserts them, so
// the next change that puts a box back inside the box, wraps the head onto two
// lines or strands the welcome in a corner fails here rather than in a
// screenshot the owner has to send.
//
// Measured before the redesign, at 1440x900 light:
//   head 63px tall, its subtitle wrapped onto a second line (at 1024 too);
//   head controls a 32px round bordered '?' beside a 28px filled kebab and X;
//   the whole chat inside a tinted `.settings-group` (398x349, 16px padding),
//     so text started 41px from the card edge and the composer ended 36px
//     above the foot against 20px of air over the head;
//   the empty state a 120px, five-line muted paragraph over three stacked grey
//     buttons, 16px type;
//   an answer's first line 25px below its bubble's top edge against 10px of
//     padding (a `<p>`'s own 1em margin).
// After: see the PASS lines; the numbers are in the commit message.
//
//   BASE=http://127.0.0.1:8797 node scratchpad/ui-sweeps/guidepanel.js
//   BASE=... THEME=dark node scratchpad/ui-sweeps/guidepanel.js
//
// Exit code 1 on any FAIL.
const { boot } = require('./lib.js');

let fails = 0;
const check = (label, ok, detail = '') => {
  if (!ok) fails++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ': ' + detail : ''}`);
};

// Contrast, the same maths as contrast.js, over the sheet only.
const CONTRAST = () => {
  const card = document.querySelector('[data-sheet="guide"] .sheet-card');
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
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a >= 0.9) return c;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  };
  const low = []; let checked = 0;
  for (const el of card.querySelectorAll('*')) {
    if (!el.checkVisibility || !el.checkVisibility()) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!text) continue;
    const cs = getComputedStyle(el); const fg = parse(cs.color);
    if (!fg || fg.a < 1) continue;
    const bg = bgOf(el); if (!bg) continue;
    checked++;
    const r = ratio(fg, bg); const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = (size >= 18.66 || (bold && size >= 14)) ? 3 : 4.5;
    if (r < need) low.push(`${r.toFixed(2)} "${text.slice(0, 24)}" needs ${need}`);
  }
  return { low, checked };
};

const GEOMETRY = () => {
  const q = (s) => document.querySelector('[data-sheet="guide"] ' + s);
  const card = q('.sheet-card');
  const box = (el) => { if (!el) return null; const b = el.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom, cx: b.x + b.width / 2, cy: b.y + b.height / 2 }; };
  const cs = (el) => (el ? getComputedStyle(el) : null);
  const c = box(card);
  const wider = [];
  for (const el of card.querySelectorAll('*')) {
    const b = el.getBoundingClientRect();
    if (!b.width || !el.checkVisibility()) continue;
    if (b.right > c.r + 1 || b.left < c.x - 1) wider.push(`${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join('.')} ${Math.round(b.width)}px`);
  }
  const headBtns = [q('.sheet-head > [data-help-for]'), q('.sheet-head .atlas-menu button'), q('.sheet-close')];
  const line = q('.atlas-head-line');
  return {
    vw: innerWidth, vh: innerHeight, wider,
    card: c, cardScrolls: card.scrollHeight > card.clientHeight + 1,
    head: box(q('.sheet-head')),
    line: line && line.checkVisibility() ? { h: line.getBoundingClientRect().height, over: line.scrollWidth > line.clientWidth + 1, text: line.textContent } : null,
    headBtns: headBtns.map((b) => (b ? { ...box(b), bg: cs(b).backgroundColor, border: cs(b).borderTopColor } : null)),
    group: { bg: cs(q('#help-chat-group')).backgroundColor, pad: cs(q('#help-chat-group')).paddingTop },
    log: { ...box(q('#help-chat-messages')), bg: cs(q('#help-chat-messages')).backgroundColor,
      scrolls: q('#help-chat-messages').scrollHeight > q('#help-chat-messages').clientHeight + 1 },
    welcome: q('#help-chat-empty') && q('#help-chat-empty').checkVisibility() ? { ...box(q('#help-chat-empty')), text: q('#help-chat-empty').textContent.replace(/\s+/g, ' ').trim() } : null,
    chips: [...card.querySelectorAll('#help-chat-starters > button')].filter((b) => b.checkVisibility()).map((b) => ({
      ...box(b), inWelcome: Boolean(b.closest('#help-chat-empty')), bg: cs(b).backgroundColor,
      border: cs(b).borderTopWidth, weight: cs(b).fontWeight })),
    composer: { ...box(q('.atlas-composer')), rule: cs(q('.atlas-composer')).borderTopWidth },
    input: box(q('#help-chat-input')), send: box(q('#help-chat-send')),
  };
};

(async () => {
  const theme = process.env.THEME || 'light';
  for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
    const phone = w < 601;
    const { browser, page } = await boot({ viewport: { width: w, height: h }, ...(phone ? { hasTouch: true, isMobile: true } : {}) });
    console.log(`\n===== ${w}x${h} ${theme} =====`);
    // Through the status bar's own button where it is on screen: a panel
    // measured only through `openHelpChat()` is a panel whose door was never
    // tried. On a phone the Guide is in the More sheet, so the function.
    if (!phone) await page.click('#status-guide');
    else await page.evaluate(() => openHelpChat());
    await page.waitForTimeout(600);
    const open = await page.evaluate(() => Boolean(document.querySelector('[data-sheet="guide"]')));
    check('the panel opens', open);
    if (!open) { await browser.close(); continue; }

    let g = await page.evaluate(GEOMETRY);
    // --- the card: a floating panel above the phone break, the window below
    if (!phone) {
      const right = g.vw - g.card.r, bottom = g.vh - g.card.b;
      check('the card floats with one inset on both edges', Math.abs(right - bottom) <= 1 && right > 0, `right ${right.toFixed(1)}, bottom ${bottom.toFixed(1)}`);
    } else {
      check('on a phone the card is the window\'s width', Math.abs(g.card.w - g.vw) <= 1, `${g.card.w}px of ${g.vw}`);
    }
    // --- the head: one row
    check('the head is one row', g.head.h <= (phone ? 48 : 40), `${g.head.h.toFixed(1)}px (was 63)`);
    if (g.line) check('the head\'s line fits on one line', !g.line.over && g.line.h <= 18, `"${g.line.text}" ${g.line.h.toFixed(1)}px`);
    else check('the head\'s line stands down on a phone', phone);
    const [help, kebab, close] = g.headBtns;
    check('the head carries the \'?\', the kebab and the X', Boolean(help && kebab && close));
    if (help && kebab && close) {
      const hs = [help.h, kebab.h, close.h], cys = [help.cy, kebab.cy, close.cy];
      check('the three head controls are one size', Math.max(...hs) - Math.min(...hs) < 0.5, hs.map((v) => v.toFixed(1)).join('/'));
      check('the three head controls share a centre line', Math.max(...cys) - Math.min(...cys) < 1, cys.map((v) => v.toFixed(1)).join('/'));
      const quiet = [help, kebab, close].every((b) => /rgba\(0, 0, 0, 0\)|transparent/.test(b.bg));
      check('the head controls are quiet at rest (the agent activity panel\'s rule)', quiet, [help, kebab, close].map((b) => b.bg).join(' | '));
    }
    // --- one surface, not a box in a box
    check('the chat is not a tinted box inside the card', /rgba\(0, 0, 0, 0\)|transparent/.test(g.group.bg) && g.group.pad === '0px', `${g.group.bg}, padding ${g.group.pad}`);
    check('the transcript has no ground of its own', /rgba\(0, 0, 0, 0\)|transparent/.test(g.log.bg), g.log.bg);
    // --- the welcome
    check('the welcome is showing', Boolean(g.welcome));
    if (g.welcome) {
      check('the welcome says it cannot read your notes', /cannot read your notes/.test(g.welcome.text));
      check('the welcome is centred in the transcript', Math.abs(g.welcome.cx - g.log.cx) <= 2, `${g.welcome.cx.toFixed(1)} vs ${g.log.cx.toFixed(1)}`);
    }
    check('three starters are offered', g.chips.length === 3, String(g.chips.length));
    check('the starters sit inside the welcome', g.chips.every((c) => c.inWelcome));
    check('the starters are the Chat tab\'s suggestion chip (hairline, no fill, regular weight)',
      g.chips.every((c) => c.border === '1px' && /rgba\(0, 0, 0, 0\)|transparent/.test(c.bg) && Number(c.weight) === 400),
      g.chips.map((c) => `${c.border} ${c.bg} ${c.weight}`).join(' | '));
    check('the starters are centred', g.chips.every((c) => Math.abs(c.cx - g.log.cx) <= 2));
    // --- the composer
    check('the field and send are one height', Math.abs(g.input.h - g.send.h) < 0.5, `${g.input.h}/${g.send.h}`);
    check('a hairline sits over the composer', g.composer.rule === '1px');
    check('nothing is wider than the card', g.wider.length === 0, g.wider.join(', '));
    let ct = await page.evaluate(CONTRAST);
    check('every text in the empty panel meets its contrast threshold', ct.low.length === 0 && ct.checked > 3, ct.low.join('; ') || `${ct.checked} measured`);

    // --- a conversation, through the app's own append path
    await page.evaluate(() => {
      renderHelpChatMessage('user', 'How do I add a reminder?');
      renderHelpChatMessage('assistant', 'Open the **Reminders** tab and press New reminder.\n\nYou can also type a date into a note.',
        [{ label: 'Open Reminders', tab: 'reminders' }], ['Reminders']);
      for (let i = 0; i < 6; i++) renderHelpChatMessage(i % 2 ? 'assistant' : 'user', 'Message ' + i + ': the quick brown fox jumps over the lazy dog and keeps going for a line or two.');
    });
    await page.waitForTimeout(300);
    g = await page.evaluate(GEOMETRY);
    check('the first answer retires the welcome and its starters', !g.welcome && g.chips.length === 0);
    check('the transcript scrolls and the card does not', g.log.scrolls && !g.cardScrolls);
    const inset = await page.evaluate(() => {
      const row = document.querySelector('[data-sheet="guide"] .help-chat-msg.is-assistant');
      const first = row.firstElementChild;
      return { top: first.getBoundingClientRect().top - row.getBoundingClientRect().top, pad: parseFloat(getComputedStyle(row).paddingTop) };
    });
    check('an answer\'s first line sits on the bubble\'s padding, not a paragraph margin', Math.abs(inset.top - inset.pad) <= 1.5, `${inset.top.toFixed(1)}px vs ${inset.pad}px (was 25)`);
    const wider = await page.evaluate(() => {
      const card = document.querySelector('[data-sheet="guide"] .sheet-card').getBoundingClientRect();
      return [...document.querySelectorAll('[data-sheet="guide"] .sheet-card *')].filter((el) => {
        const b = el.getBoundingClientRect(); return b.width && el.checkVisibility() && (b.right > card.right + 1 || b.left < card.left - 1);
      }).map((el) => el.className.toString().slice(0, 30));
    });
    check('nothing is wider than the card', wider.length === 0, wider.join(', '));
    ct = await page.evaluate(CONTRAST);
    check('every text in a conversation meets its contrast threshold', ct.low.length === 0, ct.low.join('; ') || `${ct.checked} measured`);

    // --- New chat brings the welcome back
    await page.evaluate(() => helpChatNewChat());
    await page.waitForTimeout(200);
    g = await page.evaluate(GEOMETRY);
    check('New chat brings the welcome and its starters back', Boolean(g.welcome) && g.chips.length === 3);

    // --- a starter sends its question (offline, the app's own help answers)
    await page.evaluate(() => document.querySelector('#help-chat-starters > button').click());
    await page.waitForTimeout(2500);
    const sent = await page.evaluate(() => ({
      user: document.querySelectorAll('[data-sheet="guide"] .help-chat-msg.is-user').length,
      answer: document.querySelectorAll('[data-sheet="guide"] .help-chat-msg.is-assistant').length,
    }));
    check('a starter sends its question and gets an answer', sent.user === 1 && sent.answer >= 1, JSON.stringify(sent));
    await page.evaluate(() => helpChatNewChat());

    // --- the '?' popover must not outlive the panel (`openSheet` takes Escape
    // in the capture phase, so the popover's own handler never sees it)
    await page.evaluate(() => document.querySelector('[data-sheet="guide"] [data-help-for="help-chat-help"]').click());
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const orphan = await page.evaluate(() => {
      const body = document.getElementById('help-chat-help');
      return { gone: !document.querySelector('[data-sheet="guide"]'), visible: body ? !body.classList.contains('hidden') : null };
    });
    check('Escape closes the panel and its \'?\' popover with it', orphan.gone && !orphan.visible, JSON.stringify(orphan));
    await page.evaluate(() => openHelpChat());
    await page.waitForTimeout(400);
    await page.mouse.click(10, phone ? 200 : 10);
    await page.waitForTimeout(300);
    check('a press on the scrim closes it', await page.evaluate(() => !document.querySelector('[data-sheet="guide"]')));
    // Home again: the Settings Help pane needs the group back in its host.
    check('the chat goes back to its hidden host on close', await page.evaluate(() => document.getElementById('help-chat-group').parentElement.id === 'atlas-host'));
    await browser.close();
  }
  console.log(fails ? `\nFAIL: ${fails} check${fails === 1 ? '' : 's'} failed` : '\nPASS: every check held');
  process.exitCode = fails ? 1 : 0;
})();
