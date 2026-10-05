// INBOX 621: the dock grammar, measured on every dock in the app.
//
// For each dock (dockstops621.js): does a divider box the title off, is the
// count a pill (an edge or a fill), is the search field a heavy bordered box
// and does it carry a leading icon, how many hairlines the bar draws, how big
// the icon buttons are and whether they are one trailing group, and whether
// the one filled action is the last control. Across docks: how many distinct
// segmented-control styles there are (well fill, selected fill, selected ink,
// radius).
//
//   BASE=… SCRATCH=… W=1440 THEME=dark PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node dockgrammar621.js
//
// Prints one line per dock and a FAIL list against the grammar; exit 1 on a fail.
const { boot } = require('./lib.js');
const STOPS = require('./dockstops621.js');
const W = +(process.env.W || 1440);
(async () => {
  const opts = { viewport: { width: W, height: W < 600 ? 844 : 900 } };
  if (W < 600) Object.assign(opts, { hasTouch: true, isMobile: true });
  const { browser, page } = await boot(opts);
  const fails = [];
  const segStyles = new Map();
  for (const [name, go, sel] of STOPS) {
    await go(page);
    const r = await page.evaluate(({ sel, W }) => {
      const dock = document.querySelector(sel);
      if (!dock) return null;
      const vis = (e) => { const b = e.getBoundingClientRect(); const s = getComputedStyle(e); return b.width > 0 && b.height > 0 && s.visibility !== 'hidden'; };
      if (!vis(dock)) return { hidden: true };
      const cs = (e) => getComputedStyle(e);
      const clear = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
      const edge = (e, side) => { const s = cs(e); return parseFloat(s[`border${side}Width`]) > 0 && s[`border${side}Style`] !== 'none' && !clear(s[`border${side}Color`]); };
      // Hairlines: a zone's own leading or trailing edge, or a separator element.
      const zones = [...dock.children].filter(vis);
      let dividers = 0;
      for (const z of zones) { if (edge(z, 'Left')) dividers++; if (edge(z, 'Right')) dividers++; }
      dividers += [...dock.querySelectorAll('.dock-sep, [role="separator"]')].filter((e) => vis(e) && !e.closest('.dock-menu-list, .doc-dock-menu-list')).length;
      const ident = dock.querySelector('.dock-identity');
      const titleDivider = !!ident && (edge(ident, 'Right') || (ident.nextElementSibling && vis(ident.nextElementSibling) && edge(ident.nextElementSibling, 'Left')));
      // The count: anything in the identity that is not the heading and not a control.
      const counts = ident ? [...ident.querySelectorAll('.dock-chip, [role="status"], .dock-count')].filter(vis) : [];
      const pills = counts.filter((c) => { const s = cs(c); return edge(c, 'Top') || !clear(s.backgroundColor); }).map((c) => c.id || c.className);
      // Search: the well that draws the box (the wrapper when there is one).
      const input = [...dock.querySelectorAll('input[type="search"]')].find(vis);
      let search = null;
      if (input) {
        const well = input.closest('.search-field') || input;
        const s = cs(well);
        search = {
          border: s.borderTopWidth + ' ' + (clear(s.borderTopColor) ? 'clear' : 'edge'),
          heavy: edge(well, 'Top') && parseFloat(s.borderTopWidth) >= 1,
          icon: !!well.querySelector?.('.search-field-icon, .ph-magnifying-glass'),
          fill: s.backgroundColor,
          h: Math.round(well.getBoundingClientRect().height),
        };
      }
      // Controls in reading order (one per seg / select shell / menu).
      const WRAP = '.seg, .segmented-control, .select-shell';
      const ctrls = [...dock.querySelectorAll('button, summary, select, input:not([type=hidden]), .seg, .segmented-control, .select-shell, a.dock-link')].filter((c) => {
        if (!vis(c)) return false;
        if (c.closest('.dock-menu-list, .doc-dock-menu-list, .help-body')) return false;
        if (c.matches('.dock-native-hidden, .select-native-hidden, .visually-hidden')) return false;
        if (c.closest('.search-field') && c.tagName === 'INPUT') return true;
        const w = c.closest(WRAP); if (w && w !== c) return false;
        if (c.tagName === 'SELECT' && c.closest('.select-shell')) return false;
        return true;
      });
      const filledOf = (c) => {
        if (c.tagName !== 'BUTTON' && c.tagName !== 'SUMMARY') return false;
        if (c.matches('.ghost, .icon-only, .linklike, .library-chip, .select-opener')) return c.matches('.dock-menu-primary');
        return c.tagName === 'BUTTON' || c.matches('.dock-menu-primary');
      };
      const filled = ctrls.filter(filledOf);
      const lastCtrl = ctrls[ctrls.length - 1];
      // On a phone the filled action floats out as the FAB (FAB_IDS); then the
      // rule is simply that none is left mid-row.
      const filledLast = filled.length === 0 || filled[filled.length - 1] === lastCtrl;
      const icons = ctrls.filter((c) => c.matches('.icon-only, .icon-button') && !c.closest(WRAP) && !c.closest('.dock-nav'));
      const iconSizes = [...new Set(icons.map((c) => `${Math.round(c.getBoundingClientRect().width)}x${Math.round(c.getBoundingClientRect().height)}`))];
      const iconsGhost = icons.every((c) => clear(cs(c).backgroundColor) && !edge(c, 'Top'));
      // One trailing group: every icon button sits in the actions zone, and
      // no worded or other control comes between the first icon there and the end,
      // except the one filled action that closes the row.
      const actions = dock.querySelector('.dock-actions');
      const iconsOutside = icons.filter((c) => !actions || !actions.contains(c)).map((c) => c.id || c.getAttribute('aria-label'));
      const segs = [...dock.querySelectorAll('.seg, .segmented-control')].filter((s) => vis(s) && !s.closest('.dock-menu-list, .doc-dock-menu-list')).map((s) => {
        const on = s.querySelector('[aria-pressed="true"], [aria-checked="true"], .active, input:checked + *, label:has(input:checked)') || s.querySelector('button');
        const off = [...s.querySelectorAll('button, label')].find((b) => b !== on);
        const a = cs(s); const o = on ? cs(on) : {}; const f = off ? cs(off) : {};
        // The chosen fill is the well's gliding `::before` where anchor
        // positioning runs (08-consistency.css), else the option's own.
        const g = getComputedStyle(s, '::before');
        const fill = g.content !== 'none' && !clear(g.backgroundColor) ? g.backgroundColor : o.backgroundColor;
        // Quantised, so a label still easing between two inks (the glide
        // fades the chosen label's colour in) is not a second style.
        const q = (c) => String(c).replace(/\d+(\.\d+)?/g, (n) => (+n > 1 ? Math.round(+n / 8) * 8 : Math.round(+n * 20) / 20));
        return { id: s.id || s.className.split(' ').slice(0, 2).join('.'), sig: [a.backgroundColor, a.borderTopWidth, fill, o.color, f.color].map(q).join(' | ') };
      });
      const db = dock.getBoundingClientRect();
      return {
        h: Math.round(db.height), w: Math.round(db.width), dividers, titleDivider, pills, search,
        controls: ctrls.length, filled: filled.map((c) => c.id || c.textContent.trim().slice(0, 12)), filledLast,
        iconSizes, iconsGhost, iconsOutside, segs,
        hscroll: dock.scrollWidth > dock.clientWidth + 1,
      };
    }, { sel, W });
    if (!r || r.hidden) { console.log(name.padEnd(17), r ? 'hidden' : 'absent'); continue; }
    for (const s of r.segs) { if (!segStyles.has(s.sig)) segStyles.set(s.sig, []); segStyles.get(s.sig).push(`${name}:${s.id}`); }
    const segIds = r.segs.map((s) => s.id).join(',');
    delete r.segs;
    console.log(name.padEnd(17), JSON.stringify(r), segIds ? `segs=${segIds}` : '');
    const f = (m) => fails.push(`${name}: ${m}`);
    if (r.titleDivider) f('a divider boxes the title off');
    if (r.dividers > 1) f(`${r.dividers} hairlines (at most one)`);
    if (r.pills.length) f(`the count is a pill: ${r.pills}`);
    if (r.search && r.search.heavy) f(`the search field draws an edge at rest (${r.search.border})`);
    if (r.search && !r.search.icon) f('the search field has no leading icon');
    if (!r.filledLast) f(`the filled action is not last: ${r.filled}`);
    if (r.filled.length > 1) f(`${r.filled.length} filled actions`);
    if (W >= 820 && r.iconSizes.some((s) => s !== '32x32')) f(`icon buttons ${r.iconSizes} (32x32 wanted)`);
    if (!r.iconsGhost) f('an icon button has a fill or an edge at rest');
    if (r.iconsOutside.length) f(`icon buttons outside the trailing group: ${r.iconsOutside}`);
    if (r.hscroll) f('the dock scrolls sideways');
  }
  console.log(`segment styles: ${segStyles.size}`);
  for (const [sig, who] of segStyles) console.log('  ', sig, '<-', who.join(' '));
  if (segStyles.size > 1) fails.push(`${segStyles.size} segmented-control styles (one wanted)`);
  console.log(fails.length ? `FAIL ${fails.length}\n  ` + fails.join('\n  ') : 'PASS');
  await browser.close();
  process.exitCode = fails.length ? 1 : 0;
})();
