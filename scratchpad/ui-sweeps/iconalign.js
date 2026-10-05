// Icon and label on one centre line, measured against the words' own metrics
// (INBOX 592, after INBOX 494 and 503 measured these by box and by x-height).
//
// For every visible Phosphor icon (`i.ph`) with words beside it on the same
// line, three numbers, in CSS px, positive meaning the icon sits low:
//
//   cap   icon ink centre minus the words' cap-height centre (the target:
//         baseline minus half of `1cap`, read from the words' own font)
//   x     the same against the x-height centre (baseline minus half `1ex`)
//   box   icon box centre minus the words' Range box centre (the old metric:
//         it reads zero wherever two boxes are centred, which is exactly the
//         case a font with a tall ascent, Segoe UI, draws wrong)
//
// The baseline is the Range's top plus the font's ascent, the ascent, cap and
// x-height read once per font from a probe line (a zero-size inline-block on
// the baseline and boxes `1cap` and `1ex` tall). The icon's ink centre is its
// box centre plus `--ph-ink-dy` (the per-glyph offset 08-consistency.css
// lists: Phosphor's glyphs are centred in their em boxes to 0.01em, those
// few excepted).
//
// Also, per note meta row (`.entry-meta`): the spread of the cap centres of
// every fact on it (the date beside the chips), and the "+N more links"
// button's height and radius against the link chips beside it.
//
// FONT=segoe draws the app in DejaVu Sans with Segoe UI's vertical metrics
// (ascent 1.079, descent 0.251, no line gap: `ascent-override` on a local
// face), because the sandbox has no Segoe UI and the owner's Windows window
// does: every earlier round of this was calibrated against DejaVu, whose
// box centre happens to sit on its cap centre, and passed here while it
// failed there.
//
//   BASE=http://127.0.0.1:8792 W=1440 THEME=dark FONT=segoe node iconalign.js
//   TOL=1 (px, on |cap|), VERBOSE=1 lists every offender rather than the worst.
const { boot } = require('./lib.js');
const W = parseInt(process.env.W || '1440', 10);
const TOL = parseFloat(process.env.TOL || '1');
const VERBOSE = !!process.env.VERBOSE;

const SIM = {
  segoe: { ascent: '107.9%', descent: '25.1%' },
  arial: { ascent: '90.5%', descent: '21.2%' },
};

async function simulateFont(page, which) {
  const m = SIM[which];
  if (!m) return;
  await page.evaluate(async (m) => {
    const faces = [
      new FontFace('SweepSim', 'local("DejaVu Sans")', { ascentOverride: m.ascent, descentOverride: m.descent, lineGapOverride: '0%', weight: '400' }),
      new FontFace('SweepSim', 'local("DejaVu Sans Bold")', { ascentOverride: m.ascent, descentOverride: m.descent, lineGapOverride: '0%', weight: '700' }),
    ];
    for (const f of faces) { await f.load(); document.fonts.add(f); }
    document.documentElement.style.setProperty('--ui-font', 'SweepSim', 'important');
    document.body.style.setProperty('font-family', 'SweepSim', 'important');
    window.dispatchEvent(new Event('resize'));
    // The app reads its icon offset from the font it boots in; the sweep
    // swapped the font after boot, so it asks again, as a font change in
    // Settings does.
    if (typeof measureLabelOptics === 'function') measureLabelOptics();
  }, m);
  await page.waitForTimeout(600);
}

const PROBE = (tol) => {
  const metrics = new Map();
  const fontOf = (cs) => `${cs.fontStyle}|${cs.fontWeight}|${cs.fontSize}|${cs.fontFamily}`;
  // One probe line per font: the ascent (baseline minus the Range's top), and
  // `1cap` and `1ex` as boxes, all in px at that size.
  const metricFor = (cs) => {
    const key = fontOf(cs);
    if (metrics.has(key)) return metrics.get(key);
    const host = document.createElement('div');
    for (const p of ['fontStyle', 'fontWeight', 'fontSize', 'fontFamily', 'fontStretch']) host.style[p] = cs[p];
    host.style.position = 'fixed'; host.style.left = '0'; host.style.top = '0';
    host.style.lineHeight = 'normal'; host.style.whiteSpace = 'nowrap'; host.style.visibility = 'hidden';
    const t = document.createTextNode('Hxg');
    const mk = (h) => { const s = document.createElement('span'); s.style.display = 'inline-block'; s.style.width = '0'; s.style.height = h; s.style.verticalAlign = 'baseline'; return s; };
    const base = mk('0'), cap = mk('1cap'), ex = mk('1ex');
    host.append(t, base, cap, ex);
    document.body.append(host);
    const r = document.createRange(); r.selectNodeContents(t);
    const tr = r.getBoundingClientRect();
    const m = { asc: base.getBoundingClientRect().bottom - tr.top, cap: cap.getBoundingClientRect().height, ex: ex.getBoundingClientRect().height };
    host.remove();
    metrics.set(key, m);
    return m;
  };
  const visible = (el) => {
    if (!el.checkVisibility || !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 1 && r.height >= 1 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  };
  // The words' cap and x centres for one text node, from its Range.
  const textCentres = (node) => {
    const range = document.createRange(); range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((q) => q.width > 1);
    if (!rects.length) return null;
    const q = rects[0];
    const cs = getComputedStyle(node.parentElement);
    const m = metricFor(cs);
    const baseline = q.top + m.asc;
    return { rect: q, baseline, cap: baseline - m.cap / 2, x: baseline - m.ex / 2, box: q.top + q.height / 2 };
  };
  const label = (el) => ((el.id ? '#' + el.id : '') + '.' + String(el.className || el.tagName).trim().replace(/\s+/g, '.')).slice(0, 48);
  const out = [];
  let seen = 0;
  for (const icon of document.querySelectorAll('i.ph, i[class*="ph-"]')) {
    if (!visible(icon)) continue;
    const ir = icon.getBoundingClientRect();
    if (ir.height < 4) continue;
    const ics = getComputedStyle(icon);
    // The words this icon sits beside: the nearest text node on its line,
    // looking in its parent, then its grandparent (an icon wrapped in a span).
    let best = null;
    for (let host = icon.parentElement, depth = 0; host && depth < 2 && !best; host = host.parentElement, depth++) {
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (!n.textContent.trim() || icon.contains(n)) continue;
        const pe = n.parentElement;
        if (!pe || !visible(pe) || pe.closest('kbd, .sr-only, .visually-hidden')) continue;
        // Words hidden at this width (a dock's word on a phone, clipped to
        // nothing) leave the icon alone in its control.
        if (getComputedStyle(pe).clipPath !== 'none' || pe.getBoundingClientRect().width <= 1) continue;
        const c = textCentres(n);
        if (!c) continue;
        const q = c.rect;
        // Same line: the words' box overlaps the icon's vertically by half.
        const overlap = Math.min(q.bottom, ir.bottom) - Math.max(q.top, ir.top);
        if (overlap < Math.min(q.height, ir.height) / 2) continue;
        const dist = q.left >= ir.right ? q.left - ir.right : ir.left >= q.right ? ir.left - q.right : 0;
        if (dist > 24) continue;
        if (!best || dist < best.dist) best = { c, dist, host, node: n.textContent.trim().slice(0, 16) };
      }
    }
    if (!best) continue;
    // Only what is on top: a tab behind an open dialog is not on screen.
    const hit = document.elementFromPoint(ir.left + ir.width / 2, ir.top + ir.height / 2);
    if (!hit || !(hit === icon || icon.contains(hit) || hit.contains(icon))) continue;
    // Only a row. An icon beside a block of two lines (a title over a hint,
    // a timeline row's mark) is centred on the block, which is the design.
    {
      const w = document.createTreeWalker(best.host, NodeFilter.SHOW_TEXT);
      let top = Infinity, bottom = -Infinity;
      while (w.nextNode()) {
        const n = w.currentNode;
        if (!n.textContent.trim() || icon.contains(n) || !visible(n.parentElement)) continue;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const q of r.getClientRects()) if (q.width > 1) { top = Math.min(top, q.top); bottom = Math.max(bottom, q.bottom); }
      }
      if (bottom - top > best.c.rect.height * 1.6) continue;
    }
    const inkDy = parseFloat(ics.getPropertyValue('--ph-ink-dy')) || 0;
    const iconC = ir.top + ir.height / 2 + inkDy * parseFloat(ics.fontSize);
    const d = { cap: iconC - best.c.cap, x: iconC - best.c.x, box: (ir.top + ir.height / 2) - best.c.box };
    seen++;
    const host = icon.closest('button, a, summary, label, li, .chip, .menu-item, [role="menuitem"], .status-item') || best.host;
    out.push({
      cap: Math.round(d.cap * 100) / 100, x: Math.round(d.x * 100) / 100, box: Math.round(d.box * 100) / 100,
      who: label(host), icon: [...icon.classList].find((k) => k.startsWith('ph-') && !['ph-lead', 'ph-trail'].includes(k)) || String(icon.className),
      txt: (best.c.rect && host.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26),
      disp: getComputedStyle(icon.parentElement).display, idisp: ics.display,
      dbg: `icon ${ir.top.toFixed(2)}+${ir.height.toFixed(2)} words ${best.c.rect.top.toFixed(2)}+${best.c.rect.height.toFixed(2)} "${best.node}"`,
    });
  }
  // Meta rows: every fact's words on one centre line.
  const rows = [];
  for (const row of document.querySelectorAll('.entry-meta.note-meta')) {
    if (!visible(row)) continue;
    { const q = row.getBoundingClientRect(); const hit = document.elementFromPoint(q.left + 4, q.top + q.height / 2); if (!hit || !(row.contains(hit) || hit.contains(row))) continue; }
    const caps = [];
    for (const kid of row.children) {
      if (!visible(kid)) continue;
      const walker = document.createTreeWalker(kid, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (!n.textContent.trim() || !visible(n.parentElement)) continue;
        const c = textCentres(n);
        if (c) { caps.push({ y: c.cap, who: label(kid), t: n.textContent.trim().slice(0, 14) }); break; }
      }
    }
    if (caps.length < 2) continue;
    const ys = caps.map((c) => c.y);
    const lo = caps[ys.indexOf(Math.min(...ys))], hi = caps[ys.indexOf(Math.max(...ys))];
    rows.push({ spread: Math.round((hi.y - lo.y) * 100) / 100, hi: `${hi.who} "${hi.t}"`, lo: `${lo.who} "${lo.t}"`, n: caps.length });
  }
  // "+N more links" against its sibling link chips.
  const more = [];
  for (const btn of document.querySelectorAll('.entry-links-more')) {
    if (!visible(btn)) continue;
    const row = btn.parentElement;
    const chip = [...row.querySelectorAll('.link-connection, .chip')].find((c) => c !== btn && visible(c));
    if (!chip) continue;
    const b = btn.getBoundingClientRect(), c = chip.getBoundingClientRect();
    const bs = getComputedStyle(btn), cs = getComputedStyle(chip);
    more.push({ sameLine: Math.abs((b.top + b.height / 2) - (c.top + c.height / 2)) < 2, dh: Math.round((b.height - c.height) * 100) / 100, bh: b.height, ch: c.height, br: bs.borderRadius, cr: cs.borderRadius, bb: bs.borderTopWidth + ' ' + bs.borderTopColor, cb: cs.borderTopWidth + ' ' + cs.borderTopColor, bw: bs.fontWeight, cw: cs.fontWeight, chip: label(chip) });
  }
  return { out, seen, rows, more };
};

(async () => {
  const { browser, page } = await boot({ viewport: { width: W, height: 900 } });
  await simulateFont(page, process.env.FONT);
  const views = [
    ['dashboard', [`switchTab('dashboard')`]],
    ['dashboard/more-menu', [`switchTab('dashboard')`, `document.querySelector('#dash-more button')?.click()`]],
    ['notes', [`switchTab('notes')`]],
    ['notes/card-menu', [`switchTab('notes')`, `document.querySelector('#entry-list .kebab, #entry-list [aria-haspopup="menu"]')?.click()`]],
    ['notes/ask', [`switchTab('notes')`, `document.querySelector('[data-section="ask"]')?.click()`, `(()=>{const i=document.getElementById('question'); i.value='sketch bean bell'; i.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('ask-btn').click();})()`, `void 0`]],
    ['timeline', [`switchTab('timeline')`]],
    ['settings/models', [`openSettingsModal('models')`]],
    ['settings/extras', [`openSettingsModal('extras')`]],
    ['settings/appearance', [`openSettingsModal('appearance')`]],
  ];
  const only = process.env.VIEWS ? process.env.VIEWS.split(',') : null;
  let worst = { cap: 0 }, total = 0, bad = 0, worstRow = { spread: 0 };
  for (const [name, steps] of views) {
    if (only && !only.includes(name)) continue;
    await page.evaluate(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); try { closeSettingsModal(); } catch (e) {} });
    await page.waitForTimeout(300);
    for (const s of steps) { await page.evaluate(s).catch((e) => console.log(`  (${name}: ${String(e).slice(0, 80)})`)); await page.waitForTimeout(name.includes('ask') ? 2500 : 900); }
    const { out, seen, rows, more } = await page.evaluate(PROBE, TOL);
    const off = out.filter((o) => Math.abs(o.cap) > TOL);
    total += seen; bad += off.length;
    const w = out.reduce((a, o) => (Math.abs(o.cap) > Math.abs(a.cap) ? o : a), { cap: 0 });
    if (Math.abs(w.cap) > Math.abs(worst.cap)) worst = { ...w, view: name };
    const wb = out.reduce((a, o) => Math.max(a, Math.abs(o.box)), 0);
    console.log(`[${name}] ${off.length} of ${seen} icon+label pairs off the cap centre by more than ${TOL}px; worst cap ${w.cap}px, worst box ${Math.round(wb * 100) / 100}px`);
    for (const o of (VERBOSE ? off : off.sort((a, b) => Math.abs(b.cap) - Math.abs(a.cap)).slice(0, 8)))
      console.log(`    cap ${String(o.cap).padStart(6)}  x ${String(o.x).padStart(6)}  box ${String(o.box).padStart(6)}  ${o.who} ${o.icon} [${o.disp}/${o.idisp}] :: ${o.txt}${process.env.DEBUG ? '  ' + o.dbg : ''}`);
    const badRows = rows.filter((r) => r.spread > TOL);
    const wr = rows.reduce((a, r) => (r.spread > a.spread ? r : a), { spread: 0 });
    if (wr.spread > worstRow.spread) worstRow = { ...wr, view: name };
    if (rows.length) console.log(`    meta rows: ${badRows.length} of ${rows.length} with facts more than ${TOL}px apart; worst ${wr.spread}px (high ${wr.hi}, low ${wr.lo})`);
    for (const m of more) console.log(`    +N more links (${m.sameLine ? 'same line' : 'wrapped'}): height ${m.bh} vs chip ${m.ch} (${m.chip}), radius ${m.br} vs ${m.cr}, border ${m.bb} vs ${m.cb}, weight ${m.bw} vs ${m.cw}`);
  }
  console.log(`TOTAL: ${bad} of ${total} pairs off by more than ${TOL}px at ${W}px, theme ${process.env.THEME || 'light'}, font ${process.env.FONT || 'default'}; worst ${worst.cap}px (${worst.view} ${worst.who} ${worst.icon} :: ${worst.txt}); worst meta row ${worstRow.spread}px (${worstRow.view || '-'})`);
  await browser.close();
})();
