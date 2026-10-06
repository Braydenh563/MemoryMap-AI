// INBOX 682 + 683: a control inside a rounded container sits inside its corner.
//
// 682: the Documents sidebar's "Documents | Outline" tabs take the button
//      corner (`--radius-md`) on their hover fill and focus ring, and the
//      chosen tab is drawn as the Notes strip draws it (the 2px line, no box).
// 683: every control inside a rounded container (a pill, a round well, a
//      padded strip) has a corner that sits inside the container's: fully
//      round, or at least the container's corner minus its padding. Measured
//      at rest, on hover and on keyboard focus, for the table bar's
//      "Copy | ... | X" and every other surface the sweep for this found.
//
//   BASE=http://127.0.0.1:8824 PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/radius682.js
//
// Light and dark, 1440 and 390, Classic (the 14px corner, where the numbers
// are largest) and Quiet utilitarian (8px, where a concentric token falls to
// zero), no console errors. Phone width measures what is on screen there: a
// surface that is collapsed away at 390 is reported as "not on screen" and
// not counted.
const { boot } = require('./lib.js');

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok });
  console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail ? '  ' + detail : ''));
}

// Browser side: one element's measured corner (px), size, padding and border.
const MEASURE = `(el) => {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const v = cs.borderTopLeftRadius;
  const radius = v.endsWith('%') ? Math.min(r.width, r.height) * parseFloat(v) / 100 : parseFloat(v) || 0;
  return { radius, w: r.width, h: r.height,
    pad: Math.max(parseFloat(cs.paddingTop) || 0, parseFloat(cs.paddingLeft) || 0),
    border: parseFloat(cs.borderTopWidth) || 0,
    bg: cs.backgroundColor, ring: cs.outlineStyle !== 'none' ? cs.outlineWidth : '' };
}`;

// A child sits inside its container when it is fully round (its corner covers
// half its short side) or concentric (>= container corner - padding - border).
function inside(child, container) {
  const round = child.radius >= Math.min(child.w, child.h) / 2 - 0.75;
  const outer = Math.min(container.radius, Math.min(container.w, container.h) / 2);
  return round || child.radius >= outer - container.pad - container.border - 0.75;
}

const measure = (page, sel) => page.evaluate(`(${MEASURE})(document.querySelector(${JSON.stringify(sel)}))`);
const onScreen = (page, sel) => page.evaluate((s) => {
  const e = document.querySelector(s);
  if (!e) return false;
  const r = e.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
}, sel);

// One surface: the container and each of its controls, at rest, hovered and
// keyboard-focused. `children` is a selector list, matched inside the container.
async function surface(page, tag, name, containerSel, childSel) {
  if (!(await onScreen(page, containerSel))) { console.log(`skip ${tag} ${name}: not on screen`); return; }
  const container = await measure(page, containerSel);
  const count = await page.evaluate(({ c, k }) => {
    const list = [...document.querySelector(c).querySelectorAll(k)].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    list.forEach((b, i) => { b.dataset.r682 = String(i); });
    return list.length;
  }, { c: containerSel, k: childSel });
  check(`${tag} ${name} has controls`, count > 0, `n=${count}`);
  for (let i = 0; i < count; i++) {
    const sel = `${containerSel} [data-r682="${i}"]`;
    const rest = await measure(page, sel);
    check(`${tag} ${name} #${i} rest`, inside(rest, container), `r=${rest.radius.toFixed(1)} container=${container.radius.toFixed(1)} pad=${container.pad}`);
    await page.hover(sel);
    await page.waitForTimeout(120);
    const hov = await measure(page, sel);
    check(`${tag} ${name} #${i} hover`, inside(hov, container), `r=${hov.radius.toFixed(1)}`);
    await page.mouse.move(2, 2);
    // Keyboard focus: a key press first, so :focus-visible matches.
    await page.keyboard.press('Shift');
    await page.evaluate((s) => document.querySelector(s).focus({ preventScroll: true }), sel);
    await page.waitForTimeout(100);
    const f = await page.evaluate(`(() => { const a = document.activeElement; return a ? { fv: a.matches(':focus-visible'), m: (${MEASURE})(a) } : null; })()`);
    check(`${tag} ${name} #${i} focus`, !!f && f.fv && inside(f.m, container) && f.m.ring !== '', `r=${f && f.m.radius.toFixed(1)} ring=${f && f.m.ring}`);
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
  }
}

async function newBoard(page, name, type) {
  await page.click('[data-tab="library"]');
  await page.waitForTimeout(500);
  await page.click('[data-target="library-view-whiteboard"]');
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('wb-boards-new').click());
  await page.waitForTimeout(700);
  await page.fill('#wb-template-name', name);
  if (type === 'map') await page.click('#wb-template-kind button[data-value="map"]');
  await page.click('#wb-template-create');
  await page.waitForTimeout(2500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

async function run(theme, look, vp, errors) {
  process.env.THEME = theme;
  const { browser, page } = await boot({ viewport: vp });
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  const tag = `${theme} ${look} ${vp.width}`;
  // The new account's recovery-key offer sits over the page; skip it.
  await page.evaluate(() => { const d = document.getElementById('recovery-key-dialog'); if (d && d.open) d.close(); });
  await page.evaluate((l) => applyThemePreset(l), look);
  await page.waitForTimeout(500);

  // 683: the table bar, Copy | ... | X (a markdown table's `.code-actions`).
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.id = 'probe-682';
    //: Placed through the CSSOM (`el.style.x =`), which the CSP allows.
    Object.assign(host.style, { position: 'fixed', left: '16px', top: '120px', zIndex: '9999', width: '340px', background: 'var(--card)' });
    document.body.appendChild(host);
    renderMarkdown(host, '| a | b |\n| --- | --- |\n| 1 | 2 |\n');
    const close = host.querySelector('.md-table-close');
    if (close) close.hidden = false;
  });
  await page.waitForTimeout(400);
  await surface(page, tag, 'table bar (Copy, ..., X)', '#probe-682 .code-actions', 'button');
  await page.evaluate(() => document.getElementById('probe-682').remove());

  // 683: the editor's selection bar (a pill of round buttons: the baseline).
  await page.evaluate(() => {
    const b = selectionBarElement();
    b.classList.remove('hidden');
    Object.assign(b.style, { left: '16px', top: '200px' });
  });
  await surface(page, tag, 'selection bar', '#selection-bar', 'button:not([hidden])');
  await page.evaluate(() => selectionBarHide());

  // 683: the timeline's week well (a choice track, one --space-1 of padding).
  await page.evaluate(() => switchTab('timeline'));
  await page.waitForTimeout(1500);
  await surface(page, tag, 'timeline week well', '#timeline-daystrip-days', '.timeline-day');

  // 683: the graph's zoom strip.
  await page.evaluate(() => switchTab('graph'));
  await page.waitForTimeout(2000);
  await surface(page, tag, 'graph zoom strip', '#graph-zoom', 'button');

  // 683: the board's zoom pill.
  try {
    await newBoard(page, 'Radius board', 'board');
    await surface(page, tag, 'board zoom pill', '.whiteboard-floating-panel.bottom-right', 'button');
  } catch (e) {
    check(`${tag} board zoom pill reachable`, false, e.message.slice(0, 80));
  }

  // 682: the Documents sidebar tabs.
  await page.evaluate(() => switchTab('documents'));
  await page.waitForTimeout(1500);
  if (!(await onScreen(page, '#doc-sidebar-tabs'))) {
    console.log(`skip ${tag} doc tabs: not on screen`);
  } else {
    const token = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.style.borderRadius = 'var(--radius-md)';
      document.body.appendChild(probe);
      const v = parseFloat(getComputedStyle(probe).borderTopLeftRadius);
      probe.remove();
      return v;
    });
    check(`${tag} doc tabs are not a .seg`, await page.evaluate(() => !document.getElementById('doc-sidebar-tabs').classList.contains('seg')));
    for (const s of ['list', 'outline']) {
      const sel = `#doc-sidebar-tabs [data-section="${s}"]`;
      const rest = await measure(page, sel);
      check(`${tag} doc tab ${s} rest corner is --radius-md`, Math.abs(rest.radius - token) < 0.5, `r=${rest.radius.toFixed(1)} token=${token.toFixed(1)}`);
      await page.hover(sel);
      await page.waitForTimeout(150);
      const hov = await measure(page, sel);
      check(`${tag} doc tab ${s} hover corner is --radius-md`, Math.abs(hov.radius - token) < 0.5, `r=${hov.radius.toFixed(1)}`);
      await page.mouse.move(2, 2);
      await page.keyboard.press('Shift');
      await page.evaluate((q) => document.querySelector(q).focus({ preventScroll: true }), sel);
      await page.waitForTimeout(100);
      const f = await page.evaluate(`(() => { const a = document.activeElement; return { fv: a.matches(':focus-visible'), m: (${MEASURE})(a) }; })()`);
      check(`${tag} doc tab ${s} focus ring follows --radius-md`, f.fv && Math.abs(f.m.radius - token) < 0.5 && f.m.ring !== '', `r=${f.m.radius.toFixed(1)} ring=${f.m.ring}`);
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
    }
    // The chosen tab: no fill, no edge, no ring box of its own: the Notes
    // strip's own draw (a 2px line from the strip's indicator).
    const chosen = await page.evaluate(`(() => {
      const b = document.querySelector('#doc-sidebar-tabs [aria-selected="true"]');
      const cs = getComputedStyle(b);
      const strip = document.getElementById('doc-sidebar-tabs');
      const glide = getComputedStyle(strip, '::before');
      return { border: cs.borderTopWidth + ' ' + cs.borderTopStyle, shadow: cs.boxShadow, bg: cs.backgroundColor,
        glideFill: glide.backgroundSize, glideRadius: glide.borderTopLeftRadius };
    })()`);
    await page.evaluate(() => switchTab('notes'));
    await page.waitForTimeout(900);
    const notes = await page.evaluate(`(() => {
      const b = document.querySelector('#notes-subtabs [aria-selected="true"], #notes-subtabs .active');
      const cs = getComputedStyle(b);
      const glide = getComputedStyle(document.getElementById('notes-subtabs'), '::before');
      return { border: cs.borderTopWidth + ' ' + cs.borderTopStyle, shadow: cs.boxShadow, bg: cs.backgroundColor,
        glideFill: glide.backgroundSize, glideRadius: glide.borderTopLeftRadius };
    })()`);
    //: A strip is wired for its sliding line the first time the pointer or the
    //: focus reaches it, so the Notes strip (never touched here) has none yet:
    //: the fill, edge and shadow are compared, and the line when there is one.
    const same = chosen.border === notes.border && chosen.shadow === notes.shadow && chosen.bg === notes.bg;
    const line = chosen.glideFill === '100% 2px' && chosen.glideRadius === '0px';
    check(`${tag} doc chosen tab is drawn as the Notes strip draws it (no box, the 2px line)`, same && line, JSON.stringify(chosen));
  }
  await browser.close();
}

(async () => {
  const errors = [];
  const looks = (process.env.LOOKS || 'default,utilitarian').split(',');
  for (const theme of ['light', 'dark']) {
    for (const look of looks) {
      for (const w of [1440, 390]) await run(theme, look, { width: w, height: w === 390 ? 844 : 900 }, errors);
    }
  }
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  const bad = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - bad.length}/${checks.length} ok`);
  process.exit(bad.length ? 1 : 0);
})();
