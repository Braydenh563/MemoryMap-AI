// INBOX 685: "a lot of borders get cut off on an edge" (the owner, with a
// screenshot of the Dashboard constellation's Regenerate button whose focus
// ring is cut along its left edge). A focus ring is an outline outside the
// control's box; an ancestor with `overflow` other than visible (or
// `contain: paint`, or a `clip-path`) paints nothing outside its padding box,
// so a control flush against that edge loses the side of its ring.
//
// For every visible focusable control on every surface this focuses it the way
// a Tab would, reads the ring's outer box (an outline inflated by width plus
// offset, a non-blurred ring shadow by its spread, or the wrapper that takes
// the ring on :focus-within), finds every clipping ancestor on the way to the
// root (honouring position: absolute/fixed, which escape clippers between them
// and their containing block), and reports each ring that reaches past that
// clipper's padding box, grouped by clipper. It also reads plain borders: a
// bordered control whose own border box leaves the clipper's padding box.
//
//   BASE=http://127.0.0.1:8826 node scratchpad/ui-sweeps/clip685.js
//   WIDTH=390 THEME=dark ...   the phone, the dark theme
//   VERBOSE=1                  every finding, not only the groups
//
// Exit 1 when any ring or border is clipped. Surfaces: every tab, the Notes,
// Library and Documents sub-tabs, the dashboard (rest, edit mode, widgets
// sheet), every Settings section, the palette, the guide, a kebab menu and a
// few common dialogs.
const { boot } = require('./lib.js');
const TABS = process.env.TABS ? process.env.TABS.split(',') : ['dashboard', 'notes', 'chat', 'graph', 'library', 'timeline', 'reminders', 'documents'];
const WIDTH = Number(process.env.WIDTH || 1440);
const HEIGHT = Number(process.env.HEIGHT || (WIDTH < 600 ? 844 : 900));
const PHONE = WIDTH < 600;
const VERBOSE = !!process.env.VERBOSE;

const MEASURE = () => {
  if (!window.__noTransition) {
    const ss = new CSSStyleSheet();
    ss.replaceSync('*,*::before,*::after{transition:none!important;animation:none!important}');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, ss];
    window.__noTransition = true;
  }
  const sig = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + [...el.classList].slice(0, 6).join('.');
  const num = (v) => parseFloat(v) || 0;
  const unoccluded = (el, r) => {
    const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
    const y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
    const h = document.elementFromPoint(x, y);
    return !!h && (el.contains(h) || h.contains(el));
  };
  const vis = (el) => {
    if (!el.checkVisibility || !el.checkVisibility({ checkOpacity: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth && unoccluded(el, r);
  };
  const isClip = (cs) => {
    const ox = cs.overflowX, oy = cs.overflowY;
    const x = ox !== 'visible', y = oy !== 'visible';
    const contain = /paint|content|strict/.test(cs.contain) || cs.contentVisibility === 'auto';
    const cp = cs.clipPath && cs.clipPath !== 'none';
    return { x: x || contain, y: y || contain, contain, cp, scrollX: /auto|scroll/.test(ox), scrollY: /auto|scroll/.test(oy), any: x || y || contain || cp };
  };
  // The clippers an element's paint passes through, nearest first. An
  // absolutely positioned box is clipped only from its containing block up; a
  // fixed one escapes every overflow (a transform on an ancestor excepted).
  const clippersOf = (start) => {
    const out = [];
    let pos = getComputedStyle(start).position;
    let e = start.parentElement;
    let skipping = pos === 'absolute' || pos === 'fixed';
    while (e) {
      const cs = getComputedStyle(e);
      const establishes = (p) => p !== 'static' || (cs.transform && cs.transform !== 'none') || (cs.filter && cs.filter !== 'none') || cs.willChange.includes('transform') || /paint|layout|strict|content/.test(cs.contain);
      if (skipping) {
        const cbForFixed = (cs.transform && cs.transform !== 'none') || (cs.filter && cs.filter !== 'none') || /paint|layout|strict|content/.test(cs.contain);
        const hit = pos === 'fixed' ? cbForFixed : establishes(cs.position);
        if (hit) skipping = false; else { e = e.parentElement; continue; }
      }
      const c = isClip(cs);
      if (c.any) out.push({ el: e, cs, c });
      const p = cs.position;
      if (p === 'absolute' || p === 'fixed') { pos = p; skipping = true; /* this box itself is positioned: climb to its own containing block */ }
      e = e.parentElement;
    }
    return out;
  };
  const padBox = (e, cs) => {
    const r = e.getBoundingClientRect();
    let L = r.left + num(cs.borderLeftWidth), T = r.top + num(cs.borderTopWidth);
    let R = r.right - num(cs.borderRightWidth), B = r.bottom - num(cs.borderBottomWidth);
    if (e === document.documentElement || e === document.body) { L = 0; T = 0; R = innerWidth; B = innerHeight; }
    const m = num(cs.overflowClipMargin);
    if (m && /clip/.test(cs.overflowX + cs.overflowY)) { L -= m; T -= m; R += m; B += m; }
    return { L, T, R, B };
  };
  // The outer box of the ring a focus draws: outline, or ring shadows.
  const ringBox = (el, before) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    let best = null;
    const grow = (g, dx, dy, how) => {
      const b = { L: r.left - g + dx, T: r.top - g + dy, R: r.right + g + dx, B: r.bottom + g + dy, how };
      if (!best || (b.R - b.L) * (b.B - b.T) > (best.R - best.L) * (best.B - best.T)) best = b;
    };
    if (cs.outlineStyle !== 'none' && num(cs.outlineWidth) > 0) {
      const had = before && before.outlineStyle !== 'none' && before.outlineWidth === cs.outlineWidth && before.outlineColor === cs.outlineColor;
      if (!had) grow(num(cs.outlineWidth) + num(cs.outlineOffset), 0, 0, 'outline');
    }
    if (cs.boxShadow && cs.boxShadow !== 'none' && cs.boxShadow !== (before && before.boxShadow)) {
      for (const m of cs.boxShadow.matchAll(/((?:rgba?|color|oklch|oklab|lab|lch|hsla?)\([^)]+\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px(?:\s+(-?[\d.]+)px)?(\s+inset)?/g)) {
        if (m[6]) continue;
        if (num(m[4]) !== 0 || num(m[5]) <= 0) continue;
        grow(num(m[5]), num(m[2]), num(m[3]), 'ring shadow');
      }
    }
    return best;
  };
  // Which stylesheet rule makes `el` a clipper: the selectors that declare an
  // overflow, contain or clip-path on it, so a fix goes where the cause is.
  const declaredBy = (el) => {
    const out = [];
    const walk = (rules, file) => {
      for (const r of rules) {
        if (r.cssRules && !r.selectorText) { if (!r.media || matchMedia(r.media.mediaText).matches) walk(r.cssRules, file); continue; }
        if (!r.selectorText || !r.style) continue;
        const st = r.style;
        const props = ['overflow', 'overflow-x', 'overflow-y', 'contain', 'clip-path'].filter((k) => st.getPropertyValue(k) && !/^visible$/.test(st.getPropertyValue(k)));
        if (!props.length) continue;
        let hit = false;
        try { hit = el.matches(r.selectorText); } catch (e) { hit = false; }
        if (hit) out.push(`${file} ${r.selectorText.slice(0, 80)} {${props.map((k) => k + ':' + st.getPropertyValue(k)).join(';')}}`);
      }
    };
    for (const ss of document.styleSheets) {
      let rules; try { rules = ss.cssRules; } catch (e) { continue; }
      walk(rules, (ss.href || 'inline').split('/').pop().split('?')[0]);
    }
    return out.slice(-3).join(' | ');
  };
  const findings = [];
  const seen = new Set();
  const whereCache = new Map();
  const push = (f) => {
    const k = f.kind + '|' + f.sig + '|' + f.clipper + '|' + f.sides.join(',');
    if (seen.has(k)) return; seen.add(k);
    f.where = whereCache.get(f.clipperEl) || (whereCache.set(f.clipperEl, declaredBy(f.clipperEl)), whereCache.get(f.clipperEl));
    delete f.clipperEl; findings.push(f);
  };
  // How far a box leaves a clipper's padding box, per side (positive = cut).
  const over = (b, p) => ({ left: p.L - b.L, top: p.T - b.T, right: b.R - p.R, bottom: b.B - p.B });
  const TOL = 0.4;
  let measured = 0;
  const sel = 'a[href],button,input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"]),[role=tab],[role=button],[role=menuitem],[role=switch],summary';
  const nodes = [...document.querySelectorAll(sel)].filter((el) => !el.disabled && !el.closest('.sr-only,.skip-link,[inert]') && vis(el)).slice(0, 700);
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    const cs0 = getComputedStyle(el);
    const before = { outlineStyle: cs0.outlineStyle, outlineWidth: cs0.outlineWidth, outlineColor: cs0.outlineColor, boxShadow: cs0.boxShadow };
    const anc = [];
    for (let p = el.parentElement, i = 0; p && p !== document.body && i < 3; p = p.parentElement, i++) {
      const c = getComputedStyle(p); anc.push([p, { outlineStyle: c.outlineStyle, outlineWidth: c.outlineWidth, outlineColor: c.outlineColor, boxShadow: c.boxShadow, borderColor: c.borderTopColor }]);
    }
    try { el.focus({ focusVisible: true, preventScroll: true }); } catch (e) { continue; }
    if (document.activeElement !== el || !el.matches(':focus-visible')) { if (document.activeElement === el) el.blur(); continue; }
    measured++;
    let owner = el, ring = ringBox(el, before);
    if (!ring) {
      for (const [p, b] of anc) {
        const rb = ringBox(p, b);
        if (rb) { owner = p; ring = rb; break; }
      }
    }
    if (ring) {
      const exempt = {};
      for (const k of clippersOf(owner)) {
        const pb = padBox(k.el, k.cs);
        const o = over(ring, pb);
        const ctrl = over({ L: owner.getBoundingClientRect().left, T: owner.getBoundingClientRect().top, R: owner.getBoundingClientRect().right, B: owner.getBoundingClientRect().bottom }, pb);
        const sides = [];
        for (const s of ['left', 'top', 'right', 'bottom']) {
          const horiz = s === 'left' || s === 'right';
          const axisClips = horiz ? k.c.x : k.c.y;
          if (!axisClips) continue;
          if (o[s] <= TOL) continue;
          // A scroller with more content past this edge: the control sits at
          // the scrollport's edge by scroll position, not by its container's
          // geometry (a focus scrolls it in, and that is scroll-padding's job).
          const kel = k.el;
          const edge = { left: pb.L, top: pb.T, right: pb.R, bottom: pb.B }[s];
          // An outer clipper whose edge is the same line as an inner scroller's
          // is the same scrollport (a pane in a body that hides): exempt too.
          if (exempt[s] !== undefined && Math.abs(edge - exempt[s]) <= 1) continue;
          if (kel !== document.documentElement && kel !== document.body) {
            const moving = (s === 'top' && k.c.scrollY && kel.scrollTop > 1)
              || (s === 'bottom' && k.c.scrollY && kel.scrollTop + kel.clientHeight < kel.scrollHeight - 1)
              || (s === 'left' && k.c.scrollX && kel.scrollLeft > 1)
              || (s === 'right' && k.c.scrollX && kel.scrollLeft + kel.clientWidth < kel.scrollWidth - 1);
            if (moving) { exempt[s] = edge; continue; }
          }
          // The control itself past the edge on a scrolling axis is scroll,
          // not a ring problem; on the start side at rest it is a cut.
          if (ctrl[s] > TOL) continue;
          sides.push(`${s} ${o[s].toFixed(1)}`);
        }
        if (sides.length) {
          push({ clipperEl: k.el, kind: 'ring', how: ring.how, sig: sig(el), owner: sig(owner), clipper: sig(k.el), ov: `${k.cs.overflowX}/${k.cs.overflowY}${k.c.contain ? ' contain' : ''}${k.c.cp ? ' clip-path' : ''}`, sides, rect: [r.left, r.top, r.width, r.height].map(Math.round).join(',') });
        }
      }
    }
    el.blur();
  }
  // Plain borders: a bordered box that leaves a clipper's padding box.
  // An edge a box draws itself: a border, an inset ring shadow (a chosen
  // segment), or a fill that differs from clear. Each is a boundary that a
  // clipper can cut off.
  const edgeDrawn = (c) => ['Top', 'Right', 'Bottom', 'Left'].some((s) => c['border' + s + 'Style'] !== 'none' && num(c['border' + s + 'Width']) >= 1 && !/rgba?\([^)]*,\s*0\)$/.test(c['border' + s + 'Color']))
    || /inset/.test(c.boxShadow) || (c.backgroundColor && !/rgba?\([^)]*,\s*0\)$/.test(c.backgroundColor) && c.backgroundColor !== 'transparent');
  // The chosen option of a strip with a sliding indicator draws nothing itself:
  // the strip's ::before paints its fill in the option's box, so the option's
  // box is the edge (a chosen pill segment, INBOX 694).
  const glideChosen = (el) => !!el.parentElement && el.parentElement.matches('.has-glide, .seg') && el.matches('.active,[aria-selected="true"],[aria-current],[aria-pressed="true"],[aria-checked="true"]');
  const bordered = [...document.querySelectorAll('button,input,select,textarea,a,[role=tab],[role=button],.card,.chip,.badge,.pill,.note-card,.entry-item,.library-card,.dash-widget,[class*="widget"],[class*="card"]')]
    .filter((el) => edgeDrawn(getComputedStyle(el)) || glideChosen(el))
    .filter((el) => !el.closest('.sr-only') && vis(el)).slice(0, 900);
  let borderMeasured = 0;
  for (const el of bordered) {
    borderMeasured++;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    for (const k of clippersOf(el)) {
      const pb = padBox(k.el, k.cs);
      const o = over({ L: r.left, T: r.top, R: r.right, B: r.bottom }, pb);
      const sides = [];
      for (const s of ['left', 'top', 'right', 'bottom']) {
        const horiz = s === 'left' || s === 'right';
        if (!(horiz ? k.c.x : k.c.y)) continue;
        const scrolls = horiz ? k.c.scrollX : k.c.scrollY;
        const start = s === 'left' || s === 'top';
        if (scrolls && !start) continue;   // beyond the end of a scroller is just more content
        const bw = num(cs['border' + s[0].toUpperCase() + s.slice(1) + 'Width']);
        if ((bw < 1 || cs['border' + s[0].toUpperCase() + s.slice(1) + 'Style'] === 'none') && !edgeDrawn(cs) && !glideChosen(el)) continue;
        if (o[s] <= TOL) continue;
        // A box wholly outside is hidden content (a carousel), not a cut border.
        const inside = horiz ? (r.right > pb.L && r.left < pb.R) : (r.bottom > pb.T && r.top < pb.B);
        if (!inside) continue;
        // Mostly hidden boxes are scrolled content; a cut border is a hairline off the edge.
        if (o[s] > Math.max(bw, 1) + 3) continue;
        sides.push(`${s} ${o[s].toFixed(1)}`);
      }
      if (sides.length) push({ clipperEl: k.el, kind: 'border', how: 'border', sig: sig(el), owner: sig(el), clipper: sig(k.el), ov: `${k.cs.overflowX}/${k.cs.overflowY}${k.c.contain ? ' contain' : ''}${k.c.cp ? ' clip-path' : ''}`, sides, rect: [r.left, r.top, r.width, r.height].map(Math.round).join(',') });
    }
  }
  const dbg = [];
  if (window.__dbgSel) for (const el of document.querySelectorAll(window.__dbgSel)) {
    const r = el.getBoundingClientRect();
    dbg.push({ el: sig(el), sh: getComputedStyle(el).boxShadow, bg: getComputedStyle(el).backgroundColor, vis: vis(el), inBordered: bordered.includes(el), clippers: clippersOf(el).map((k) => ({ s: sig(k.el), pb: padBox(k.el, k.cs), x: k.c.x, y: k.c.y })), r: [r.left, r.top, r.right, r.bottom] });
  }
  return { findings, measured, borderMeasured, dbg };
};

const all = [];
let surfaces = 0;
const empty = [];
(async () => {
  const { browser, page } = await boot({ viewport: { width: WIDTH, height: HEIGHT }, hasTouch: PHONE, isMobile: PHONE });
  const run = async (label) => {
    await page.mouse.move(2, 2);
    await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
    if (process.env.DBGSEL) await page.evaluate((x) => { window.__dbgSel = x; }, process.env.DBGSEL);
    const r = await page.evaluate(MEASURE);
    surfaces++;
    if (r.dbg && r.dbg.length) console.log(JSON.stringify(r.dbg));
    if (!r.measured) empty.push(label);
    const rings = r.findings.filter((f) => f.kind === 'ring').length;
    const borders = r.findings.filter((f) => f.kind === 'border').length;
    console.log(`== ${label}: ${rings} rings, ${borders} borders clipped (${r.measured} focusables, ${r.borderMeasured} bordered)`);
    for (const f of r.findings) { f.surface = label; all.push(f); if (VERBOSE) console.log(`   [${f.kind}] ${f.sig} in ${f.clipper} (${f.ov}) ${f.sides.join(', ')} @${f.rect}${f.where ? '\n        via ' + f.where : ''}`); }
    await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
  };
  const go = async (t) => { await page.evaluate((n) => { try { switchTab(n); } catch (e) {} }, t); await page.waitForTimeout(900); };
  const press = (sel) => page.evaluate((s) => { const b = document.querySelector(s); if (b && b.offsetParent) { b.click(); return true; } return false; }, sel);
  const esc = async () => { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(350); };

  // Every widget on, so the constellation's Regenerate (off by default) and
  // the rest are drawn: the dashboard's "all views".
  await page.evaluate(async () => {
    const order = Object.keys(DASH_WIDGETS);
    await saveDashLayout({ order, hidden: [], wide: [], narrow: [] });
  });
  for (const t of TABS) {
    await go(t);
    if (t === 'dashboard') { await page.evaluate(() => renderDashboard({ refresh: true })); await page.waitForTimeout(2500); }
    await run(t);
    if (t === 'dashboard') {
      const edit = await page.evaluate(() => { const b = document.querySelector('#dash-customise button'); if (b && b.offsetParent) { b.click(); return true; } return false; });
      if (edit) {
        await page.waitForTimeout(700); await run('dashboard (edit mode)');
        if (await press('#dash-widgets-open')) { await page.waitForTimeout(700); await run('dashboard (widgets sheet)'); await esc(); }
        await press('#dash-edit'); await page.waitForTimeout(500);
      }
      if (await press('#dash-help-toggle')) { await page.waitForTimeout(400); await run('dashboard (help)'); await press('#dash-help-toggle'); }
      if (await press('#dash-more button, #dash-more')) { await page.waitForTimeout(400); await run('dashboard (more menu)'); await esc(); }
    }
    const subs = await page.evaluate((tab) => {
      const strip = document.getElementById(tab + '-subtabs') || (tab === 'documents' ? document.getElementById('doc-sidebar-tabs') : null);
      return strip ? [...strip.querySelectorAll('button')].map((b, i) => ({ i, id: strip.id, label: b.textContent.trim().slice(0, 20) })) : [];
    }, t);
    for (const s of subs) {
      const ok = await page.evaluate(({ id, i }) => { const b = document.getElementById(id).querySelectorAll('button')[i]; if (b && b.offsetParent) { b.click(); return true; } return false; }, s);
      if (!ok) continue;
      await page.waitForTimeout(800); await run(`${t}/${s.label}`);
    }
  }
  // Common overlays.
  await go('notes'); await page.waitForTimeout(400);
  const kebab = await page.evaluate(() => { const b = [...document.querySelectorAll('#tab-notes button[aria-haspopup="menu"], #tab-notes .kebab')].find((x) => x.offsetParent); if (b) { b.click(); return true; } return false; });
  if (kebab) { await page.waitForTimeout(400); await run('a kebab menu (notes)'); await esc(); }
  const over = [
    ['command palette', () => openPalette()],
    ['guide', () => openHelpChat()],
    ['document templates', () => openDocTemplateDialog()],
    ['note templates', () => openNoteTemplateDialog()],
    ['graph controls sheet', () => { switchTab('graph'); openGraphControlsSheet(); }],
    ['feature model sheet', () => openFeatureModelSheet('chat')],
  ];
  for (const [label, fn] of over) {
    const ok = await page.evaluate(`(async()=>{try{await (${fn.toString()})();return true;}catch(e){return false;}})()`);
    if (!ok) { console.log(`== ${label}: SKIPPED`); continue; }
    await page.waitForTimeout(700); await run(label); await esc(); await esc();
  }
  // Settings: every section.
  await page.evaluate(() => { try { openSettingsModal('models'); } catch (e) { document.getElementById('settings-btn')?.click(); } });
  await page.waitForTimeout(700);
  const sections = await page.evaluate(() => [...document.querySelectorAll('#settings-modal [data-section]')].map((b) => b.dataset.section));
  for (const s of [...new Set(sections)]) {
    const ok = PHONE
      ? await page.evaluate((n) => { try { openSettingsModal(n); return true; } catch (e) { return false; } }, s)
      : await page.evaluate((n) => { const b = document.querySelector(`#settings-modal [data-section="${n}"]`); if (b && b.offsetParent) { b.click(); return true; } return false; }, s);
    if (!ok) continue;
    await page.waitForTimeout(600); await run('settings/' + s);
  }

  // Grouped report.
  const groups = new Map();
  for (const f of all) {
    const k = `${f.kind} | ${f.clipper} (${f.ov})`;
    const g = groups.get(k) || { raw: 0, ctrls: new Set(), sides: new Set(), surfaces: new Set(), where: f.where };
    g.raw++; g.ctrls.add(f.sig); f.sides.forEach((s) => g.sides.add(s.split(' ')[0])); g.surfaces.add(f.surface.split('/')[0]); groups.set(k, g);
  }
  console.log(`\n== done ${WIDTH}x${HEIGHT} ${process.env.THEME || 'light'}: ${surfaces} surfaces`);
  for (const [k, g] of [...groups].sort((a, b) => b[1].ctrls.size - a[1].ctrls.size)) {
    console.log(`GROUP ${k}: ${g.ctrls.size} controls (${g.raw} raw) sides ${[...g.sides].join('/')} on ${[...g.surfaces].join(', ')}`);
    console.log(`      e.g. ${[...g.ctrls].slice(0, 4).join('; ')}`);
    if (g.where) console.log(`      via ${g.where}`);
  }
  const rings = new Set(all.filter((f) => f.kind === 'ring').map((f) => f.sig + '|' + f.clipper));
  const borders = new Set(all.filter((f) => f.kind === 'border').map((f) => f.sig + '|' + f.clipper));
  console.log(`TOTAL ring ${rings.size} unique (control, clipper), border ${borders.size}`);
  if (empty.length) console.log(`measured nothing: ${empty.join(', ')}`);
  await browser.close();
  process.exitCode = all.length ? 1 : 0;
})();
