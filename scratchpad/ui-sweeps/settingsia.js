// Settings information architecture, measured (INBOX 444).
//
//   BASE=http://127.0.0.1:8787 STAGE=before PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers \
//     node scratchpad/ui-sweeps/settingsia.js
//
// STAGE=before|after names the output files. SHOTS=0 skips the screenshots.
//
// For every Settings section, at 1440x900 and at 390x844:
//   - scrollHeight of the pane's scroller (how long the section is)
//   - groups (.settings-group and details.settings-fold), controls
//     (input, select, textarea, button inside the pane, nav and help
//     buttons left out), help popovers (data-help-for)
//   - the headings (h2 to h4) in the order they sit
//   - descriptions that wrap past one line at that width (a `.muted` p or
//     small, a `.status` line)
// and across sections:
//   - duplicated controls: the same label text, or the same preference key,
//     set from two sections
// Writes scratchpad/ui-sweeps/out/settingsia-<stage>.json and prints a table.
// Screenshots: settings-<stage>-<section>-<light|dark>.png for Models and two
// other sections.
const fs = require('fs');
const path = require('path');
const { boot } = require('./lib.js');

const STAGE = process.env.STAGE || 'before';
const OUTDIR = path.join(__dirname, 'out');
fs.mkdirSync(OUTDIR, { recursive: true });
const SHOT_SECTIONS = (process.env.SHOT_SECTIONS || 'models,appearance,general').split(',');

async function sectionNames(page) {
  return page.evaluate(() => [...document.querySelectorAll('#settings-nav button[data-section]')].map((b) => b.dataset.section));
}

// Everything is measured inside the page so the numbers are what the browser
// laid out, not what the markup suggests.
function measure() {
  const name = window.__section;
  const pane = document.getElementById('settings-' + name);
  const scroller = (() => {
    for (let el = pane && pane.parentElement; el; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if (o === 'auto' || o === 'scroll') return el;
    }
    return null;
  })();
  const visible = (el) => el.getClientRects().length > 0;
  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const labelOf = (el) => {
    if (el.getAttribute('aria-label')) return norm(el.getAttribute('aria-label'));
    const lab = el.id && pane.querySelector(`label[for="${el.id}"]`);
    if (lab) return norm(lab.textContent);
    const wrap = el.closest('label');
    if (wrap) return norm(wrap.textContent).slice(0, 80);
    return '';
  };
  const controls = [...pane.querySelectorAll('input, select, textarea, button')]
    .filter((el) => !el.closest('[data-help-for]') && !el.matches('[data-help-for]'));
  const controlRows = controls.map((el) => ({
    id: el.id || '',
    tag: el.tagName.toLowerCase(),
    type: el.type || '',
    label: labelOf(el) || norm(el.textContent).slice(0, 60),
    visible: visible(el),
  }));
  // A "preference key" is what the control is called in code: pref-*, or the
  // id minus its section prefix. Two controls sharing one are one setting
  // drawn twice.
  const prefKeys = controlRows.filter((c) => /^(pref|opt|set)-/.test(c.id)).map((c) => c.id);
  const lines = [];
  for (const el of pane.querySelectorAll('p.muted, p.status, small.muted, .muted.text-sm, p.settings-hint')) {
    if (!visible(el) || !el.textContent.trim()) continue;
    const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.4;
    const h = el.getBoundingClientRect().height;
    const n = Math.round(h / lh);
    if (n > 1) lines.push({ lines: n, chars: el.textContent.trim().length, text: el.textContent.trim().slice(0, 70) });
  }
  return {
    name,
    scrollHeight: scroller ? scroller.scrollHeight : null,
    clientHeight: scroller ? scroller.clientHeight : null,
    paneHeight: Math.round(pane.getBoundingClientRect().height),
    groups: pane.querySelectorAll('.settings-group, details.settings-fold').length,
    controls: controls.filter(visible).length,
    controlsAll: controls.length,
    helps: pane.querySelectorAll('[data-help-for]').length,
    headings: [...pane.querySelectorAll('h2, h3, h4')].filter(visible).map((h) => h.textContent.trim().replace(/\s+/g, ' ')),
    wrapped: lines,
    controlRows,
    prefKeys,
  };
}

async function sweep(width, height, theme, shots) {
  process.env.THEME = theme;
  const mobile = width < 600;
  const { browser, page } = await boot({
    viewport: { width, height },
    ...(mobile ? { hasTouch: true, isMobile: true } : {}),
  });
  await page.evaluate(() => openSettingsModal('models'));
  await page.waitForTimeout(1500);
  const names = await sectionNames(page);
  const out = [];
  let suggested = null;
  for (const name of names) {
    await page.evaluate((n) => { window.__section = n; return openSettingsModal(n); }, name);
    await page.waitForTimeout(900);
    const m = await page.evaluate(`(${measure.toString()})()`);
    out.push(m);
    if (name === 'models') {
      suggested = await page.evaluate(() => {
    const box = document.getElementById('suggested-box');
    if (!box || !box.getClientRects().length) return null;
    const rows = box.querySelectorAll('li:not(.suggested-group-label), .model-card');
    const filled = [...box.querySelectorAll('button')].filter((b) => !b.classList.contains('ghost') && !b.classList.contains('icon-only') && b.getClientRects().length);
    return {
      rows: rows.length,
      filledButtons: filled.length,
      boxHeight: Math.round(box.getBoundingClientRect().height),
      groups: box.querySelectorAll('.suggested-group-label, .model-group-head').length,
      mentionsRam: /\bram\b|memory/i.test(box.textContent),
      mentionsFit: /fits|tight|too big/i.test(box.textContent),
    };
  });
    }
    if (shots && SHOT_SECTIONS.includes(name)) {
      const file = path.join(OUTDIR, `settings-${STAGE}-${name}-${theme}${mobile ? '-phone' : ''}.png`);
      await page.locator('#settings-modal .modal-card').screenshot({ path: file });
    }
    // The suggested downloads, whole, scrolled into view: the card above is
    // clipped to the window and this box sits far below its top.
    if (shots && name === 'models' && await page.locator('#suggested-box').isVisible()) {
      await page.evaluate(() => document.getElementById('suggested-box').scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(250);
      await page.locator('#settings-modal .modal-card').screenshot({ path: path.join(OUTDIR, `settings-${STAGE}-models-suggested-${theme}${mobile ? '-phone' : ''}.png`) });
      await page.evaluate(() => { const m = document.querySelector('#settings-modal .modal-content'); if (m) m.scrollTop = 0; });
    }
  }
  // The nav itself: how many buttons, how many group labels, how tall it is.
  const nav = await page.evaluate(() => {
    const n = document.getElementById('settings-nav');
    return {
      buttons: n.querySelectorAll('button[data-section]').length,
      groups: [...n.querySelectorAll('.nav-group-label')].map((l) => l.textContent.trim()),
      scrollHeight: n.scrollHeight,
      clientHeight: n.clientHeight,
      hasSearch: !!document.getElementById('settings-search'),
      hasSectionIndex: !!document.querySelector('.settings-index'),
    };
  });
  // The suggested downloads, in numbers: rows, filled buttons (a surface
  // should have one filled button; 31 identical ones is a wall), the height of
  // the whole box and whether any row says how much memory it needs.
  nav.suggested = suggested;
  await browser.close();
  return { sections: out, nav };
}

(async () => {
  const result = { stage: STAGE, desktop: null, phone: null, duplicates: [] };
  const shots = process.env.SHOTS !== '0';
  result.desktop = await sweep(1440, 900, 'light', shots);
  result.phone = await sweep(390, 844, 'light', false);
  if (shots) {
    // The dark captures; the measurements are the light run's.
    await sweep(1440, 900, 'dark', true);
  }

  // Duplicates across sections, desktop run.
  const byLabel = new Map();
  const byKey = new Map();
  for (const s of result.desktop.sections) {
    for (const c of s.controlRows) {
      if (c.label && c.tag !== 'button' && c.label.length > 3) {
        if (!byLabel.has(c.label)) byLabel.set(c.label, new Set());
        byLabel.get(c.label).add(s.name);
      }
    }
    for (const k of s.prefKeys) {
      if (!byKey.has(k)) byKey.set(k, new Set());
      byKey.get(k).add(s.name);
    }
  }
  for (const [label, set] of byLabel) if (set.size > 1) result.duplicates.push({ kind: 'label', label, sections: [...set] });
  for (const [key, set] of byKey) if (set.size > 1) result.duplicates.push({ kind: 'id', label: key, sections: [...set] });

  // The same concern set from more than one section. A label match finds only
  // identical words, and the real overlaps are phrased differently ("Utility
  // model", "Model override", "smart model routing"), so each family is a
  // pattern over the controls' labels and ids; a family that touches two or
  // more sections is one thing the person has to look for in several places.
  const FAMILIES = {
    'which model runs a background job': /utility model|background jobs|model override|smart model routing|per feature|autonomous-model/,
    'web search': /web search|web-search|searxng|read url|search-provider/,
    'keeping data on this machine or network': /on this machine|other devices|local-only|allow-lan|egress/,
    'search relevance and the index': /similarity|above-average|search-min|search-z|search index|search engine|semantic|emb-backend/,
    'filing a note': /filing|file notes|where each note belongs|auto-tag|auto-link/,
    'duplicates': /duplicate|dedupe/,
    'clearing old data': /auto-clear|bin-days|retention|saved chats|keep this many/,
    'updates': /update|newer version/,
    'how Atlas answers': /how atlas writes|pref-style|small model mode|sampling-temperature/,
  };
  result.families = [];
  for (const [family, rx] of Object.entries(FAMILIES)) {
    const hit = new Map();
    for (const s of result.desktop.sections) {
      for (const c of s.controlRows) {
        if (c.tag === 'button') continue;
        if (rx.test(`${c.id} ${c.label}`.toLowerCase())) {
          if (!hit.has(s.name)) hit.set(s.name, []);
          hit.get(s.name).push(c.id || c.label.slice(0, 30));
        }
      }
    }
    if (hit.size > 1) result.families.push({ family, sections: Object.fromEntries(hit) });
  }
  for (const s of result.desktop.sections) delete s.controlRows;
  for (const s of result.phone.sections) delete s.controlRows;
  fs.writeFileSync(path.join(OUTDIR, `settingsia-${STAGE}.json`), JSON.stringify(result, null, 1));

  const phone = Object.fromEntries(result.phone.sections.map((s) => [s.name, s]));
  const pad = (v, n) => String(v).padEnd(n);
  console.log(pad('section', 13) + pad('h@1440', 8) + pad('h@390', 8) + pad('groups', 8) + pad('ctrls', 7) + pad('help', 6) + pad('wrap@1440', 10) + 'wrap@390');
  let tot = [0, 0, 0, 0, 0, 0, 0];
  for (const s of result.desktop.sections) {
    const p = phone[s.name];
    console.log(pad(s.name, 13) + pad(s.scrollHeight, 8) + pad(p.scrollHeight, 8) + pad(s.groups, 8) + pad(s.controls, 7) + pad(s.helps, 6) + pad(s.wrapped.length, 10) + p.wrapped.length);
    tot[0] += s.scrollHeight; tot[1] += p.scrollHeight; tot[2] += s.groups; tot[3] += s.controls; tot[4] += s.helps; tot[5] += s.wrapped.length; tot[6] += p.wrapped.length;
  }
  console.log(pad('TOTAL', 13) + pad(tot[0], 8) + pad(tot[1], 8) + pad(tot[2], 8) + pad(tot[3], 7) + pad(tot[4], 6) + pad(tot[5], 10) + tot[6]);
  console.log('nav:', JSON.stringify(result.desktop.nav));
  console.log('suggested:', JSON.stringify(result.desktop.nav.suggested), 'phone:', JSON.stringify(result.phone.nav.suggested));
  console.log('concerns set in more than one section:', result.families.length);
  for (const f of result.families) console.log('  ', f.family, '->', Object.keys(f.sections).join(' + '));
  console.log('exact duplicates (same label or id):', result.duplicates.length);
  for (const d of result.duplicates) console.log('  ', d.kind, JSON.stringify(d.label), d.sections.join(' + '));
})();
