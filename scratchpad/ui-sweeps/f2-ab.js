// A/B the cost of one style recalculation against groups of stylesheet
// rules, to name the rule behind a slow recalc (INBOX 400 (1)).
//
// In the page: toggle one class on one element, force the style, time it,
// twenty times; then delete every rule a predicate names from the live
// CSSOM and time it again. The difference is what those rules cost on
// every such change.
//
//   BASE=... TAB=notes PROBES=leaf-hidden,body-class GROUPS=has,root-has \
//     node scratchpad/ui-sweeps/f2-ab.js
const { boot } = require('./lib.js');
const TAB = process.env.TAB || 'notes';

(async () => {
  const { browser, page } = await boot({ viewport: { width: +(process.env.W || 1440), height: +(process.env.H || 900) } });
  await page.evaluate((t) => switchTab(t), TAB);
  await page.waitForTimeout(2500);
  if (process.env.SETTINGS) {
    await page.evaluate((s) => openSettingsModal(s), process.env.SETTINGS);
    await page.waitForTimeout(1200);
  }
  const res = await page.evaluate(({ chunk, probes, groups, custom }) => {
    const PROBES = {
      // A `.hidden` toggle on a childless element: the most frequent class
      // change in the app.
      'leaf-hidden': () => {
        let el = document.getElementById('f2-probe');
        if (!el) { el = document.createElement('span'); el.id = 'f2-probe'; document.querySelector('#status-bar, footer, body').appendChild(el); }
        el.classList.toggle('hidden');
      },
      'body-class': () => document.body.classList.toggle('f2-x'),
      'row-class': () => document.querySelector('#entry-list > li, #library-grid > *, .settings-section, main *')?.classList.toggle('f2-x'),
      'row-hover': () => document.querySelector('#entry-list > li, #library-grid > *')?.classList.toggle('is-hovered'),
      'tab-active': () => document.querySelector('#tab-bar [data-tab="graph"]')?.classList.toggle('active'),
      'root-var': () => document.documentElement.style.setProperty('--f2-probe', String(Math.random())),
      // Settings closed and opened again: every element in it restyled.
      'settings-reopen': () => {
        const m = document.getElementById('settings-modal');
        m.classList.add('hidden');
        getComputedStyle(document.body).color;
        m.classList.remove('hidden');
      },
      // A sidebar drag: what `applySidebarWidth` writes per pointer move.
      'sidebar-width': () => {
        const a = document.querySelector('.tab-page:not(.hidden) aside, #sidebar');
        a.style.setProperty('--saved-width', `${200 + Math.round(Math.random() * 100)}px`);
      },
      'settings-nav': () => document.querySelector('#settings-modal .settings-nav button, #settings-modal [data-section]')?.classList.toggle('active'),
    };
    const LAYOUT = false;
    const run = (fn) => {
      const out = [];
      for (let i = 0; i < 21; i++) {
        const t = performance.now();
        fn();
        getComputedStyle(document.body).color;
        if (LAYOUT) document.documentElement.getBoundingClientRect();
        out.push(performance.now() - t);
      }
      out.sort((a, b) => a - b);
      return +out[10].toFixed(2);
    };
    const GROUPS = {
      has: (s) => s.includes(':has('),
      'root-has': (s) => /(:root|html|body)[^ ,>+~]*:has\(/.test(s) || /(^|,\s*):root:not\(:has/.test(s),
      'tabpage-has': (s) => /\.tab-page:has/.test(s),
      universal: (s) => /\s\*(\s|$|::|,|:)/.test(s) || /\s>\s\*/.test(s),
      attr: (s) => /\[class/.test(s),
      notclass: (s) => /:not\(/.test(s),
      where: (s) => /:(is|where)\(/.test(s),
      all: () => true,
      // Rules the browser has to try on every element: the rightmost
      // compound names no id, class or tag (`:root[x] *`, `[data-y]`,
      // `:focus-visible`, `::selection`).
      keyuniv: (s) => s.split(',').some((one) => {
        const key = one.trim().split(/\s+|\s*[>+~]\s*/).pop();
        return !/[#.]/.test(key.replace(/\([^)]*\)/g, '')) && !/^[a-z]/i.test(key);
      }),
      rootattr: (s) => /^:root\[/.test(s.trim()),
      custom: () => false,
    };
    if (custom) GROUPS.custom = (s) => s.includes(custom);
    const rules = [];
    const walk = (list, sheet) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const r = list[i];
        if (r.selectorText !== undefined) rules.push({ list, r, sel: r.selectorText });
        else if (r.cssRules) walk(r.cssRules, sheet);
      }
    };
    for (const sh of document.styleSheets) { try { walk(sh.cssRules, sh); } catch (e) {} }
    const vis = [...document.querySelectorAll('*')].filter((e) => e.getClientRects().length).length;
    const out = { rules: rules.length, dom: document.querySelectorAll('*').length, rendered: vis, base: {}, after: {} };
    for (const p of probes) out.base[p] = run(PROBES[p]);
    // CHUNK=k with one RULES group: take that group's rules out k at a time,
    // time the first probe, and put them back, so each chunk's saving is
    // its own rather than cumulative. Prints the chunks that save most.
    if (chunk && groups.length === 1) {
      const pred = GROUPS[groups[0]];
      const hits = rules.filter((x) => pred(x.sel));
      const p0 = probes[0];
      const res = [];
      for (let i = 0; i < hits.length; i += chunk) {
        const part = hits.slice(i, i + chunk);
        const saved = [];
        for (const x of part) {
          const parent = x.r.parentRule || x.r.parentStyleSheet;
          const idx = [...parent.cssRules].indexOf(x.r);
          if (idx >= 0) { parent.deleteRule(idx); saved.push({ parent, idx, text: x.r.cssText }); }
        }
        const ms = run(PROBES[p0]);
        for (const s of saved.reverse()) {
          s.parent.insertRule(s.text, s.idx);
          const back = s.parent.cssRules[s.idx];
          const x = part.find((y) => y.r.cssText === s.text);
          if (x) x.r = back;
        }
        res.push({ ms, saving: +(out.base[p0] - ms).toFixed(1), sels: part.map((x) => x.sel.slice(0, 90)) });
      }
      res.sort((a, b) => b.saving - a.saving);
      out.chunks = res.slice(0, 6);
      return out;
    }
    for (const g of groups) {
      const pred = GROUPS[g];
      let n = 0;
      // Parents hold rules by index, so delete back to front, per parent.
      for (const x of rules) {
        if (x.gone || !pred(x.sel)) continue;
        const parent = x.r.parentRule || x.r.parentStyleSheet;
        const idx = [...parent.cssRules].indexOf(x.r);
        if (idx >= 0) { parent.deleteRule(idx); x.gone = true; n++; }
      }
      out.after[g] = { removed: n };
      for (const p of probes) out.after[g][p] = run(PROBES[p]);
    }
    return out;
  }, { chunk: +(process.env.CHUNK || 0), probes: (process.env.PROBES || 'leaf-hidden,body-class,row-class,root-var').split(','), groups: (process.env.RULES || '').split(',').filter(Boolean), custom: process.env.CUSTOM || '' });
  console.log(JSON.stringify(res, null, 0));
  await browser.close();
})();
